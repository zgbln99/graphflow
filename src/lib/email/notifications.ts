import { prisma } from '../db'
import { sendEmail } from './smtp'
import { generateReplyToken, generateReplyToAddress } from './reply-token'
import {
  ticketCreatedEmail,
  ticketStatusChangedEmail,
  ticketNewCommentEmail,
  ticketDeadlineReminderEmail,
  projectStatusChangedEmail,
  newProjectRequestEmail,
} from './templates'
import type { Ticket, Project, Comment, User, ClientAccount } from '@prisma/client'

/**
 * Wysyła powiadomienie o utworzeniu ticketa do klienta
 */
export async function notifyTicketCreated(
  ticket: Ticket & { createdBy: User }
): Promise<void> {
  // Pobierz użytkowników klienta (bez twórcy)
  const clientUsers = await prisma.user.findMany({
    where: {
      clientAccountId: ticket.clientAccountId,
      isActive: true,
      id: { not: ticket.createdById },
    },
  })

  const replyToAddress = generateReplyToAddress(ticket.number, ticket.replyToken)

  for (const user of clientUsers) {
    const emailData = ticketCreatedEmail({
      ticketNumber: ticket.number,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      replyToAddress,
      recipientName: user.name,
      description: ticket.description || undefined,
    })

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: replyToAddress,
      ticketId: ticket.id,
    })
  }
}

/**
 * Wysyła powiadomienie o zmianie statusu ticketa
 */
export async function notifyTicketStatusChanged(
  ticket: Ticket,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const clientUsers = await prisma.user.findMany({
    where: {
      clientAccountId: ticket.clientAccountId,
      isActive: true,
    },
  })

  const replyToAddress = generateReplyToAddress(ticket.number, ticket.replyToken)

  for (const user of clientUsers) {
    const emailData = ticketStatusChangedEmail({
      ticketNumber: ticket.number,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      replyToAddress,
      recipientName: user.name,
      oldStatus,
      newStatus,
    })

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: replyToAddress,
      ticketId: ticket.id,
    })
  }
}

/**
 * Wysyła powiadomienie o nowym komentarzu
 */
export async function notifyTicketNewComment(
  ticket: Ticket,
  comment: Comment & { author: User },
  notifyAdmin: boolean = false
): Promise<void> {
  // Pobierz użytkowników do powiadomienia
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        // Użytkownicy klienta (poza autorem)
        {
          clientAccountId: ticket.clientAccountId,
          id: { not: comment.authorId },
        },
        // Admin (jeśli notifyAdmin i komentarz nie jest od admina)
        ...(notifyAdmin ? [{ role: 'ADMIN' as const, id: { not: comment.authorId } }] : []),
      ],
    },
  })

  const replyToAddress = generateReplyToAddress(ticket.number, ticket.replyToken)

  for (const user of users) {
    const emailData = ticketNewCommentEmail({
      ticketNumber: ticket.number,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      replyToAddress,
      recipientName: user.name,
      commentAuthor: comment.author.name,
      commentContent: comment.content,
    })

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: replyToAddress,
      ticketId: ticket.id,
    })
  }
}

/**
 * Wysyła przypomnienia o zbliżających się deadline'ach
 */
export async function sendDeadlineReminders(): Promise<void> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Znajdź tickety z deadline w ciągu 48h
  const tickets = await prisma.ticket.findMany({
    where: {
      deadline: {
        gte: now,
        lte: in48h,
      },
      status: {
        notIn: ['RESOLVED', 'CLOSED'],
      },
    },
    include: {
      clientAccount: {
        include: {
          users: {
            where: { isActive: true },
          },
        },
      },
    },
  })

  for (const ticket of tickets) {
    const hoursLeft = Math.round(
      (ticket.deadline!.getTime() - now.getTime()) / (60 * 60 * 1000)
    )

    // Sprawdź czy wysłaliśmy już powiadomienie
    const alreadySent = await prisma.emailLog.findFirst({
      where: {
        ticketId: ticket.id,
        subject: { contains: 'Przypomnienie o terminie' },
        sentAt: {
          gte: new Date(now.getTime() - 12 * 60 * 60 * 1000), // W ciągu ostatnich 12h
        },
      },
    })

    if (alreadySent) continue

    const replyToAddress = generateReplyToAddress(ticket.number, ticket.replyToken)

    for (const user of ticket.clientAccount.users) {
      const emailData = ticketDeadlineReminderEmail({
        ticketNumber: ticket.number,
        ticketTitle: ticket.title,
        ticketId: ticket.id,
        replyToAddress,
        recipientName: user.name,
        deadline: ticket.deadline!.toLocaleString('pl-PL'),
        hoursLeft,
      })

      await sendEmail({
        to: user.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        replyTo: replyToAddress,
        ticketId: ticket.id,
      })
    }
  }
}

/**
 * Wysyła powiadomienie o zmianie statusu projektu (z opcjonalnym podglądem)
 */
export async function notifyProjectStatusChanged(
  project: Project & { status: { name: string } },
  oldStatusName: string
): Promise<void> {
  const clientUsers = await prisma.user.findMany({
    where: {
      clientAccountId: project.clientAccountId,
      isActive: true,
    },
  })

  // Pobierz podgląd projektu jeśli istnieje
  const previewFile = await prisma.projectFile.findFirst({
    where: {
      projectId: project.id,
      isPreview: true,
    },
  })

  // Przygotuj załącznik z podglądem
  let attachments: Array<{ filename: string; path: string; cid?: string }> = []
  let previewCid: string | undefined

  if (previewFile) {
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
    const filePath = `${UPLOAD_DIR}/${project.id}/${previewFile.storedName}`
    previewCid = 'project-preview'
    attachments = [{
      filename: previewFile.filename,
      path: filePath,
      cid: previewCid,
    }]
  }

  for (const user of clientUsers) {
    const emailData = projectStatusChangedEmail({
      projectNumber: project.number,
      projectTitle: project.title,
      projectId: project.id,
      recipientName: user.name,
      oldStatus: oldStatusName,
      newStatus: project.status.name,
      previewCid,
    })

    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      projectId: project.id,
      attachments,
    })
  }
}

/**
 * Wysyła powiadomienie do adminów o nowym zgłoszeniu projektu
 */
export async function notifyNewProjectRequest(
  project: Project & { clientAccount: ClientAccount; createdBy: User | null }
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      isActive: true,
    },
  })

  for (const admin of admins) {
    const emailData = newProjectRequestEmail({
      projectNumber: project.number,
      projectTitle: project.title,
      projectId: project.id,
      recipientName: admin.name,
      clientName: project.clientAccount.name,
      createdByName: project.createdBy?.name || 'Nieznany',
      description: project.description || undefined,
    })

    await sendEmail({
      to: admin.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      projectId: project.id,
    })
  }
}
