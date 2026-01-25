import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type } = await params
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  let csv = ''
  let filename = ''

  try {
    switch (type) {
      case 'projects': {
        const projects = await prisma.project.findMany({
          where: {
            ...(clientId ? { clientAccountId: clientId } : {}),
            ...(dateFrom || dateTo
              ? {
                  createdAt: {
                    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                    ...(dateTo ? { lte: new Date(dateTo) } : {}),
                  },
                }
              : {}),
          },
          include: {
            status: true,
            clientAccount: true,
            tags: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        csv = 'Numer;Tytuł;Klient;Status;Tagi;Deadline;Utworzono;Aktualizacja\n'
        for (const p of projects) {
          csv += `${p.number};${escape(p.title)};${escape(p.clientAccount.name)};${p.status.name};${p.tags.map((t) => t.name).join(', ')};${p.deadline?.toISOString().split('T')[0] || ''};${p.createdAt.toISOString().split('T')[0]};${p.updatedAt.toISOString().split('T')[0]}\n`
        }
        filename = `projekty_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'tickets': {
        const tickets = await prisma.ticket.findMany({
          where: {
            ...(clientId ? { clientAccountId: clientId } : {}),
            ...(dateFrom || dateTo
              ? {
                  createdAt: {
                    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                    ...(dateTo ? { lte: new Date(dateTo) } : {}),
                  },
                }
              : {}),
          },
          include: {
            clientAccount: true,
            project: true,
            createdBy: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        csv = 'Numer;Tytuł;Klient;Projekt;Status;Priorytet;Deadline;Utworzony przez;Utworzono\n'
        for (const t of tickets) {
          csv += `${t.number};${escape(t.title)};${escape(t.clientAccount.name)};${t.project?.title || ''};${t.status};${t.priority};${t.deadline?.toISOString().split('T')[0] || ''};${t.createdBy.name};${t.createdAt.toISOString().split('T')[0]}\n`
        }
        filename = `tickety_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'timeline': {
        const stages = await prisma.timelineStage.findMany({
          include: {
            project: {
              include: {
                clientAccount: true,
              },
            },
          },
          orderBy: [{ project: { number: 'asc' } }, { order: 'asc' }],
        })

        csv = 'Projekt;Klient;Etap;Kolejność;Data planowana;Data rzeczywista;Aktualny;Zakończony\n'
        for (const s of stages) {
          csv += `${s.project.number};${escape(s.project.clientAccount.name)};${escape(s.name)};${s.order + 1};${s.plannedDate?.toISOString().split('T')[0] || ''};${s.actualDate?.toISOString().split('T')[0] || ''};${s.isCurrent ? 'Tak' : 'Nie'};${s.isCompleted ? 'Tak' : 'Nie'}\n`
        }
        filename = `timeline_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'full': {
        // Projekty
        const projects = await prisma.project.findMany({
          include: {
            status: true,
            clientAccount: true,
            tags: true,
            tickets: true,
            timelineStages: { orderBy: { order: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        })

        csv = '=== PROJEKTY ===\n'
        csv += 'Numer;Tytuł;Klient;Status;Tagi;Liczba ticketów;Deadline;Utworzono\n'
        for (const p of projects) {
          csv += `${p.number};${escape(p.title)};${escape(p.clientAccount.name)};${p.status.name};${p.tags.map((t) => t.name).join(', ')};${p.tickets.length};${p.deadline?.toISOString().split('T')[0] || ''};${p.createdAt.toISOString().split('T')[0]}\n`
        }

        // Tickety
        const tickets = await prisma.ticket.findMany({
          include: {
            clientAccount: true,
            project: true,
            createdBy: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        csv += '\n=== TICKETY ===\n'
        csv += 'Numer;Tytuł;Klient;Projekt;Status;Priorytet;Deadline;Utworzony przez;Utworzono\n'
        for (const t of tickets) {
          csv += `${t.number};${escape(t.title)};${escape(t.clientAccount.name)};${t.project?.title || ''};${t.status};${t.priority};${t.deadline?.toISOString().split('T')[0] || ''};${t.createdBy.name};${t.createdAt.toISOString().split('T')[0]}\n`
        }

        filename = `graphflow_export_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // Add BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF'
    const csvWithBom = bom + csv

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

function escape(str: string | null | undefined): string {
  if (!str) return ''
  // Escape semicolons and newlines for CSV
  return str.replace(/;/g, ',').replace(/\n/g, ' ').replace(/"/g, '""')
}
