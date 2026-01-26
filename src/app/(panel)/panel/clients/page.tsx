import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Plus, Search, Building2, Users, FolderOpen, Ticket } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const params = await searchParams

  const clients = await prisma.clientAccount.findMany({
    where: params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {},
    include: {
      _count: {
        select: {
          users: true,
          projects: true,
          tickets: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Klienci</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Zarządzaj kontami klientów</p>
        </div>
        <Link href="/panel/clients/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nowy klient
        </Link>
      </div>

      {/* Search */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
        <form className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={params.search}
                placeholder="Szukaj klienta..."
                className="input pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          <button type="submit" className="btn-secondary">
            Szukaj
          </button>
        </form>
      </div>

      {/* Clients list */}
      {clients.length === 0 ? (
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Brak klientów</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {params.search
              ? 'Nie znaleziono klientów.'
              : 'Dodaj pierwszego klienta, aby rozpocząć.'}
          </p>
          {!params.search && (
            <Link href="/panel/clients/new" className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj klienta
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client: typeof clients[number]) => (
            <Link
              key={client.id}
              href={`/panel/clients/${client.id}`}
              className="card dark:bg-gray-800 dark:border-gray-700 p-5 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <span
                  className={`badge ${
                    client.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {client.isActive ? 'Aktywny' : 'Nieaktywny'}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{client.name}</h3>
              {client.email && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{client.email}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {client._count.users}
                </span>
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  {client._count.projects}
                </span>
                <span className="flex items-center gap-1">
                  <Ticket className="w-4 h-4" />
                  {client._count.tickets}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
