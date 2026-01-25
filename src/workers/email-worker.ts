import { PrismaClient } from '@prisma/client'
import {
  createImapClient,
  connectAndReady,
  openMailbox,
  searchUnseen,
  fetchMessage,
  disconnectImap,
  type ImapConfig,
} from '../lib/email/imap-client'
import {
  extractReplyAddress,
  cleanReplyContent,
  getSenderEmail,
  getSenderName,
} from '../lib/email/extract-reply-address'
import {
  parseReplyToAddress,
  verifyReplyToken,
  extractTicketFromSubject,
} from '../lib/email/reply-token'

const prisma = new PrismaClient()

const POLL_INTERVAL = parseInt(process.env.EMAIL_POLL_INTERVAL || '60000', 10)

const imapConfig: ImapConfig = {
  host: process.env.IMAP_HOST || 'imap.hostinger.com',
  port: parseInt(process.env.IMAP_PORT || '993', 10),
  user: process.env.IMAP_USER || '',
  password: process.env.IMAP_PASS || '',
  tls: process.env.IMAP_TLS !== 'false',
  mailbox: process.env.IMAP_MAILBOX || 'INBOX',
}

async function processEmail(mail: any): Promise<void> {
  const messageId = mail.messageId
  if (!messageId) {
    console.log('[Email Worker] Brak Message-ID, pomijam')
    return
  }

  // Sprawdź czy już przetworzony (dedup)
  const existing = await prisma.emailMessage.findUnique({
    where: { messageId },
  })

  if (existing) {
    console.log(`[Email Worker] Email ${messageId} już przetworzony, pomijam`)
    return
  }

  const fromEmail = getSenderEmail(mail)
  const fromName = getSenderName(mail)
  const subject = mail.subject || '(brak tematu)'
  const bodyText = typeof mail.text === 'string' ? mail.text : ''
  const bodyHtml = typeof mail.html === 'string' ? mail.html : ''

  console.log(`[Email Worker] Przetwarzam: "${subject}" od ${fromEmail}`)

  // Spróbuj znaleźć adres reply+...
  const replyAddress = extractReplyAddress(mail)
  let ticketId: string | null = null
  let matchedBy: string | null = null

  if (replyAddress) {
    console.log(`[Email Worker] Znaleziono reply address: ${replyAddress}`)

    const parsed = parseReplyToAddress(replyAddress)
    if (parsed) {
      console.log(`[Email Worker] Parsed: ticket=${parsed.ticketNumber}, token=${parsed.token}`)

      // Weryfikuj token
      if (verifyReplyToken(parsed.ticketNumber, parsed.token)) {
        // Znajdź ticket
        const ticket = await prisma.ticket.findUnique({
          where: { number: parsed.ticketNumber },
        })

        if (ticket) {
          ticketId = ticket.id
          matchedBy = 'reply-to'
          console.log(`[Email Worker] Dopasowano do ticketa ${ticket.number} przez reply-to`)
        }
      } else {
        console.log('[Email Worker] Token HMAC nieprawidłowy')
      }
    }
  }

  // Fallback: sprawdź subject
  if (!ticketId) {
    const ticketNumber = extractTicketFromSubject(subject)
    if (ticketNumber) {
      const ticket = await prisma.ticket.findUnique({
        where: { number: ticketNumber },
      })

      if (ticket) {
        ticketId = ticket.id
        matchedBy = 'subject'
        console.log(`[Email Worker] Dopasowano do ticketa ${ticket.number} przez subject`)
      }
    }
  }

  // Sprawdź czy nadawca jest dozwolony (jeśli ticket znaleziony)
  let senderAllowed = false
  if (ticketId && fromEmail) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        clientAccount: {
          include: {
            users: {
              select: { email: true },
            },
          },
        },
      },
    })

    if (ticket) {
      // Sprawdź czy email należy do użytkownika klienta
      const clientEmails = ticket.clientAccount.users.map((u) => u.email.toLowerCase())
      if (clientEmails.includes(fromEmail)) {
        senderAllowed = true
      }

      // Lub sprawdź domenę email
      if (!senderAllowed && ticket.clientAccount.emailDomains) {
        const allowedDomains = ticket.clientAccount.emailDomains
          .split(',')
          .map((d) => d.trim().toLowerCase())
        const senderDomain = fromEmail.split('@')[1]
        if (allowedDomains.includes(senderDomain)) {
          senderAllowed = true
        }
      }
    }
  }

  // Zapisz email
  const emailMessage = await prisma.emailMessage.create({
    data: {
      messageId,
      inReplyTo: mail.inReplyTo || null,
      references: Array.isArray(mail.references)
        ? mail.references.join(' ')
        : mail.references || null,
      fromEmail: fromEmail || 'unknown',
      fromName: fromName || null,
      toEmail: mail.to?.value?.[0]?.address || imapConfig.user,
      subject,
      bodyText: bodyText.slice(0, 50000), // Limit
      bodyHtml: bodyHtml.slice(0, 100000),
      receivedAt: mail.date || new Date(),
      isMatched: ticketId !== null && senderAllowed,
      matchedBy: senderAllowed ? matchedBy : null,
      ticketId: senderAllowed ? ticketId : null,
    },
  })

  // Jeśli dopasowano i nadawca dozwolony, utwórz komentarz
  if (ticketId && senderAllowed) {
    const cleanedContent = cleanReplyContent(bodyText)

    // Znajdź lub utwórz użytkownika jako autora
    const user = await prisma.user.findFirst({
      where: { email: fromEmail?.toLowerCase() },
    })

    if (user) {
      await prisma.comment.create({
        data: {
          content: cleanedContent || '(treść w załączniku HTML)',
          visibility: 'PUBLIC',
          authorId: user.id,
          ticketId,
          emailMessageId: emailMessage.id,
        },
      })

      console.log(`[Email Worker] Utworzono komentarz w tickecie ${ticketId}`)
    }
  } else if (ticketId && !senderAllowed) {
    console.log(`[Email Worker] Nadawca ${fromEmail} nie jest dozwolony dla tego ticketa`)
  }
}

