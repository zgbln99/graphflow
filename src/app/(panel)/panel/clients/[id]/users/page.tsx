import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft, Plus, Mail, User, MoreVertical, UserCheck, UserX } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { UserActions } from '@/components/client/user-actions-dropdown'

export default async function ClientUsersPage({
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
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!client) notFound()

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/panel/clients/${id}`}
        className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do klienta
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Użytkownicy</h1>
          <p className="text-gray-600 mt-1">{client.name}</p>
        </div>
        <Link href={`/panel/clients/${id}/users/new`} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Dodaj użytkownika
        </Link>
      </div>

      <div className="card">
        {client.users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Brak użytkowników</p>
            <Link
              href={`/panel/clients/${id}/users/new`}
              className="link mt-2 inline-block"
            >
              Dodaj pierwszego użytkownika
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {client.users.map((user: typeof client.users[number]) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.isActive
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{user.name}</span>
                      {!user.isActive && (
                        <span className="badge bg-gray-100 text-gray-600">
                          Nieaktywny
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">
                    Dodany: {formatDate(user.createdAt)}
                  </span>
                  <UserActions userId={user.id} clientId={id} isActive={user.isActive} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
