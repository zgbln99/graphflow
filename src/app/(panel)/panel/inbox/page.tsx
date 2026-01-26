import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Mail, AlertTriangle, CheckCircle, Clock, Link as LinkIcon } from 'lucide-react'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import { MatchEmailForm } from '@/components/inbox/match-email-form'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: 'unmatched' | 'matched' | 'all' }>
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const params = await searchParams
  const filter = params.filter || 'unmatched'

  const emails = await prisma.emailMessage.findMany({
    where:
      filter === 'unmatched'
        ? { isMatched: false }
        : filter === 'matched'
        ? { isMatched: true }
        : {},
    include: {
      ticket: {
        select: { id: true, number: true, title: true },
      },
    },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  })

  // Pobierz tickety do przypisania
  const tickets = await prisma.ticket.findMany({
    where: {
      status: { notIn: ['RESOLVED', 'CLOSED'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, number: true, title: true },
  })

  const unmatchedCount = await prisma.emailMessage.count({
    where: { isMatched: false },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skrzynka</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Przychodzące wiadomości email i ich powiązania z ticketami
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Link
          href="/panel/inbox?filter=unmatched"
          className={`btn-sm ${
            filter === 'unmatched' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Nieprzypisane ({unmatchedCount})
        </Link>
        <Link
          href="/panel/inbox?filter=matched"
          className={`btn-sm ${
            filter === 'matched' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Przypisane
        </Link>
        <Link
          href="/panel/inbox?filter=all"
          className={`btn-sm ${
            filter === 'all' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          Wszystkie
        </Link>
      </div>

      {/* Emails list */}
      {emails.length === 0 ? (
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Brak wiadomości</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'unmatched'
              ? 'Wszystkie wiadomości zostały przypisane do ticketów.'
              : 'Brak wiadomości do wyświetlenia.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {emails.map((email: typeof emails[number]) => (
            <div key={email.id} className="card dark:bg-gray-800 dark:border-gray-700 p-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    email.isMatched
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {email.fromName || email.fromEmail}
                    </span>
                    {email.fromName && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        &lt;{email.fromEmail}&gt;
                      </span>
                    )}
                    <span className="text-sm text-gray-400">
                      {formatRelativeTime(email.receivedAt)}
                    </span>
                  </div>

                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">{email.subject}</p>

                  {email.bodyText && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {email.bodyText.slice(0, 200)}...
                    </p>
                  )}

                  {/* Status / Ticket link */}
                  <div className="mt-3 flex items-center gap-4">
                    {email.isMatched && email.ticket ? (
                      <Link
                        href={`/panel/tickets/${email.ticket.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Przypisano do: {email.ticket.number} - {email.ticket.title}
                      </Link>
                    ) : (
                      <MatchEmailForm emailId={email.id} tickets={tickets} />
                    )}

                    {email.matchedBy && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Dopasowano przez: {email.matchedBy}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(email.receivedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
