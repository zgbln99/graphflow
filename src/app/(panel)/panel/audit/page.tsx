import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import {
  Clock,
  User,
  FileEdit,
  Plus,
  Trash2,
  RefreshCw,
  MessageSquare,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { AuditFilters } from '@/components/audit/audit-filters'

const ITEMS_PER_PAGE = 50

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string; type?: string; action?: string }
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') redirect('/panel')

  const page = parseInt(searchParams.page || '1')
  const entityType = searchParams.type
  const action = searchParams.action

  const where = {
    ...(entityType && { entityType }),
    ...(action && { action: action as any }),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.auditLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const actionIcons: Record<string, React.ReactNode> = {
    CREATE: <Plus className="w-4 h-4 text-green-500" />,
    UPDATE: <FileEdit className="w-4 h-4 text-blue-500" />,
    DELETE: <Trash2 className="w-4 h-4 text-red-500" />,
    STATUS_CHANGE: <RefreshCw className="w-4 h-4 text-purple-500" />,
    COMMENT_ADD: <MessageSquare className="w-4 h-4 text-cyan-500" />,
    LOGIN: <LogIn className="w-4 h-4 text-emerald-500" />,
    LOGOUT: <LogOut className="w-4 h-4 text-gray-500" />,
  }

  const actionLabels: Record<string, string> = {
    CREATE: 'Utworzenie',
    UPDATE: 'Edycja',
    DELETE: 'Usunięcie',
    STATUS_CHANGE: 'Zmiana statusu',
    COMMENT_ADD: 'Komentarz',
    LOGIN: 'Logowanie',
    LOGOUT: 'Wylogowanie',
  }

  const entityLabels: Record<string, string> = {
    project: 'Projekt',
    ticket: 'Ticket',
    client: 'Klient',
    user: 'Użytkownik',
    comment: 'Komentarz',
    settings: 'Ustawienia',
  }

  function getEntityLink(entityType: string, entityId: string) {
    switch (entityType) {
      case 'project':
        return `/panel/projects/${entityId}`
      case 'ticket':
        return `/panel/tickets/${entityId}`
      case 'client':
        return `/panel/clients/${entityId}`
      case 'user':
        return `/panel/settings/users/${entityId}`
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historia zmian</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Pełna historia wszystkich operacji w systemie
          </p>
        </div>
      </div>

      {/* Filters */}
      <AuditFilters />

      {/* Logs table */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="table-header">Data</th>
                <th className="table-header">Użytkownik</th>
                <th className="table-header">Akcja</th>
                <th className="table-header">Obiekt</th>
                <th className="table-header">Opis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Brak wpisów w historii
                  </td>
                </tr>
              ) : (
                logs.map((log: typeof logs[number]) => {
                  const entityLink = getEntityLink(log.entityType, log.entityId)
                  const changes = log.changes ? JSON.parse(log.changes) : null

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="table-cell whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-gray-900 dark:text-white">
                              {new Date(log.createdAt).toLocaleDateString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">
                              {new Date(log.createdAt).toLocaleTimeString('pl-PL', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {log.userName || 'System'}
                            </div>
                            {log.userEmail && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {log.userEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm">
                          {actionIcons[log.action]}
                          <span className="text-gray-700 dark:text-gray-300">
                            {actionLabels[log.action] || log.action}
                          </span>
                        </span>
                      </td>
                      <td className="table-cell">
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                            {entityLabels[log.entityType] || log.entityType}
                          </span>
                          {entityLink ? (
                            <Link
                              href={entityLink}
                              className="block font-medium text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              {log.entityName || log.entityId}
                            </Link>
                          ) : (
                            <div className="font-medium text-gray-900 dark:text-white">
                              {log.entityName || log.entityId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          {log.description}
                          {changes && Object.keys(changes).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">
                                Pokaż szczegóły
                              </summary>
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs space-y-1">
                                {Object.entries(changes).map(([field, change]: [string, any]) => (
                                  <div key={field}>
                                    <span className="font-medium">{field}:</span>{' '}
                                    <span className="text-red-500 line-through">
                                      {String(change.from || '(puste)')}
                                    </span>{' '}
                                    <span className="text-green-500">
                                      {String(change.to || '(puste)')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Strona {page} z {totalPages} ({total} wpisów)
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/panel/audit?page=${page - 1}${entityType ? `&type=${entityType}` : ''}${action ? `&action=${action}` : ''}`}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/panel/audit?page=${page + 1}${entityType ? `&type=${entityType}` : ''}${action ? `&action=${action}` : ''}`}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
