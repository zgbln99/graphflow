import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Folder,
  MessageSquare,
  StickyNote,
  Edit,
  Link2,
  Lock,
  DollarSign,
  User,
  Image as ImageIcon,
  Mail,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils'
import { Timeline } from '@/components/project/timeline'
import { CommentsList } from '@/components/comments/comments-list'
import { NotesList } from '@/components/notes/notes-list'
import { FileLocationsList } from '@/components/project/file-locations'
import { ProjectStatusSelect } from '@/components/project/project-status-select'
import { AcceptProjectButton } from '@/components/project/accept-project-button'
import { ProjectFiles } from '@/components/projects/project-files'
import { LiveStatusBadge, ProjectDetailClient } from '@/components/project/project-detail-client'
import { DeleteProjectButton } from '@/components/projects/delete-project-button'
import { CorrectionsEmailForm } from '@/components/project/corrections-email-form'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const isAdmin = session.user.role === 'ADMIN'

  // TODO: Remove 'as any' after running migration and regenerating Prisma client
  // Migration file: sql/add_project_contacts.sql
  const project = await (prisma.project.findUnique as any)({
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
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      tags: true,
      timelineStages: {
        orderBy: { order: 'asc' },
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
      files: {
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: { name: true },
          },
        },
      },
      statusHistory: {
        orderBy: { changedAt: 'desc' },
        take: 10,
      },
      contacts: {
        select: { id: true, name: true, email: true },
      },
      emailLogs: isAdmin ? {
        orderBy: { sentAt: 'desc' },
        take: 4,
      } : undefined,
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

  // Sprawdź czy projekt oczekuje na akceptację
  const isPendingApproval = project.status.slug === 'oczekuje-na-akceptacje'

  return (
    <ProjectDetailClient
      projectId={project.id}
      initialStatus={{ id: project.status.id, name: project.status.name, color: project.status.color }}
    >
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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{project.number}</span>
          </div>
          {isAdmin && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{project.clientAccount.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin ? (
            <>
              {isPendingApproval && (
                <AcceptProjectButton projectId={project.id} />
              )}
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
              <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
            </>
          ) : (
            <LiveStatusBadge
              projectId={project.id}
              initialStatus={{ id: project.status.id, name: project.status.name, color: project.status.color }}
              size="lg"
            />
          )}
        </div>
      </div>

      {/* Pending approval banner for client */}
      {!isAdmin && isPendingApproval && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Projekt oczekuje na akceptację</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Otrzymasz powiadomienie email, gdy projekt zostanie zaakceptowany.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status card for client - prominent display */}
      {!isAdmin && !isPendingApproval && (
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status projektu</p>
              <LiveStatusBadge
                projectId={project.id}
                initialStatus={{ id: project.status.id, name: project.status.name, color: project.status.color }}
                size="lg"
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktualizacja</p>
              <p className="text-gray-900 dark:text-white font-medium">{formatRelativeTime(project.updatedAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag: { id: string; name: string; color: string }) => (
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
        {project.createdBy && (
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm">Zgłosił</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">{project.createdBy.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(project.createdAt)}</p>
          </div>
        )}

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

        {(project as any).preferredDeadline && !project.deadline && (
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Preferowany termin</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate((project as any).preferredDeadline)}
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
      </div>

      {/* Description */}
      {project.description && (
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Opis</h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      {/* Example links - visible for all */}
      {(project as any).exampleLinks && (
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Przykłady / Inspiracje</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{(project as any).exampleLinks}</p>
        </div>
      )}

      {/* Admin-only: Credentials and Budget */}
      {isAdmin && ((project as any).credentials || (project as any).budget) && (
        <div className="grid md:grid-cols-2 gap-4">
          {(project as any).credentials && (
            <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Hasła i dostępy</h2>
              </div>
              <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded">{(project as any).credentials}</pre>
            </div>
          )}
          {(project as any).budget && (
            <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Budżet</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{(project as any).budget}</p>
            </div>
          )}
        </div>
      )}

      {/* Project Files/Preview */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Podglądy i pliki</h2>
        </div>
        <ProjectFiles
          projectId={project.id}
          initialFiles={project.files || []}
          isAdmin={isAdmin}
        />
      </div>

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
            {/* Send corrections email */}
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Wyślij email z poprawkami</h2>
              </div>
              <div className="p-4">
                <CorrectionsEmailForm
                  projectId={project.id}
                  projectTitle={project.title}
                  filesCount={project.files?.length || 0}
                />
              </div>
            </div>

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
                  {project.statusHistory.map((history: { id: string; fromStatus: string | null; toStatus: string; changedAt: Date }) => (
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

            {/* Notification contacts */}
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Kontakty do powiadomień</h2>
              </div>
              {project.contacts.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Brak przypisanych kontaktów
                  <p className="text-xs mt-1">Powiadomienia będą wysyłane do twórcy projektu</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {project.contacts.map((contact: { id: string; name: string; email: string }) => (
                    <div key={contact.id} className="p-3 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{contact.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{contact.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email notifications history */}
            {project.emailLogs && (
              <div className="card dark:bg-gray-800 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">Historia powiadomień email</h2>
                </div>
                {project.emailLogs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Brak wysłanych powiadomień
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {project.emailLogs.map((log: { id: string; toName: string | null; toEmail: string; subject: string; status: string; sentAt: Date; error: string | null }) => (
                      <div key={log.id} className="p-3 text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {log.toName || log.toEmail}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs truncate" title={log.subject}>
                          {log.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            log.status === 'sent'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {log.status === 'sent' ? 'Wysłano' : 'Błąd'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(log.sentAt)}
                          </span>
                        </div>
                        {log.error && (
                          <p className="text-xs text-red-500 mt-1">{log.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </ProjectDetailClient>
  )
}
