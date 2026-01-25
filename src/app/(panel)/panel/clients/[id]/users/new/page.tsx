import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft } from 'lucide-react'
import { UserForm } from '@/components/forms/user-form'

export default async function NewClientUserPage({
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
  })

  if (!client) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/panel/clients/${id}/users`}
        className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do użytkowników
      </Link>

      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Nowy użytkownik</h1>
        <p className="text-gray-600 mb-6">Klient: {client.name}</p>

        <UserForm clientAccountId={client.id} />
      </div>
    </div>
  )
}
