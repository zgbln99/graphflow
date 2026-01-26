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
import {
  AnimatedStatCard,
  AnimatedQuickStat,
  AnimatedSection,
  AnimatedProjectCard,
  AnimatedDeadlineCard,
  AnimatedActivityItem,
  AnimatedCard,
} from '@/components/dashboard/animated-dashboard'

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
      <AnimatedSection delay={0}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAdmin ? 'Przeglad wszystkich projektow' : `Witaj, ${session.user.name}!`}
          </p>
        </div>
      </AnimatedSection>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          icon={<Briefcase className="w-5 h-5" />}
          label="Wszystkie projekty"
          value={totalProjects}
          color="blue"
          href="/panel/projects"
          delay={100}
        />
        <AnimatedStatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="W trakcie"
          value={inProgressProjects}
          color="purple"
          href="/panel/projects?status=w-trakcie"
          delay={200}
        />
        <AnimatedStatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Zakonczone"
          value={completedProjects}
          color="green"
          href="/panel/projects?status=zakonczone"
          delay={300}
        />
        {isAdmin ? (
          <AnimatedStatCard
            icon={<Building2 className="w-5 h-5" />}
            label="Aktywni klienci"
            value={clientsCount}
            color="yellow"
            href="/panel/clients"
            delay={400}
          />
        ) : (
          <AnimatedStatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Zblizajace sie terminy"
            value={upcomingDeadlines.length}
            color="red"
            delay={400}
          />
        )}
      </div>

      {/* Charts and lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projects by status chart */}
        {isAdmin && projectStatusData.length > 0 && (
          <AnimatedCard delay={500} className="p-6" withTilt>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Projekty wg statusu</h2>
            </div>
            <DonutChart data={projectStatusData} />
          </AnimatedCard>
        )}

        {/* Recent projects */}
        <AnimatedCard delay={600}>
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Ostatnie projekty</h2>
            <Link href="/panel/projects" className="text-xs sm:text-sm link flex items-center gap-1 group whitespace-nowrap flex-shrink-0">
              <span className="hidden sm:inline">Zobacz wszystkie</span>
              <span className="sm:hidden">Więcej</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentProjects.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Brak projektow
              </div>
            ) : (
              recentProjects.map((project, index) => (
                <AnimatedProjectCard
                  key={project.id}
                  href={`/panel/projects/${project.id}`}
                  delay={700 + index * 50}
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] sm:text-xs font-mono text-gray-500 dark:text-gray-400">
                          {project.number}
                        </span>
                        <span
                          className="badge text-[10px] sm:text-xs"
                          style={{
                            backgroundColor: `${project.status.color}20`,
                            color: project.status.color,
                          }}
                        >
                          {project.status.name}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                        {project.title}
                      </p>
                      {isAdmin && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {project.clientAccount.name}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {formatRelativeTime(project.updatedAt)}
                    </span>
                  </div>
                </AnimatedProjectCard>
              ))
            )}
          </div>
        </AnimatedCard>

        {/* Upcoming deadlines */}
        <AnimatedCard delay={800}>
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Zbliżające się terminy</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {upcomingDeadlines.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Brak zblizajacych sie terminow
              </div>
            ) : (
              upcomingDeadlines.map((project, index) => {
                const daysLeft = Math.ceil(
                  (project.deadline!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                )
                const isUrgent = daysLeft <= 3

                return (
                  <AnimatedDeadlineCard
                    key={project.id}
                    href={`/panel/projects/${project.id}`}
                    isUrgent={isUrgent}
                    delay={900 + index * 50}
                  >
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
                          {project.title}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {project.number}
                          {isAdmin && ` • ${project.clientAccount.name}`}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
                          isUrgent
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        {daysLeft === 0
                          ? 'Dziś!'
                          : daysLeft === 1
                          ? 'Jutro'
                          : `${daysLeft} dni`}
                      </div>
                    </div>
                  </AnimatedDeadlineCard>
                )
              })
            )}
          </div>
        </AnimatedCard>

        {/* Recent activity (admin only) */}
        {isAdmin && recentActivity.length > 0 && (
          <AnimatedCard delay={1000}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Ostatnia aktywnosc</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[300px] overflow-y-auto">
              {recentActivity.map((activity, index) => (
                <AnimatedActivityItem
                  key={activity.id}
                  href={`/panel/projects/${activity.project.id}`}
                  delay={1100 + index * 30}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 status-indicator" />
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
                </AnimatedActivityItem>
              ))}
            </div>
          </AnimatedCard>
        )}
      </div>

      {/* Quick stats for admin */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AnimatedQuickStat label="Klienci" value={clientsCount} icon={<Building2 className="w-4 h-4" />} delay={1200} />
          <AnimatedQuickStat label="Uzytkownicy" value={usersCount} icon={<Users className="w-4 h-4" />} delay={1250} />
          <AnimatedQuickStat label="Statusow" value={projectStatuses.length} icon={<BarChart3 className="w-4 h-4" />} delay={1300} />
          <AnimatedQuickStat label="Aktywne projekty" value={totalProjects - completedProjects} icon={<Briefcase className="w-4 h-4" />} delay={1350} />
        </div>
      )}
    </div>
  )
}
