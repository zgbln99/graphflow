'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createCommentSchema } from '@/lib/validators'
import { notifyTicketNewComment } from '@/lib/email/notifications'

export async function addCommentAction(formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    content: formData.get('content'),
    visibility: formData.get('visibility') || 'PUBLIC',
    ticketId: formData.get('ticketId') || undefined,
    projectId: formData.get('projectId') || undefined,
  }

  // Tylko admin może tworzyć notatki wewnętrzne
  if (rawData.visibility === 'INTERNAL' && session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień do tworzenia notatek wewnętrznych' }
  }

  const validationResult = createCommentSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    // Sprawdź dostęp do ticketa/projektu
    if (data.ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: data.ticketId },
      })

      if (!ticket) {
        return { error: 'Ticket nie istnieje' }
      }

      if (
        session.user.role !== 'ADMIN' &&
        ticket.clientAccountId !== session.user.clientAccountId
      ) {
        return { error: 'Brak dostępu do tego ticketa' }
      }
    }

    if (data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      })

      if (!project) {
        return { error: 'Projekt nie istnieje' }
      }

      if (
        session.user.role !== 'ADMIN' &&
        project.clientAccountId !== session.user.clientAccountId
      ) {
        return { error: 'Brak dostępu do tego projektu' }
      }
    }

    // Utwórz komentarz
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        visibility: data.visibility,
        authorId: session.user.id,
        ticketId: data.ticketId || null,
        projectId: data.projectId || null,
      },
      include: {
        author: true,
      },
    })

    // Wyślij powiadomienie (tylko dla publicznych komentarzy w ticketach)
    if (data.ticketId && data.visibility === 'PUBLIC') {
      const ticket = await prisma.ticket.findUnique({
        where: { id: data.ticketId },
      })

      if (ticket) {
        // Powiadom admina jeśli komentarz jest od klienta
        const notifyAdmin = session.user.role !== 'ADMIN'
        await notifyTicketNewComment(ticket, comment, notifyAdmin)
      }
    }

    return { success: true, commentId: comment.id }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { error: 'Nie udało się dodać komentarza' }
  }
}
