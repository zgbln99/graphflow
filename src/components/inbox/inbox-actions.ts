'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function matchEmailToTicketAction(emailId: string, ticketId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const email = await prisma.emailMessage.findUnique({
      where: { id: emailId },
    })

    if (!email) {
      return { error: 'Email nie istnieje' }
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    })

    if (!ticket) {
      return { error: 'Ticket nie istnieje' }
    }

    // Utwórz komentarz z treści emaila
    const comment = await prisma.comment.create({
      data: {
        content: `**Email od:** ${email.fromName || email.fromEmail}\n**Temat:** ${email.subject}\n\n${email.bodyText || email.bodyHtml || '(brak treści)'}`,
        visibility: 'PUBLIC',
        authorId: session.user.id, // Admin który przypisał
        ticketId,
        emailMessageId: emailId,
      },
    })

    // Aktualizuj email
    await prisma.emailMessage.update({
      where: { id: emailId },
      data: {
        isMatched: true,
        matchedBy: 'manual',
        ticketId,
        matchedById: session.user.id,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error matching email:', error)
    return { error: 'Nie udało się przypisać emaila' }
  }
}