async function poll(): Promise<void> {
  console.log(`[Email Worker] Sprawdzam skrzynkę... ${new Date().toISOString()}`)

  const imap = createImapClient(imapConfig)

  try {
    await connectAndReady(imap)
    console.log('[Email Worker] Połączono z IMAP')

    await openMailbox(imap, imapConfig.mailbox)
    console.log(`[Email Worker] Otwarto skrzynkę: ${imapConfig.mailbox}`)

    const unseenUids = await searchUnseen(imap)
    console.log(`[Email Worker] Znaleziono ${unseenUids.length} nieprzeczytanych wiadomości`)

    for (const uid of unseenUids) {
      try {
        const mail = await fetchMessage(imap, uid)
        await processEmail(mail)
      } catch (err) {
        console.error(`[Email Worker] Błąd przetwarzania wiadomości UID ${uid}:`, err)
      }
    }
  } catch (err) {
    console.error('[Email Worker] Błąd połączenia IMAP:', err)
  } finally {
    disconnectImap(imap)
  }
}

async function main(): Promise<void> {
  console.log('[Email Worker] Start')
  console.log(`[Email Worker] Host: ${imapConfig.host}:${imapConfig.port}`)
  console.log(`[Email Worker] User: ${imapConfig.user}`)
  console.log(`[Email Worker] Interwał: ${POLL_INTERVAL}ms`)

  // Pierwsze sprawdzenie od razu
  await poll()

  // Potem co interwał
  setInterval(poll, POLL_INTERVAL)
}

main().catch((err) => {
  console.error('[Email Worker] Krytyczny błąd:', err)
  process.exit(1)
})
