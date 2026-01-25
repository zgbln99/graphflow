import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft } from 'lucide-react'
import { ProjectForm } from '@/components/forms/project-form'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const { id } = await params

  const [project, clients, statuses, tags, templates] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        tags: { select: { id: true } },
      },
    }),
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
      include: { stages: { select: { name: true, order: true }, orderBy: { order: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!project) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/panel/projects/${id}`}
        className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do projektu
      </Link>

      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edytuj projekt</h1>
        <ProjectForm
          project={project}
          clients={clients}
          statuses={statuses}
          tags={tags}
          templates={templates}
        />
      </div>
    </div>
  )
}
