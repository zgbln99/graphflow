import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MessageSquare,
  StickyNote,
  Mail,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  ticketStatusLabels,
  ticketStatusColors,
  priorityLabels,
  priorityColors,
} from '@/lib/utils'
import { CommentsList } from '@/components/comments/comments-list'
import { NotesList } from '@/components/notes/notes-list'
import { TicketStatusSelect } from '@/components/ticket/ticket-status-select'
import { TicketPrioritySelect } from '@/components/ticket/ticket-priority-select'

export default async function TicketDetailPage({
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
      clientAccount: {
        include: {
          users: {
            where: { isActive: true },
            select: { id: true, name: true, email: true },
          },
        },
      },
      project: {
        select: { id: true, number: true, title: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      comments: {
        where: isAdmin ? {} : { visibility: 'PUBLIC' },
        include: {
          author: {
            select: { id: true, name: true, role: true },
          },
          emailMessage: {
            select: { fromEmail: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      notes: isAdmin
        ? {
            orderBy: { createdAt: 'desc' },
          }
        : undefined,
      emailMessages: isAdmin
        ? {
            orderBy: { receivedAt: 'desc' },
            take: 10,
          }
        : undefined,
    },
  })

  if (!ticket) notFound()

  // Sprawdź dostęp klienta
  if (!isAdmin && ticket.clientAccountId !== session.user.clientAccountId) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/panel/tickets"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Tickety
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{ticket.title}</h1>
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{ticket.number}</span>
          </div>
          {isAdmin && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{ticket.clientAccount.name}</p>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <TicketStatusSelect
              ticketId={ticket.id}
              currentStatus={ticket.status}
            />
            <TicketPrioritySelect
              ticketId={ticket.id}
              currentPriority={ticket.priority}
            />
          </div>
        )}
      </div>

      {/* Status badges for client */}
      {!isAdmin && (
        <div className="flex items-center gap-2">
          <span className={`badge ${ticketStatusColors[ticket.status]}`}>
            {ticketStatusLabels[ticket.status]}
          </span>
          <span className={`badge ${priorityColors[ticket.priority]}`}>
            {priorityLabels[ticket.priority]}
          </span>
        </div>
      )}

      {/* Info cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <User className="w-4 h-4" />
            <span className="text-sm">Zgłosił</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white">{ticket.createdBy.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(ticket.createdAt)}</p>
        </div>

        {ticket.deadline && (
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Deadline</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-white">{formatDate(ticket.deadline)}</p>
            {ticket.deadline < new Date() && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                Po terminie!
              </p>
            )}
          </div>
        )}

        {ticket.project && (
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm">Projekt</span>
            </div>
            <Link
              href={`/panel/projects/${ticket.project.id}`}
              className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
            >
              {ticket.project.number}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{ticket.project.title}</p>
          </div>
        )}

        <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Ostatnia aktualizacja</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatRelativeTime(ticket.updatedAt)}
          </p>
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Opis</h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{ticket.description}</p>
        </div>
      )}

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Comments */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Komentarze</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({ticket.comments.length})
              </span>
            </div>
            <CommentsList
              comments={ticket.comments}
              ticketId={ticket.id}
              isAdmin={isAdmin}
              currentUserId={session.user.id}
            />
          </div>
        </div>

        {/* Right column - Admin only */}
        {isAdmin && (
          <div className="space-y-6">
            {/* Email thread */}
            {ticket.emailMessages && ticket.emailMessages.length > 0 && (
              <div className="card dark:bg-gray-800 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">Historia maili</h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                  {ticket.emailMessages.map((email) => (
                    <div key={email.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {email.fromName || email.fromEmail}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(email.receivedAt)}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 truncate">{email.subject}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Private notes */}
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Notatki prywatne</h2>
              </div>
              <NotesList notes={ticket.notes || []} ticketId={ticket.id} />
            </div>

            {/* Quick actions */}
            <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Szybkie akcje</h2>
              <div className="space-y-2">
                {!ticket.projectId && (
                  <Link
                    href={`/panel/projects/new?fromTicket=${ticket.id}&client=${ticket.clientAccountId}`}
                    className="btn-secondary w-full justify-center"
                  >
                    Utwórz projekt z tego ticketa
                  </Link>
                )}
                <Link
                  href={`/panel/tickets/${ticket.id}/edit`}
                  className="btn-secondary w-full justify-center"
                >
                  Edytuj ticket
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
