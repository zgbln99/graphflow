import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TicketForm } from '@/components/forms/ticket-form'

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await searchParams
  const isAdmin = session.user.role === 'ADMIN'

  // Pobierz dane do formularza
  const [clients, projects] = await Promise.all([
    isAdmin
      ? prisma.clientAccount.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        })
      : [],
    isAdmin
      ? prisma.project.findMany({
          orderBy: { title: 'asc' },
          select: { id: true, number: true, title: true, clientAccountId: true },
        })
      : prisma.project.findMany({
          where: { clientAccountId: session.user.clientAccountId! },
          orderBy: { title: 'asc' },
          select: { id: true, number: true, title: true, clientAccountId: true },
        }),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nowe zgłoszenie</h1>
        <p className="text-gray-600 mt-1">
          {isAdmin ? 'Utwórz nowy ticket dla klienta' : 'Zgłoś nowe zadanie lub problem'}
        </p>
      </div>

      <TicketForm
        clients={clients}
        projects={projects}
        defaultProjectId={params.projectId}
        userClientAccountId={session.user.clientAccountId}
        isAdmin={isAdmin}
      />
    </div>
  )
}
