import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft } from 'lucide-react'
import { TicketForm } from '@/components/forms/ticket-form'

export default async function EditTicketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const isAdmin = session.user.role === 'ADMIN'

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      project: true,
    },
  })

  if (!ticket) notFound()

  // Sprawdź dostęp
  if (!isAdmin && ticket.clientAccountId !== session.user.clientAccountId) {
    notFound()
  }

  // Pobierz projekty i klientów dla dropdown
  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      where: isAdmin
        ? {}
        : { clientAccountId: session.user.clientAccountId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        number: true,
        title: true,
        clientAccountId: true,
      },
    }),
    isAdmin
      ? prisma.clientAccount.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        })
      : [],
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/panel/tickets/${id}`}
        className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do ticketu
      </Link>

      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edytuj ticket</h1>
        <TicketForm
          ticket={ticket}
          projects={projects}
          clients={clients}
          isAdmin={isAdmin}
          userClientAccountId={session.user.clientAccountId}
        />
      </div>
    </div>
  )
}
