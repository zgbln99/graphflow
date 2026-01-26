import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { KanbanBoard } from '@/components/projects/kanban-board'
import Link from 'next/link'
import { List, Plus } from 'lucide-react'

export default async function KanbanPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin) redirect('/panel/projects')

  // Get all statuses
  const statuses = await prisma.projectStatus.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })

  // Get all active projects with their data
  const projects = await prisma.project.findMany({
    where: {
      status: {
        slug: { not: 'zakonczone' }
      }
    },
    include: {
      status: true,
      clientAccount: {
        select: { id: true, name: true },
      },
      tags: true,
      _count: {
        select: { tickets: true, files: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Get clients for filter
  const clients = await prisma.clientAccount.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Przeciągnij projekty między statusami
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/panel/projects" className="btn-secondary">
            <List className="w-4 h-4 mr-2" />
            Widok listy
          </Link>
          <Link href="/panel/projects/new" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nowy projekt
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        statuses={statuses}
        projects={projects}
        clients={clients}
      />
    </div>
  )
}
