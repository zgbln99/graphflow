import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft, Plus } from 'lucide-react'
import { TimelineEditor } from '@/components/project/timeline-editor'

export default async function EditTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      timelineStages: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!project) notFound()

  const templates = await prisma.timelineTemplate.findMany({
    include: {
      stages: {
        orderBy: { order: 'asc' },
      },
    },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/panel/projects/${id}`}
        className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do projektu
      </Link>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edycja timeline</h1>
            <p className="text-gray-600 mt-1">{project.title}</p>
          </div>
        </div>

        <TimelineEditor
          projectId={project.id}
          stages={project.timelineStages}
          templates={templates}
        />
      </div>
    </div>
  )
}
