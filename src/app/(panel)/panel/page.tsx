import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import {
  Briefcase,
  Ticket,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { formatRelativeTime, ticketStatusLabels, ticketStatusColors } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const isAdmin = session.user.role === 'ADMIN'
  const clientAccountId = session.user.clientAccountId

  // Pobierz statystyki
  const [projectStats, ticketStats, recentTickets, upcomingDeadlines] = await Promise.all([
    // Statystyki projektów
    prisma.project.groupBy({
      by: ['statusId'],
      _count: { id: true },
      where: isAdmin ? {} : { clientAccountId: clientAccountId! },
    }),
    // Statystyki ticketów
    prisma.ticket.groupBy({
      by: ['status'],
      _count: { id: true },
      where: isAdmin ? {} : { clientAccountId: clientAccountId! },
    }),
    // Ostatnie tickety
    prisma.ticket.findMany({
      where: isAdmin ? {} : { clientAccountId: clientAccountId! },
      include: {
        clientAccount: true,
        project: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    // Zbliżające się deadline'y
    prisma.ticket.findMany({
      where: {
        ...(isAdmin ? {} : { clientAccountId: clientAccountId! }),
        deadline: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dni
        },
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
      include: {
        clientAccount: true,
      },
      orderBy: { deadline: 'asc' },
      take: 5,
    }),
  ])

  // Pobierz statusy projektów dla nazw
  const projectStatuses = await prisma.projectStatus.findMany()
  const statusMap = Object.fromEntries(
    projectStatuses.map((s) => [s.id, s])
  )

  // Oblicz sumy
  const totalProjects = projectStats.reduce((acc, s) => acc + s._count.id, 0)
  const totalTickets = ticketStats.reduce((acc, s) => acc + s._count.id, 0)
  const openTickets = ticketStats
    .filter((s) => !['RESOLVED', 'CLOSED'].includes(s.status))
    .reduce((acc, s) => acc + s._count.id, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {isAdmin ? 'Przegląd wszystkich projektów i zgłoszeń' : `Witaj, ${session.user.name}!`}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase className="w-5 h-5" />}
          label="Projekty"
          value={totalProjects}
          color="blue"
        />
        <StatCard
          icon={<Ticket className="w-5 h-5" />}
          label="Tickety"
          value={totalTickets}
          color="purple"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Otwarte zgłoszenia"
          value={openTickets}
          color="yellow"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Do deadline'u (7 dni)"
          value={upcomingDeadlines.length}
          color="red"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent tickets */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Ostatnie tickety</h2>
            <Link href="/panel/tickets" className="text-sm link flex items-center gap-1">
              Zobacz wszystkie
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Brak ticketów
              </div>
            ) : (
              recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/panel/tickets/${ticket.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {ticket.number}
                        </span>
                        <span
                          className={`badge ${ticketStatusColors[ticket.status]}`}
                        >
                          {ticketStatusLabels[ticket.status]}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 truncate">
                        {ticket.title}
                      </p>
                      {isAdmin && (
                        <p className="text-sm text-gray-500">
                          {ticket.clientAccount.name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(ticket.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Zbliżające się terminy</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {upcomingDeadlines.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Brak zbliżających się terminów
              </div>
            ) : (
              upcomingDeadlines.map((ticket) => {
                const daysLeft = Math.ceil(
                  (ticket.deadline!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                )
                const isUrgent = daysLeft <= 2

                return (
                  <Link
                    key={ticket.id}
                    href={`/panel/tickets/${ticket.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {ticket.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {ticket.number}
                          {isAdmin && ` • ${ticket.clientAccount.name}`}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                          isUrgent
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {daysLeft === 0
                          ? 'Dziś!'
                          : daysLeft === 1
                          ? 'Jutro'
                          : `${daysLeft} dni`}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Projects by status (admin only) */}
      {isAdmin && projectStats.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Projekty wg statusu</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {projectStats.map((stat) => {
              const status = statusMap[stat.statusId]
              if (!status) return null

              return (
                <Link
                  key={stat.statusId}
                  href={`/panel/projects?status=${stat.statusId}`}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
                >
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: status.color }}
                  />
                  <p className="text-2xl font-bold text-gray-900">{stat._count.id}</p>
                  <p className="text-sm text-gray-600">{status.name}</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'purple' | 'yellow' | 'red' | 'green'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  )
}
