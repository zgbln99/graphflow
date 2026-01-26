import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProjectForm } from '@/components/forms/project-form'
import { ClientProjectForm } from '@/components/forms/client-project-form'

export default async function NewProjectPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'

  // Dla admina - pełny formularz z wyborem klienta
  if (isAdmin) {
    const [clients, statuses, tags, templates] = await Promise.all([
      prisma.clientAccount.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          users: {
            where: { isActive: true },
            select: { id: true, name: true, email: true, isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
      prisma.projectStatus.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.projectTag.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.timelineTemplate.findMany({
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
      }),
    ])

    const defaultStatus = statuses.find((s) => s.isDefault) || statuses[0]

    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nowy projekt</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Utwórz nowy projekt dla klienta</p>
        </div>

        <ProjectForm
          clients={clients}
          statuses={statuses}
          tags={tags}
          templates={templates}
          defaultStatusId={defaultStatus?.id}
        />
      </div>
    )
  }

  // Dla klienta - uproszczony formularz zgłoszenia projektu
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nowy projekt</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Opisz czego potrzebujesz, a my zajmiemy się resztą
        </p>
      </div>

      <ClientProjectForm />
    </div>
  )
}
