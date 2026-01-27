'use client'

import { WifiOff, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <WifiOff className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>

          {/* Animated dots */}
          <div className="flex justify-center gap-2">
            <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Brak połączenia z internetem
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Wygląda na to, że jesteś offline. Sprawdź swoje połączenie z internetem i spróbuj ponownie.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Spróbuj ponownie
          </button>

          <Link
            href="/panel"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            Strona główna
          </Link>
        </div>

        {/* Info */}
        <div className="mt-12 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
            Tryb offline
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Niektóre funkcje mogą być nadal dostępne w trybie offline. Zmiany zostaną zsynchronizowane po przywróceniu połączenia.
          </p>
        </div>
      </div>
    </div>
  )
}
