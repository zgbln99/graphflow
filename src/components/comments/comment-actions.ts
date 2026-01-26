'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createCommentSchema } from '@/lib/validators'
import { notifyTicketNewComment } from '@/lib/email/notifications'
import { notifyUsers } from '@/lib/realtime'

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
        include: {
          clientAccount: { include: { users: { where: { isActive: true }, select: { id: true } } } },
        },
      })

      if (ticket) {
        // Powiadom admina jeśli komentarz jest od klienta
        const notifyAdmin = session.user.role !== 'ADMIN'
        await notifyTicketNewComment(ticket, comment, notifyAdmin)

        // Realtime notification
        const usersToNotify: string[] = []

        if (notifyAdmin) {
          // Powiadom adminów
          const admins = await prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          })
          usersToNotify.push(...admins.map((a: typeof admins[number]) => a.id))
        } else {
          // Powiadom użytkowników klienta (oprócz autora)
          usersToNotify.push(...ticket.clientAccount.users.map((u: typeof ticket.clientAccount.users[number]) => u.id).filter((id: string) => id !== session.user.id))
        }

        if (usersToNotify.length > 0) {
          notifyUsers(usersToNotify, {
            type: 'COMMENT_ADDED',
            comment: {
              id: comment.id,
              content: comment.content,
              visibility: comment.visibility,
              createdAt: comment.createdAt,
              projectId: null,
              ticketId: ticket.id,
              author: {
                id: comment.author.id,
                name: comment.author.name,
                role: comment.author.role,
              },
            },
          })
        }
      }
    }

    // Realtime notification dla komentarzy w projektach
    if (data.projectId && data.visibility === 'PUBLIC') {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        include: {
          clientAccount: { include: { users: { where: { isActive: true }, select: { id: true } } } },
        },
      })

      if (project) {
        const usersToNotify: string[] = []

        if (session.user.role !== 'ADMIN') {
          // Komentarz od klienta - powiadom adminów
          const admins = await prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          })
          usersToNotify.push(...admins.map((a: typeof admins[number]) => a.id))

          // Utwórz powiadomienie w bazie dla adminów
          await prisma.notification.createMany({
            data: admins.map((admin: typeof admins[number]) => ({
              type: 'COMMENT_ADDED' as const,
              title: 'Nowy komentarz',
              message: `${comment.author.name} dodał komentarz do projektu ${project.number}`,
              link: `/panel/projects/${project.id}`,
              userId: admin.id,
              projectId: project.id,
            })),
          })
        } else {
          // Komentarz od admina - powiadom użytkowników klienta
          usersToNotify.push(...project.clientAccount.users.map((u: typeof project.clientAccount.users[number]) => u.id))

          // Utwórz powiadomienie w bazie dla użytkowników klienta
          await prisma.notification.createMany({
            data: project.clientAccount.users.map((user: typeof project.clientAccount.users[number]) => ({
              type: 'COMMENT_ADDED' as const,
              title: 'Nowy komentarz',
              message: `${comment.author.name} dodał komentarz do projektu ${project.number}`,
              link: `/panel/projects/${project.id}`,
              userId: user.id,
              projectId: project.id,
            })),
          })
        }

        if (usersToNotify.length > 0) {
          notifyUsers(usersToNotify, {
            type: 'COMMENT_ADDED',
            comment: {
              id: comment.id,
              content: comment.content,
              visibility: comment.visibility,
              createdAt: comment.createdAt,
              projectId: project.id,
              ticketId: null,
              author: {
                id: comment.author.id,
                name: comment.author.name,
                role: comment.author.role,
              },
            },
          })
        }
      }
    }

    return { success: true, commentId: comment.id }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { error: 'Nie udało się dodać komentarza' }
  }
}
