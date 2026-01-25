'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createTicketSchema, updateTicketSchema } from '@/lib/validators'
import { generateNumber } from '@/lib/utils'
import { generateReplyToken } from '@/lib/email/reply-token'
import { notifyTicketCreated, notifyTicketStatusChanged } from '@/lib/email/notifications'

export async function createTicketAction(formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Brak uprawnień' }
  }

  const isAdmin = session.user.role === 'ADMIN'

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || '',
    priority: formData.get('priority') || 'NORMAL',
    deadline: formData.get('deadline') || undefined,
    projectId: formData.get('projectId') || undefined,
    clientAccountId: isAdmin
      ? formData.get('clientAccountId')
      : session.user.clientAccountId,
  }

  const validationResult = createTicketSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  // Dla klienta używamy jego clientAccountId
  const clientAccountId = isAdmin
    ? data.clientAccountId!
    : session.user.clientAccountId!

  if (!clientAccountId) {
    return { error: 'Nie można określić klienta' }
  }

  try {
    // Generuj numer ticketa
    const ticketNumber = await generateNumber('TCK', prisma)

    // Generuj token do odpowiedzi email
    const replyToken = generateReplyToken(ticketNumber)

    // Utwórz ticket
    const ticket = await prisma.ticket.create({
      data: {
        number: ticketNumber,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        deadline: data.deadline || null,
        projectId: data.projectId || null,
        clientAccountId,
        createdById: session.user.id,
        replyToken,
      },
      include: {
        createdBy: true,
      },
    })

    // Wyślij powiadomienia do innych użytkowników klienta
    await notifyTicketCreated(ticket)

    return { success: true, ticketId: ticket.id }
  } catch (error) {
    console.error('Error creating ticket:', error)
    return { error: 'Nie udało się utworzyć zgłoszenia' }
  }
}

export async function updateTicketAction(ticketId: string, formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Brak uprawnień' }
  }

  const isAdmin = session.user.role === 'ADMIN'

  // Pobierz aktualny ticket
  const currentTicket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  })

  if (!currentTicket) {
    return { error: 'Ticket nie istnieje' }
  }

  // Sprawdź dostęp
  if (!isAdmin && currentTicket.clientAccountId !== session.user.clientAccountId) {
    return { error: 'Brak dostępu do tego ticketa' }
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || '',
    priority: formData.get('priority'),
    deadline: formData.get('deadline') || undefined,
    projectId: formData.get('projectId') || null,
  }

  const validationResult = updateTicketSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        deadline: data.deadline || null,
        projectId: data.projectId,
      },
    })

    return { success: true, ticketId: ticket.id }
  } catch (error) {
    console.error('Error updating ticket:', error)
    return { error: 'Nie udało się zaktualizować zgłoszenia' }
  }
}

export async function updateTicketStatusAction(ticketId: string, status: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    })

    if (!currentTicket) {
      return { error: 'Ticket nie istnieje' }
    }

    const oldStatus = currentTicket.status
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: status as any },
    })

    // Wyślij powiadomienie o zmianie statusu
    const { ticketStatusLabels } = await import('@/lib/utils')
    await notifyTicketStatusChanged(
      ticket,
      ticketStatusLabels[oldStatus] || oldStatus,
      ticketStatusLabels[status] || status
    )

    return { success: true }
  } catch (error) {
    console.error('Error updating ticket status:', error)
    return { error: 'Nie udało się zmienić statusu' }
  }
}

export async function updateTicketPriorityAction(ticketId: string, priority: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { priority: priority as any },
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating ticket priority:', error)
    return { error: 'Nie udało się zmienić priorytetu' }
  }
}

export async function deleteTicketAction(ticketId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    // Usuń ticket (cascaded relations will be deleted automatically)
    await prisma.ticket.delete({
      where: { id: ticketId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return { error: 'Nie udało się usunąć ticketa' }
  }
}
