import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ClientForm } from '@/components/forms/client-form'

export default async function EditClientPage({
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edytuj klienta</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{client.name}</p>
      </div>

      <ClientForm client={client} />
    </div>
  )
}
