import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Folder,
  Copy,
  ExternalLink,
  Plus,
  MessageSquare,
  StickyNote,
  Ticket,
  Edit,
} from 'lucide-react'
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils'
import { Timeline } from '@/components/project/timeline'
import { CommentsList } from '@/components/comments/comments-list'
import { NotesList } from '@/components/notes/notes-list'
import { FileLocationsList } from '@/components/project/file-locations'
import { ProjectStatusSelect } from '@/components/project/project-status-select'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const isAdmin = session.user.role === 'ADMIN'

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      status: true,
      clientAccount: {
        include: {
          users: {
            where: { isActive: true },
            select: { id: true, name: true, email: true },
          },
        },
      },
      tags: true,
      timelineStages: {
        orderBy: { order: 'asc' },
      },
      tickets: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          createdBy: {
            select: { name: true },
          },
        },
      },
      comments: {
        where: isAdmin ? {} : { visibility: 'PUBLIC' },
        include: {
          author: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      notes: isAdmin ? {
        orderBy: { createdAt: 'desc' },
      } : undefined,
      fileLocations: isAdmin ? {
        orderBy: { createdAt: 'desc' },
      } : undefined,
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!project) notFound()

  // Sprawdź dostęp klienta
  if (!isAdmin && project.clientAccountId !== session.user.clientAccountId) {
    notFound()
  }

  // Pobierz statusy dla dropdown
  const statuses = await prisma.projectStatus.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/panel/projects"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Projekty
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{project.number}</span>
          </div>
          {isAdmin && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{project.clientAccount.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <ProjectStatusSelect
                projectId={project.id}
                currentStatusId={project.statusId}
                statuses={statuses}
              />
              <Link
                href={`/panel/projects/${project.id}/edit`}
                className="btn-secondary"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edytuj
              </Link>
            </>
          ) : (
            <div
              className="badge"
              style={{
                backgroundColor: `${project.status.color}20`,
                color: project.status.color,
              }}
            >
              {project.status.name}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span
              key={tag.id}
              className="badge"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Info cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {project.deadline && (
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Deadline</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(project.deadline)}
            </p>
          </div>
        )}

        <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Ostatnia aktualizacja</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatRelativeTime(project.updatedAt)}
          </p>
        </div>

        <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Ticket className="w-4 h-4" />
            <span className="text-sm">Tickety</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white">{project.tickets.length}</p>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Opis</h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Timeline</h2>
              {isAdmin && (
                <Link
                  href={`/panel/projects/${project.id}/timeline`}
                  className="text-sm link"
                >
                  Edytuj timeline
                </Link>
              )}
            </div>
            <div className="p-4">
              <Timeline stages={project.timelineStages} isAdmin={isAdmin} />
            </div>
          </div>

          {/* Tickets */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Powiązane tickety</h2>
              <Link
                href={`/panel/tickets/new?projectId=${project.id}`}
                className="text-sm link flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Nowy ticket
              </Link>
            </div>
            {project.tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Brak powiązanych ticketów
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {project.tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/panel/tickets/${ticket.id}`}
                    className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 mr-2">
                          {ticket.number}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {ticket.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeTime(ticket.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
                {project.tickets.length >= 5 && (
                  <Link
                    href={`/panel/tickets?project=${project.id}`}
                    className="block p-4 text-center text-sm link"
                  >
                    Zobacz wszystkie tickety →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Komentarze</h2>
            </div>
            <CommentsList
              comments={project.comments}
              projectId={project.id}
              isAdmin={isAdmin}
              currentUserId={session.user.id}
            />
          </div>
        </div>

        {/* Right column - Admin only */}
        {isAdmin && (
          <div className="space-y-6">
            {/* File locations */}
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Folder className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Lokalizacje plików</h2>
              </div>
              <FileLocationsList
                projectId={project.id}
                locations={project.fileLocations || []}
                localPath={project.localPath}
                dropboxPath={project.dropboxPath}
                dropboxLink={project.dropboxLink}
              />
            </div>

            {/* Private notes */}
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Notatki prywatne</h2>
              </div>
              <NotesList
                notes={project.notes || []}
                projectId={project.id}
              />
            </div>

            {/* Status history */}
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">Historia statusów</h2>
              </div>
              {project.statusHistory.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Brak historii
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {project.statusHistory.map((history) => (
                    <div key={history.id} className="p-3 text-sm">
                      <p className="text-gray-900 dark:text-white">
                        {history.fromStatus && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {history.fromStatus} →{' '}
                          </span>
                        )}
                        <span className="font-medium">{history.toStatus}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(history.changedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
