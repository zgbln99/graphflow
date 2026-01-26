'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Cloud,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Unlink,
  Key,
} from 'lucide-react'

interface DropboxStatus {
  configured: boolean
  email: string | null
}

export default function DropboxSettingsPage() {
  const [status, setStatus] = useState<DropboxStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/dropbox')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken.trim()) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/settings/dropbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: accessToken.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setStatus({ configured: true, email: data.email })
      setAccessToken('')
      setSuccess('Połączono z Dropbox!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd połączenia')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Czy na pewno chcesz odłączyć Dropbox? Istniejące pliki pozostaną dostępne.')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/settings/dropbox', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setStatus({ configured: false, email: null })
      setSuccess('Odłączono od Dropbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd odłączania')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/panel/settings"
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Ustawienia
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integracja Dropbox</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Przechowuj pliki projektów w chmurze Dropbox
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="card dark:bg-gray-800 p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status card */}
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  status?.configured
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <Cloud
                  className={`w-6 h-6 ${
                    status?.configured
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Dropbox</h3>
                  {status?.configured ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Połączono
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3 h-3" />
                      Niepołączono
                    </span>
                  )}
                </div>
                {status?.email && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{status.email}</p>
                )}
              </div>
              {status?.configured && (
                <button
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="btn-secondary text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Odłącz
                </button>
              )}
            </div>
          </div>

          {/* Connect form */}
          {!status?.configured && (
            <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Połącz z Dropbox
              </h3>

              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                  Jak uzyskać Access Token:
                </h4>
                <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                  <li>
                    Przejdź do{' '}
                    <a
                      href="https://www.dropbox.com/developers/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-flex items-center gap-1"
                    >
                      Dropbox App Console
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Utwórz nową aplikację (Scoped access, Full Dropbox)</li>
                  <li>W zakładce &quot;Permissions&quot; włącz: files.content.write, files.content.read, sharing.write</li>
                  <li>W zakładce &quot;Settings&quot; wygeneruj Access Token</li>
                  <li>Skopiuj token i wklej poniżej</li>
                </ol>
              </div>

              <form onSubmit={handleConnect}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Access Token
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="sl.xxxxxxxxxxxxx..."
                      className="input pl-10"
                      disabled={saving}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving || !accessToken.trim()}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Łączenie...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 mr-2" />
                      Połącz z Dropbox
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Info about usage */}
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Jak to działa?
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                Po połączeniu z Dropbox, nowe pliki będą automatycznie przesyłane do chmury
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                Pliki są przechowywane w folderze /GraphFlow/[numer projektu]/
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                Istniejące pliki lokalne pozostają bez zmian
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                Jeśli Dropbox jest niedostępny, pliki będą zapisywane lokalnie
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
