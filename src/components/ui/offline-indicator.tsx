'use client'

import { useState, useEffect, useCallback } from 'react'
import { WifiOff, Wifi, RefreshCw, Download, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// useOnlineStatus hook
// ============================================

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (!navigator.onLine) {
        setWasOffline(true)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline }
}

// ============================================
// OfflineIndicator Component
// ============================================

interface OfflineIndicatorProps {
  className?: string
  showOnlineMessage?: boolean
}

export function OfflineIndicator({
  className,
  showOnlineMessage = true,
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus()
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true)
      const timeout = setTimeout(() => {
        setShowReconnected(false)
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [isOnline, wasOffline])

  if (isOnline && !showReconnected) return null

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up',
        className
      )}
    >
      {!isOnline ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500 text-white rounded-lg shadow-lg">
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Brak połączenia</p>
            <p className="text-sm text-red-100">
              Pracujesz w trybie offline
            </p>
          </div>
        </div>
      ) : showOnlineMessage && showReconnected ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white rounded-lg shadow-lg">
          <Wifi className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Połączono</p>
            <p className="text-sm text-green-100">
              Synchronizacja danych...
            </p>
          </div>
          <button
            onClick={() => setShowReconnected(false)}
            className="p-1 hover:bg-green-600 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ============================================
// Minimal Offline Badge (for header)
// ============================================

export function OfflineBadge({ className }: { className?: string }) {
  const { isOnline } = useOnlineStatus()

  if (isOnline) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full',
        className
      )}
    >
      <WifiOff className="w-3 h-3" />
      Offline
    </span>
  )
}

// ============================================
// PWA Install Prompt
// ============================================

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false

    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    setInstallPrompt(null)
    return outcome === 'accepted'
  }, [installPrompt])

  return {
    canInstall: !!installPrompt,
    isInstalled,
    promptInstall,
  }
}

// ============================================
// PWA Install Banner
// ============================================

interface InstallBannerProps {
  className?: string
  onDismiss?: () => void
}

export function InstallBanner({ className, onDismiss }: InstallBannerProps) {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt()
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
    onDismiss?.()
  }

  const handleInstall = async () => {
    const installed = await promptInstall()
    if (installed) {
      handleDismiss()
    }
  }

  if (!canInstall || isInstalled || isDismissed) return null

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up',
        className
      )}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Zainstaluj GraphFlow
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Dodaj do ekranu głównego, aby uzyskać szybki dostęp i działać offline.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Zainstaluj
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Nie teraz
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Service Worker Update Prompt
// ============================================

export function useServiceWorker() {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered')
          setRegistration(reg)

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true)
                }
              })
            }
          })
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err)
        })

      // Listen for controller change (when update is activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [])

  const updateServiceWorker = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [registration])

  return {
    hasUpdate,
    updateServiceWorker,
  }
}

// ============================================
// Update Available Banner
// ============================================

export function UpdateBanner() {
  const { hasUpdate, updateServiceWorker } = useServiceWorker()

  if (!hasUpdate) return null

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-down">
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-500 text-white rounded-lg shadow-lg">
        <RefreshCw className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">Dostępna aktualizacja</p>
          <p className="text-sm text-blue-100">
            Odśwież, aby zobaczyć zmiany
          </p>
        </div>
        <button
          onClick={updateServiceWorker}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded font-medium text-sm transition-colors"
        >
          Odśwież
        </button>
      </div>
    </div>
  )
}

export default OfflineIndicator
