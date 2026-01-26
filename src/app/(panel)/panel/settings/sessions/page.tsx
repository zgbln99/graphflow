'use client'

import { useState, useEffect, useCallback } from 'react'
import { Monitor, Trash2, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'

interface Session {
  id: string
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [terminating, setTerminating] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSessions(data.sessions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie pobrac sesji')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const terminateSession = async (sessionId: string) => {
    setTerminating(sessionId)
    try {
      const res = await fetch(`/api/sessions?id=${sessionId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie zakonczyc sesji')
    } finally {
      setTerminating(null)
    }
  }

  const terminateAllOtherSessions = async () => {
    if (!confirm('Czy na pewno chcesz zakonczyc wszystkie inne sesje?')) return

    setTerminating('all')
    try {
      const res = await fetch('/api/sessions?all=true', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSessions((prev) => prev.filter((s) => s.isCurrent))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie zakonczyc sesji')
    } finally {
      setTerminating(null)
    }
  }

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aktywne sesje</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Zarzadzaj swoimi aktywnymi sesjami logowania
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="card dark:bg-gray-800 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              {sessions.length} {sessions.length === 1 ? 'aktywna sesja' : 'aktywnych sesji'}
            </span>
          </div>
          {otherSessionsCount > 0 && (
            <button
              onClick={terminateAllOtherSessions}
              disabled={terminating !== null}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
            >
              {terminating === 'all' ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kończenie...
                </span>
              ) : (
                `Zakończ wszystkie inne (${otherSessionsCount})`
              )}
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Brak aktywnych sesji
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      session.isCurrent
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <Monitor
                      className={`w-5 h-5 ${
                        session.isCurrent
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Sesja
                      </span>
                      {session.isCurrent && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Obecna
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Utworzona {formatRelativeTime(new Date(session.createdAt))}
                      {' • '}
                      Wygasa {formatDate(new Date(session.expiresAt))}
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => terminateSession(session.id)}
                    disabled={terminating !== null}
                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Zakończ sesję"
                  >
                    {terminating === session.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Jesli widzisz nieznane sesje, zalecamy zmiane hasla i zakonczenie wszystkich innych sesji.
      </p>
    </div>
  )
}
