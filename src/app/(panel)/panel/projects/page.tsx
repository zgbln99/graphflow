import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Plus, Search, Filter, FolderOpen, LayoutGrid } from 'lucide-react'
import { ProjectsListClient } from '@/components/projects/projects-list-client'

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
        <ProjectsListClient projects={projects} isAdmin={isAdmin} />
      )}
    </div>
  )
}
