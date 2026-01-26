import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  ArrowLeft,
  Edit,
  Plus,
  Users,
  FolderOpen,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DeleteClientButton } from '@/components/clients/delete-client-button'
import { UserActions } from '@/components/client/user-actions-dropdown'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const { id } = await params

  const client = await prisma.clientAccount.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { name: 'asc' },
      },
      projects: {
        include: {
          status: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!client) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/panel/clients"
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Klienci
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <span
              className={`badge ${
                client.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {client.isActive ? 'Aktywny' : 'Nieaktywny'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/panel/clients/${client.id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4 mr-2" />
            Edytuj
          </Link>
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </div>
      </div>

      {/* Contact info */}
      <div className="grid md:grid-cols-3 gap-4">
        {client.email && (
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </div>
            <a
              href={`mailto:${client.email}`}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              {client.email}
            </a>
          </div>
        )}
        {client.phone && (
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Phone className="w-4 h-4" />
              <span className="text-sm">Telefon</span>
            </div>
            <a
              href={`tel:${client.phone}`}
              className="font-medium text-gray-900"
            >
              {client.phone}
            </a>
          </div>
        )}
        {client.address && (
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Adres</span>
            </div>
            <p className="font-medium text-gray-900">{client.address}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Notatki</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Email domains */}
      {client.emailDomains && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Dozwolone domeny email</h2>
          <div className="flex flex-wrap gap-2">
            {client.emailDomains.split(',').map((domain: string) => (
              <span key={domain} className="badge bg-gray-100 text-gray-700">
                @{domain.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Użytkownicy</h2>
              <span className="text-sm text-gray-500">({client.users.length})</span>
            </div>
            <Link
              href={`/panel/clients/${client.id}/users/new`}
              className="text-sm link flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Dodaj
            </Link>
          </div>
          {client.users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Brak użytkowników
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {client.users.map((user: typeof client.users[number]) => (
                <div key={user.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.isActive
                        ? 'bg-primary-100 dark:bg-primary-900/50'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <span className={`text-sm font-medium ${
                        user.isActive
                          ? 'text-primary-700 dark:text-primary-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                        {!user.isActive && (
                          <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            Nieaktywny
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <UserActions userId={user.id} clientId={id} isActive={user.isActive} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent projects */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Projekty</h2>
            </div>
            <Link
              href={`/panel/projects/new?client=${client.id}`}
              className="text-sm link flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Nowy
            </Link>
          </div>
          {client.projects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Brak projektów</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {client.projects.map((project: typeof client.projects[number]) => (
                <Link
                  key={project.id}
                  href={`/panel/projects/${project.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-gray-500 mr-2">
                        {project.number}
                      </span>
                      <span className="font-medium text-gray-900">
                        {project.title}
                      </span>
                    </div>
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
                </Link>
              ))}
              <Link
                href={`/panel/projects?client=${client.id}`}
                className="block p-4 text-center text-sm link"
              >
                Zobacz wszystkie projekty →
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
