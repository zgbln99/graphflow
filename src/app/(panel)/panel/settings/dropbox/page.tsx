'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

interface DropboxStatus {
  connected: boolean
  email: string | null
  needsReconnect: boolean
  oauthConfigured: boolean
  connectedAt: string | null
}

export default function DropboxSettingsPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<DropboxStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)

  // Handle OAuth callback messages
  useEffect(() => {
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (successParam === 'connected') {
      setSuccess('Pomyslnie polaczono z Dropbox!')
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        'unauthorized': 'Brak uprawnien do wykonania tej operacji',
        'missing_code': 'Brak kodu autoryzacji',
        'invalid_state': 'Nieprawidlowy stan autoryzacji (CSRF)',
        'exchange_failed': 'Blad wymiany tokenu',
        'access_denied': 'Dostepcdo Dropbox zostal odrzucony',
      }
      setError(errorMessages[errorParam] || errorDescription || `Blad: ${errorParam}`)
    }

    // Clear URL params
    if (successParam || errorParam) {
      window.history.replaceState({}, '', '/panel/settings/dropbox')
    }
  }, [searchParams])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/dropbox')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad ladowania')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleOAuthConnect = () => {
    // Redirect to OAuth connect endpoint
    window.location.href = '/api/dropbox/connect'
  }

  const handleManualConnect = async (e: React.FormEvent) => {
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

      setStatus({
        connected: true,
        email: data.email,
        needsReconnect: !data.hasRefreshToken,
        oauthConfigured: status?.oauthConfigured || false,
        connectedAt: new Date().toISOString(),
      })
      setAccessToken('')
      setShowManualEntry(false)
      setSuccess('Polaczono z Dropbox!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad polaczenia')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Czy na pewno chcesz odlaczyc Dropbox? Istniejace pliki pozostana dostepne.')) {
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

      setStatus({
        connected: false,
        email: null,
        needsReconnect: false,
        oauthConfigured: status?.oauthConfigured || false,
        connectedAt: null,
      })
      setSuccess('Odlaczono od Dropbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad odlaczania')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
          Przechowuj pliki projektow w chmurze Dropbox
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
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
                  status?.connected
                    ? status?.needsReconnect
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <Cloud
                  className={`w-6 h-6 ${
                    status?.connected
                      ? status?.needsReconnect
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Dropbox</h3>
                  {status?.connected ? (
                    status?.needsReconnect ? (
                      <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        Wymaga ponownego polaczenia
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Polaczono
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3 h-3" />
                      Niepolaczono
                    </span>
                  )}
                </div>
                {status?.email && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{status.email}</p>
                )}
                {status?.connectedAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Polaczono: {formatDate(status.connectedAt)}
                  </p>
                )}
              </div>
              {status?.connected && (
                <div className="flex gap-2">
                  {status?.needsReconnect && status?.oauthConfigured && (
                    <button
                      onClick={handleOAuthConnect}
                      disabled={saving}
                      className="btn-secondary text-yellow-600 hover:text-yellow-700 border-yellow-200 hover:border-yellow-300"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Polacz ponownie
                    </button>
                  )}
                  <button
                    onClick={handleDisconnect}
                    disabled={saving}
                    className="btn-secondary text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Odlacz
                  </button>
                </div>
              )}
            </div>

            {/* Warning for legacy connection */}
            {status?.connected && status?.needsReconnect && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Token moze wygasnac</p>
                    <p className="mt-1">
                      Twoje polaczenie uzywa starego tokenu, ktory moze wygasnac.
                      {status?.oauthConfigured ? (
                        <> Kliknij &quot;Polacz ponownie&quot; aby uzyskac token z automatycznym odswiezaniem.</>
                      ) : (
                        <> Skonfiguruj OAuth w zmiennych srodowiskowych dla automatycznego odswiezania tokenow.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connect options */}
          {!status?.connected && (
            <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Polacz z Dropbox
              </h3>

              {/* OAuth Connect (recommended) */}
              {status?.oauthConfigured && (
                <div className="mb-6">
                  <button
                    onClick={handleOAuthConnect}
                    disabled={saving}
                    className="btn btn-primary w-full justify-center"
                  >
                    <Cloud className="w-5 h-5 mr-2" />
                    Polacz przez Dropbox (zalecane)
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                    Automatycznie odswiezany token - nie wymaga recznej konfiguracji
                  </p>
                </div>
              )}

              {/* Divider */}
              {status?.oauthConfigured && (
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">lub</span>
                  </div>
                </div>
              )}

              {/* Manual token entry */}
              {!status?.oauthConfigured || showManualEntry ? (
                <div>
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Jak uzyskac Access Token:
                    </h4>
                    <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                      <li>
                        Przejdz do{' '}
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
                      <li>Utworz nowa aplikacje (Scoped access, Full Dropbox)</li>
                      <li>W zakladce &quot;Permissions&quot; wlacz: files.content.write, files.content.read, sharing.write</li>
                      <li>W zakladce &quot;Settings&quot; wygeneruj Access Token</li>
                      <li>Skopiuj token i wklej ponizej</li>
                    </ol>
                    {!status?.oauthConfigured && (
                      <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-400 text-xs">
                        <strong>Uwaga:</strong> Token wygenerowany recznie moze wygasnac.
                        Dla trwalego polaczenia skonfiguruj zmienne srodowiskowe OAuth.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleManualConnect}>
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
                      className="btn btn-secondary"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Laczenie...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Polacz z tokenem
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Lub wprowadz token recznie...
                </button>
              )}
            </div>
          )}

          {/* OAuth not configured warning */}
          {!status?.oauthConfigured && (
            <div className="card dark:bg-gray-800 dark:border-gray-700 p-6 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    OAuth nie skonfigurowany
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Dla automatycznego odswiezania tokenow skonfiguruj zmienne srodowiskowe:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1 font-mono">
                    <li>DROPBOX_APP_KEY=your_app_key</li>
                    <li>DROPBOX_APP_SECRET=your_app_secret</li>
                    <li>DROPBOX_REDIRECT_URI=https://twoja-domena.pl/api/dropbox/callback</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info about usage */}
          <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Jak to dziala?
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Po polaczeniu z Dropbox, nowe pliki beda automatycznie przesylane do chmury
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Pliki sa przechowywane w folderze /GraphFlow/[numer projektu]/
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Token jest automatycznie odswiezany (gdy uzywasz OAuth)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                Jesli Dropbox jest niedostepny, pliki beda zapisywane lokalnie
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
