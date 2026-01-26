'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Folder,
  File,
  ArrowLeft,
  Home,
  Link as LinkIcon,
  Copy,
  Check,
  Loader2,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  ChevronRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'

interface DropboxEntry {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  size: number | null
  modified: string | null
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm']
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a']
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz']

  if (ext && imageExts.includes(ext)) return Image
  if (ext && videoExts.includes(ext)) return Film
  if (ext && audioExts.includes(ext)) return Music
  if (ext && archiveExts.includes(ext)) return Archive
  return FileText
}

export default function DropboxBrowserPage() {
  const [entries, setEntries] = useState<DropboxEntry[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)

  const fetchEntries = useCallback(async (path: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/dropbox/browse?path=${encodeURIComponent(path)}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setEntries(data.entries)
      setCurrentPath(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries('')
  }, [fetchEntries])

  const navigateToFolder = (path: string) => {
    fetchEntries(path)
  }

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/')
    fetchEntries(parentPath)
  }

  const generateLink = async (entry: DropboxEntry) => {
    setGeneratingLink(entry.id)

    try {
      const res = await fetch('/api/dropbox/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entry.path }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      // Copy to clipboard
      await navigator.clipboard.writeText(data.url)
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd tworzenia linku')
    } finally {
      setGeneratingLink(null)
    }
  }

  const breadcrumbs = currentPath
    ? currentPath.split('/').filter(Boolean)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Przeglądarka Dropbox</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Przeglądaj pliki i generuj linki do udostępnienia
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-3">
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          <button
            onClick={() => fetchEntries('')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Folder główny"
          >
            <Home className="w-4 h-4" />
          </button>

          {breadcrumbs.map((crumb, index) => {
            const path = '/' + breadcrumbs.slice(0, index + 1).join('/')
            return (
              <div key={path} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => fetchEntries(path)}
                  className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-300"
                >
                  {crumb}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* File list */}
      <div className="card dark:bg-gray-800 dark:border-gray-700">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Folder jest pusty</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* Go up button */}
            {currentPath && (
              <button
                onClick={navigateUp}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </div>
                <span className="text-gray-600 dark:text-gray-400">..</span>
              </button>
            )}

            {entries.map((entry) => {
              const FileIcon = entry.type === 'folder' ? Folder : getFileIcon(entry.name)
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
                entry.name.split('.').pop()?.toLowerCase() || ''
              )

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {entry.type === 'folder' ? (
                    <button
                      onClick={() => navigateToFolder(entry.path)}
                      className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center"
                    >
                      <FileIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isImage
                          ? 'bg-purple-100 dark:bg-purple-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      <FileIcon
                        className={`w-5 h-5 ${
                          isImage
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {entry.type === 'folder' ? (
                      <button
                        onClick={() => navigateToFolder(entry.path)}
                        className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block text-left"
                      >
                        {entry.name}
                      </button>
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {entry.name}
                      </p>
                    )}
                    {entry.size && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(entry.size)}
                      </p>
                    )}
                  </div>

                  {entry.type === 'file' && (
                    <button
                      onClick={() => generateLink(entry)}
                      disabled={generatingLink === entry.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        copiedId === entry.id
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50'
                      }`}
                    >
                      {generatingLink === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : copiedId === entry.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Skopiowano!
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-4 h-4" />
                          Kopiuj link
                        </>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
