import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import {
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Building2,
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
} from 'lucide-react'
import { formatRelativeTime, formatDate } from '@/lib/utils'
import { DonutChart } from '@/components/dashboard/charts'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const isAdmin = session.user.role === 'ADMIN'
  const clientAccountId = session.user.clientAccountId

  // Pobierz statystyki
  const [
    projectStats,
    recentProjects,
    upcomingDeadlines,
    clientsCount,
    usersCount,
    recentActivity,
  ] = await Promise.all([
    // Statystyki projektow
    prisma.project.groupBy({
      by: ['statusId'],
      _count: { id: true },
      where: isAdmin ? {} : { clientAccountId: clientAccountId! },
    }),
    // Ostatnie projekty
    prisma.project.findMany({
      where: isAdmin ? {} : { clientAccountId: clientAccountId! },
      include: {
        clientAccount: { select: { name: true } },
        status: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    // Zblizajace sie deadline'y projektow
    prisma.project.findMany({
      where: {
        ...(isAdmin ? {} : { clientAccountId: clientAccountId! }),
        deadline: {
          gte: new Date(),
          lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dni
        },
        status: {
          slug: { notIn: ['zakonczone', 'anulowane'] },
        },
      },
      include: {
        clientAccount: { select: { name: true } },
        status: true,
      },
      orderBy: { deadline: 'asc' },
      take: 5,
    }),
    // Liczba klientow (tylko admin)
    isAdmin ? prisma.clientAccount.count({ where: { isActive: true } }) : 0,
    // Liczba uzytkownikow (tylko admin)
    isAdmin ? prisma.user.count({ where: { role: 'CLIENT_USER', isActive: true } }) : 0,
    // Ostatnia aktywnosc (historia statusow)
    isAdmin
      ? prisma.projectStatusHistory.findMany({
          include: {
            project: {
              select: { number: true, title: true, id: true },
            },
          },
          orderBy: { changedAt: 'desc' },
          take: 10,
        })
      : [],
  ])

  // Pobierz statusy projektow dla nazw
  const projectStatuses = await prisma.projectStatus.findMany({
    orderBy: { order: 'asc' },
  })
  const statusMap = Object.fromEntries(projectStatuses.map((s) => [s.id, s]))

  // Oblicz sumy
  const totalProjects = projectStats.reduce((acc, s) => acc + s._count.id, 0)
  const completedProjects = projectStats
    .filter((s) => statusMap[s.statusId]?.slug === 'zakonczone')
    .reduce((acc, s) => acc + s._count.id, 0)
  const inProgressProjects = projectStats
    .filter((s) => statusMap[s.statusId]?.slug === 'w-trakcie')
    .reduce((acc, s) => acc + s._count.id, 0)

  // Dane do wykresu kolowego
  const projectStatusData = projectStats.map((s) => ({
    label: statusMap[s.statusId]?.name || 'Nieznany',
    value: s._count.id,
    color: statusMap[s.statusId]?.color || '#6b7280',
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isAdmin ? 'Przeglad wszystkich projektow' : `Witaj, ${session.user.name}!`}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Briefcase className="w-5 h-5" />}
          label="Wszystkie projekty"
          value={totalProjects}
          color="blue"
          href="/panel/projects"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="W trakcie"
          value={inProgressProjects}
          color="purple"
          href="/panel/projects?status=w-trakcie"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Zakonczone"
          value={completedProjects}
          color="green"
          href="/panel/projects?status=zakonczone"
        />
        {isAdmin ? (
          <StatCard
            icon={<Building2 className="w-5 h-5" />}
            label="Aktywni klienci"
            value={clientsCount}
            color="yellow"
            href="/panel/clients"
          />
        ) : (
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Zblizajace sie terminy"
            value={upcomingDeadlines.length}
            color="red"
          />
        )}
      </div>

      {/* Charts and lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projects by status chart */}
        {isAdmin && projectStatusData.length > 0 && (
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Projekty wg statusu</h2>
            </div>
            <DonutChart data={projectStatusData} />
          </div>
        )}

        {/* Recent projects */}
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Ostatnie projekty</h2>
            <Link href="/panel/projects" className="text-sm link flex items-center gap-1">
              Zobacz wszystkie
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentProjects.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Brak projektow
              </div>
            ) : (
              recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/panel/projects/${project.id}`}
                  className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          {project.number}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${project.status.color}20`,
                            color: project.status.color,
                          }}
                        >
                          {project.status.name}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {project.title}
                      </p>
                      {isAdmin && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {project.clientAccount.name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(project.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Zblizajace sie terminy</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {upcomingDeadlines.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Brak zblizajacych sie terminow
              </div>
            ) : (
              upcomingDeadlines.map((project) => {
                const daysLeft = Math.ceil(
                  (project.deadline!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                )
                const isUrgent = daysLeft <= 3

                return (
                  <Link
                    key={project.id}
                    href={`/panel/projects/${project.id}`}
                    className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {project.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {project.number}
                          {isAdmin && ` • ${project.clientAccount.name}`}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                          isUrgent
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {daysLeft === 0
                          ? 'Dzis!'
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

        {/* Recent activity (admin only) */}
        {isAdmin && recentActivity.length > 0 && (
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Ostatnia aktywnosc</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[300px] overflow-y-auto">
              {recentActivity.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/panel/projects/${activity.project.id}`}
                  className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-mono text-gray-500">{activity.project.number}</span>
                        {' '}{activity.fromStatus ? `${activity.fromStatus} → ` : ''}{activity.toStatus}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {activity.project.title}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(activity.changedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick stats for admin */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat label="Klienci" value={clientsCount} icon={<Building2 className="w-4 h-4" />} />
          <QuickStat label="Uzytkownicy" value={usersCount} icon={<Users className="w-4 h-4" />} />
          <QuickStat label="Statusow" value={projectStatuses.length} icon={<BarChart3 className="w-4 h-4" />} />
          <QuickStat label="Aktywne projekty" value={totalProjects - completedProjects} icon={<Briefcase className="w-4 h-4" />} />
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
  href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'purple' | 'yellow' | 'red' | 'green'
  href?: string
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  }

  const content = (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="card dark:bg-gray-800 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
        {content}
      </Link>
    )
  }

  return <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">{content}</div>
}

function QuickStat({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="card dark:bg-gray-800 dark:border-gray-700 p-3 flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )
}
