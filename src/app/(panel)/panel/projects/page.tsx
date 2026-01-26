import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Plus, Search, Filter, ArrowUpDown, FolderOpen, LayoutGrid } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; client?: string }>
}) {
  const session = await getSession()
  if (!session) return null

  const params = await searchParams
  const isAdmin = session.user.role === 'ADMIN'
  const clientAccountId = session.user.clientAccountId

  // Pobierz statusy dla filtrów
  const statuses = await prisma.projectStatus.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })

  // Pobierz klientów (tylko admin)
  const clients = isAdmin
    ? await prisma.clientAccount.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      })
    : []

  // Pobierz projekty
  const projects = await prisma.project.findMany({
    where: {
      ...(isAdmin
        ? params.client
          ? { clientAccountId: params.client }
          : {}
        : { clientAccountId: clientAccountId! }),
      ...(params.status ? { statusId: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { number: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      status: true,
      clientAccount: true,
      tags: true,
      createdBy: {
        select: { id: true, name: true },
      },
      _count: {
        select: { tickets: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projekty</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isAdmin ? 'Zarządzaj wszystkimi projektami' : 'Twoje projekty'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Link href="/panel/projects/kanban" className="btn-secondary text-sm sm:text-base">
              <LayoutGrid className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Kanban</span>
            </Link>
          )}
          {isAdmin && (
            <Link href="/panel/projects/new" className="btn-primary text-sm sm:text-base">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nowy projekt</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
        <form className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={params.search}
                placeholder="Szukaj projektu..."
                className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-4">
            <select
              name="status"
              defaultValue={params.status || ''}
              className="input w-full sm:w-auto flex-1 sm:flex-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Wszystkie statusy</option>
              {statuses.map((status: typeof statuses[number]) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>

            {isAdmin && (
              <select
                name="client"
                defaultValue={params.client || ''}
                className="input w-full sm:w-auto flex-1 sm:flex-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Wszyscy klienci</option>
                {clients.map((client: typeof clients[number]) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}

            <button type="submit" className="btn-secondary w-full sm:w-auto">
              <Filter className="w-4 h-4 mr-2" />
              Filtruj
            </button>
          </div>
        </form>
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Brak projektów</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {params.search || params.status
              ? 'Nie znaleziono projektów spełniających kryteria wyszukiwania.'
              : 'Nie masz jeszcze żadnych projektów.'}
          </p>
          {isAdmin && !params.search && !params.status && (
            <Link href="/panel/projects/new" className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Utwórz pierwszy projekt
            </Link>
          )}
        </div>
      ) : (
        <div className="card dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="table-header">Numer</th>
                <th className="table-header">Tytuł</th>
                {isAdmin && <th className="table-header">Klient</th>}
                <th className="table-header">Zlecił</th>
                <th className="table-header">Status</th>
                <th className="table-header hidden sm:table-cell">Tickety</th>
                <th className="table-header hidden md:table-cell">Deadline</th>
                <th className="table-header hidden lg:table-cell">Aktualizacja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {projects.map((project: typeof projects[number]) => (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="table-cell">
                    <Link
                      href={`/panel/projects/${project.id}`}
                      className="font-mono text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700"
                    >
                      {project.number}
                    </Link>
                  </td>
                  <td className="table-cell">
                    <Link
                      href={`/panel/projects/${project.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-primary-600"
                    >
                      {project.title}
                    </Link>
                    {project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.tags.map((tag: typeof project.tags[number]) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="table-cell text-gray-600 dark:text-gray-400">
                      {project.clientAccount.name}
                    </td>
                  )}
                  <td className="table-cell text-gray-600 dark:text-gray-400">
                    {project.createdBy?.name || '-'}
                  </td>
                  <td className="table-cell">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${project.status.color}20`,
                        color: project.status.color,
                      }}
                    >
                      {project.status.name}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {project._count.tickets}
                  </td>
                  <td className="table-cell text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    {formatDate(project.deadline)}
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400 text-sm hidden lg:table-cell">
                    {formatDate(project.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
