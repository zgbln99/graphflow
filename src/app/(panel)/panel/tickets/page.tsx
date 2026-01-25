import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Plus, Search, Filter, Ticket as TicketIcon } from 'lucide-react'
import { formatDate, ticketStatusLabels, ticketStatusColors, priorityLabels, priorityColors } from '@/lib/utils'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; client?: string; project?: string; priority?: string }>
}) {
  const session = await getSession()
  if (!session) return null

  const params = await searchParams
  const isAdmin = session.user.role === 'ADMIN'
  const clientAccountId = session.user.clientAccountId

  // Pobierz klientów i projekty (tylko admin)
  const [clients, projects] = isAdmin
    ? await Promise.all([
        prisma.clientAccount.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        }),
        prisma.project.findMany({
          orderBy: { title: 'asc' },
          select: { id: true, number: true, title: true },
        }),
      ])
    : [[], await prisma.project.findMany({
        where: { clientAccountId: clientAccountId! },
        orderBy: { title: 'asc' },
        select: { id: true, number: true, title: true },
      })]

  // Pobierz tickety
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(isAdmin
        ? params.client
          ? { clientAccountId: params.client }
          : {}
        : { clientAccountId: clientAccountId! }),
      ...(params.status ? { status: params.status as any } : {}),
      ...(params.priority ? { priority: params.priority as any } : {}),
      ...(params.project ? { projectId: params.project } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { number: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      clientAccount: true,
      project: {
        select: { number: true, title: true },
      },
      createdBy: {
        select: { name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const statusOptions = Object.entries(ticketStatusLabels)
  const priorityOptions = Object.entries(priorityLabels)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Tickety' : 'Moje zgłoszenia'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Zarządzaj wszystkimi zgłoszeniami' : 'Twoje zgłoszenia i komunikacja'}
          </p>
        </div>
        <Link href="/panel/tickets/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nowe zgłoszenie
        </Link>
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
                placeholder="Szukaj ticketa..."
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
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            name="priority"
            defaultValue={params.priority || ''}
            className="input w-auto"
          >
            <option value="">Wszystkie priorytety</option>
            {priorityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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

          {projects.length > 0 && (
            <select
              name="project"
              defaultValue={params.project || ''}
              className="input w-auto"
            >
              <option value="">Wszystkie projekty</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.number} - {project.title}
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

      {/* Tickets list */}
      {tickets.length === 0 ? (
        <div className="card p-12 text-center">
          <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Brak ticketów</h3>
          <p className="text-gray-500 mb-4">
            {params.search || params.status
              ? 'Nie znaleziono ticketów spełniających kryteria wyszukiwania.'
              : 'Nie masz jeszcze żadnych zgłoszeń.'}
          </p>
          {!params.search && !params.status && (
            <Link href="/panel/tickets/new" className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Utwórz pierwsze zgłoszenie
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
                <th className="table-header">Priorytet</th>
                <th className="table-header">Projekt</th>
                <th className="table-header">Deadline</th>
                <th className="table-header">Aktualizacja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <Link
                      href={`/panel/tickets/${ticket.id}`}
                      className="font-mono text-sm text-primary-600 hover:text-primary-700"
                    >
                      {ticket.number}
                    </Link>
                  </td>
                  <td className="table-cell">
                    <Link
                      href={`/panel/tickets/${ticket.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {ticket.title}
                    </Link>
                    <p className="text-sm text-gray-500">
                      Utworzony przez: {ticket.createdBy.name}
                    </p>
                  </td>
                  {isAdmin && (
                    <td className="table-cell text-gray-600">
                      {ticket.clientAccount.name}
                    </td>
                  )}
                  <td className="table-cell">
                    <span className={`badge ${ticketStatusColors[ticket.status]}`}>
                      {ticketStatusLabels[ticket.status]}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${priorityColors[ticket.priority]}`}>
                      {priorityLabels[ticket.priority]}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600">
                    {ticket.project ? (
                      <Link
                        href={`/panel/projects/${ticket.project.number}`}
                        className="text-sm link"
                      >
                        {ticket.project.number}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="table-cell text-gray-600">
                    {formatDate(ticket.deadline)}
                  </td>
                  <td className="table-cell text-gray-500 text-sm">
                    {formatDate(ticket.updatedAt)}
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
