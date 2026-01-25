import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Plus, Search, Filter, ArrowUpDown, FolderOpen } from 'lucide-react'
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
      _count: {
        select: { tickets: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projekty</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Zarządzaj wszystkimi projektami' : 'Twoje projekty'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/panel/projects/new" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nowy projekt
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={params.search}
                placeholder="Szukaj projektu..."
                className="input pl-10"
              />
            </div>
          </div>

          <select
            name="status"
            defaultValue={params.status || ''}
            className="input w-auto"
          >
            <option value="">Wszystkie statusy</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          {isAdmin && (
            <select
              name="client"
              defaultValue={params.client || ''}
              className="input w-auto"
            >
              <option value="">Wszyscy klienci</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          )}

          <button type="submit" className="btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filtruj
          </button>
        </form>
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Brak projektów</h3>
          <p className="text-gray-500 mb-4">
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
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-header">Numer</th>
                <th className="table-header">Tytuł</th>
                {isAdmin && <th className="table-header">Klient</th>}
                <th className="table-header">Status</th>
                <th className="table-header">Tickety</th>
                <th className="table-header">Deadline</th>
                <th className="table-header">Aktualizacja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <Link
                      href={`/panel/projects/${project.id}`}
                      className="font-mono text-sm text-primary-600 hover:text-primary-700"
                    >
                      {project.number}
                    </Link>
                  </td>
                  <td className="table-cell">
                    <Link
                      href={`/panel/projects/${project.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {project.title}
                    </Link>
                    {project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.tags.map((tag) => (
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
                    <td className="table-cell text-gray-600">
                      {project.clientAccount.name}
                    </td>
                  )}
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
                  <td className="table-cell text-gray-600">
                    {project._count.tickets}
                  </td>
                  <td className="table-cell text-gray-600">
                    {formatDate(project.deadline)}
                  </td>
                  <td className="table-cell text-gray-500 text-sm">
                    {formatDate(project.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
