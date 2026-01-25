import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProjectForm } from '@/components/forms/project-form'

export default async function NewProjectPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel/projects')
  }

  // Pobierz dane do formularza
  const [clients, statuses, tags, templates] = await Promise.all([
    prisma.clientAccount.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
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
        <h1 className="text-2xl font-bold text-gray-900">Nowy projekt</h1>
        <p className="text-gray-600 mt-1">Utwórz nowy projekt dla klienta</p>
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
