'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function bulkTicketAction(
  action: string,
  ticketIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    switch (action) {
      case 'close':
        await prisma.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: { status: 'CLOSED' },
        })
        break

      case 'resolve':
        await prisma.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: { status: 'RESOLVED' },
        })
        break

      case 'in_progress':
        await prisma.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: { status: 'IN_PROGRESS' },
        })
        break

      case 'delete':
        await prisma.ticket.deleteMany({
          where: { id: { in: ticketIds } },
        })
        break

      default:
        return { error: 'Nieznana akcja' }
    }

    return { success: true }
  } catch (error) {
    console.error('Bulk action error:', error)
    return { error: 'Wystąpił błąd podczas wykonywania akcji' }
  }
}
