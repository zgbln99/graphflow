'use client'

import { useEffect } from 'react'

/**
 * ChunkErrorHandler - Handles Next.js chunk loading errors that occur after deployments
 *
 * When a new deployment happens, old JS chunks are replaced with new ones (different hashes).
 * Users who had the page open still have JavaScript referencing old chunk filenames.
 * This handler detects these 404 chunk errors and automatically reloads the page.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const RELOAD_KEY = 'chunk-error-reload'
    const RELOAD_TIMEOUT = 10000 // 10 seconds cooldown between reloads

    function isChunkLoadError(error: Error | string): boolean {
      const errorString = typeof error === 'string' ? error : error?.message || ''
      return (
        errorString.includes('Loading chunk') ||
        errorString.includes('ChunkLoadError') ||
        errorString.includes('Loading CSS chunk') ||
        errorString.includes('_next/static/chunks')
      )
    }

    function shouldReload(): boolean {
      const lastReload = localStorage.getItem(RELOAD_KEY)
      if (!lastReload) return true

      const timeSinceReload = Date.now() - parseInt(lastReload, 10)
      return timeSinceReload > RELOAD_TIMEOUT
    }

    function handleReload() {
      if (shouldReload()) {
        localStorage.setItem(RELOAD_KEY, Date.now().toString())
        window.location.reload()
      }
    }

    // Handle script/resource loading errors
    function handleError(event: ErrorEvent) {
      if (isChunkLoadError(event.error || event.message)) {
        event.preventDefault()
        handleReload()
      }
    }

    // Handle unhandled promise rejections (chunk loading uses dynamic imports)
    function handleRejection(event: PromiseRejectionEvent) {
      const error = event.reason
      if (error && isChunkLoadError(error)) {
        event.preventDefault()
        handleReload()
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
