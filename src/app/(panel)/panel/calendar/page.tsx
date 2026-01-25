import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { CalendarView } from '@/components/calendar/calendar-view'

export default async function CalendarPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'
  const clientAccountId = session.user.clientAccountId

  // Pobierz tickety z deadline'ami
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(isAdmin ? {} : { clientAccountId: clientAccountId! }),
      deadline: { not: null },
      status: { notIn: ['RESOLVED', 'CLOSED'] },
    },
    include: {
      clientAccount: true,
      project: true,
    },
    orderBy: { deadline: 'asc' },
  })

  // Pobierz etapy projektów z datami
  const timelineStages = await prisma.timelineStage.findMany({
    where: {
      project: isAdmin ? {} : { clientAccountId: clientAccountId! },
      plannedDate: { not: null },
      isCompleted: false,
    },
    include: {
      project: {
        include: {
          clientAccount: true,
        },
      },
    },
    orderBy: { plannedDate: 'asc' },
  })

  // Pobierz projekty z deadline'ami
  const projects = await prisma.project.findMany({
    where: {
      ...(isAdmin ? {} : { clientAccountId: clientAccountId! }),
      deadline: { not: null },
      status: {
        slug: { notIn: ['zakonczone', 'wstrzymane'] },
      },
    },
    include: {
      clientAccount: true,
      status: true,
    },
    orderBy: { deadline: 'asc' },
  })

  // Konwertuj na eventy kalendarza
  type CalendarEvent = {
    id: string
    title: string
    date: Date
    type: 'ticket' | 'project' | 'stage'
    color: string
    url: string
    subtitle?: string
  }

  const events: CalendarEvent[] = []

  // Tickety
  for (const ticket of tickets) {
    events.push({
      id: `ticket-${ticket.id}`,
      title: `${ticket.number}: ${ticket.title}`,
      date: ticket.deadline!,
      type: 'ticket',
      color: ticket.priority === 'URGENT' ? '#ef4444' : ticket.priority === 'HIGH' ? '#f59e0b' : '#3b82f6',
      url: `/panel/tickets/${ticket.id}`,
      subtitle: isAdmin ? ticket.clientAccount.name : ticket.project?.title,
    })
  }

  // Projekty
  for (const project of projects) {
    events.push({
      id: `project-${project.id}`,
      title: `${project.number}: ${project.title}`,
      date: project.deadline!,
      type: 'project',
      color: '#8b5cf6',
      url: `/panel/projects/${project.id}`,
      subtitle: isAdmin ? project.clientAccount.name : project.status.name,
    })
  }

  // Etapy timeline
  for (const stage of timelineStages) {
    events.push({
      id: `stage-${stage.id}`,
      title: `${stage.project.number}: ${stage.name}`,
      date: stage.plannedDate!,
      type: 'stage',
      color: stage.isCurrent ? '#10b981' : '#6b7280',
      url: `/panel/projects/${stage.project.id}`,
      subtitle: isAdmin ? stage.project.clientAccount.name : stage.project.title,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kalendarz</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Deadline&apos;y ticketów, projektów i etapów timeline
        </p>
      </div>

      <CalendarView events={events} />
    </div>
  )
}
