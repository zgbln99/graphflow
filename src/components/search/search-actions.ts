'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

interface SearchResult {
  type: 'project' | 'ticket' | 'client' | 'comment'
  id: string
  title: string
  subtitle?: string
  url: string
}

export async function searchAction(query: string): Promise<SearchResult[]> {
  const session = await getSession()
  if (!session) return []

  const isAdmin = session.user.role === 'ADMIN'
  const clientAccountId = session.user.clientAccountId

  const searchTerm = query.trim().toLowerCase()
  if (!searchTerm) return []

  const results: SearchResult[] = []

  // Szukaj projektów
  const projects = await prisma.project.findMany({
    where: {
      ...(isAdmin ? {} : { clientAccountId: clientAccountId! }),
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { number: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      clientAccount: true,
    },
    take: 5,
  })

  for (const project of projects) {
    results.push({
      type: 'project',
      id: project.id,
      title: `${project.number}: ${project.title}`,
      subtitle: isAdmin ? project.clientAccount.name : undefined,
      url: `/panel/projects/${project.id}`,
    })
  }

  // Szukaj ticketów
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(isAdmin ? {} : { clientAccountId: clientAccountId! }),
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { number: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      clientAccount: true,
      project: true,
    },
    take: 5,
  })

  for (const ticket of tickets) {
    results.push({
      type: 'ticket',
      id: ticket.id,
      title: `${ticket.number}: ${ticket.title}`,
      subtitle: ticket.project
        ? ticket.project.title
        : isAdmin
        ? ticket.clientAccount.name
        : undefined,
      url: `/panel/tickets/${ticket.id}`,
    })
  }

  // Szukaj klientów (tylko admin)
  if (isAdmin) {
    const clients = await prisma.clientAccount.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 5,
    })

    for (const client of clients) {
      results.push({
        type: 'client',
        id: client.id,
        title: client.name,
        subtitle: client.email || undefined,
        url: `/panel/clients/${client.id}`,
      })
    }
  }

  // Szukaj w komentarzach
  const comments = await prisma.comment.findMany({
    where: {
      content: { contains: searchTerm, mode: 'insensitive' },
      ...(isAdmin ? {} : { visibility: 'PUBLIC' }),
      OR: [
        {
          ticket: isAdmin ? {} : { clientAccountId: clientAccountId! },
        },
        {
          project: isAdmin ? {} : { clientAccountId: clientAccountId! },
        },
      ],
    },
    include: {
      ticket: true,
      project: true,
    },
    take: 5,
  })

  for (const comment of comments) {
    const preview = comment.content.slice(0, 50) + (comment.content.length > 50 ? '...' : '')
    if (comment.ticket) {
      results.push({
        type: 'comment',
        id: comment.id,
        title: preview,
        subtitle: `Ticket: ${comment.ticket.number}`,
        url: `/panel/tickets/${comment.ticket.id}`,
      })
    } else if (comment.project) {
      results.push({
        type: 'comment',
        id: comment.id,
        title: preview,
        subtitle: `Projekt: ${comment.project.number}`,
        url: `/panel/projects/${comment.project.id}`,
      })
    }
  }

  return results.slice(0, 10)
}
