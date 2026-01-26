import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft } from 'lucide-react'
import { UserForm } from '@/components/forms/user-form'

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const { id, userId } = await params

  const [client, user] = await Promise.all([
    prisma.clientAccount.findUnique({
      where: { id },
    }),
    prisma.user.findUnique({
      where: { id: userId },
    }),
  ])

  if (!client || !user) notFound()

  // Sprawdz czy uzytkownik nalezy do tego klienta
  if (user.clientAccountId !== id) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/panel/clients/${id}/users`}
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrot do uzytkownikow
      </Link>

      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Edytuj uzytkownika</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Klient: {client.name}</p>

        <UserForm
          clientAccountId={client.id}
          user={{
            id: user.id,
            email: user.email,
            name: user.name,
          }}
        />
      </div>
    </div>
  )
}
