'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Folder,
  ArrowLeft,
  Home,
  Link as LinkIcon,
  Check,
  Loader2,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  ChevronRight,
  AlertCircle,
  Eye,
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Upload,
  Trash2,
  FolderPlus,
  MoreVertical,
} from 'lucide-react'

interface DropboxEntry {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  size: number | null
  modified: string | null
}

interface PreviewData {
  url: string
  name: string
  directUrl: string
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

function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
}

// Fallback clipboard copy
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  }
}

export default function DropboxBrowserPage() {
  const [entries, setEntries] = useState<DropboxEntry[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [zoom, setZoom] = useState(1)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DropboxEntry | null>(null)

  // Create folder state
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ entry: DropboxEntry; x: number; y: number } | null>(null)

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
      setError(err instanceof Error ? err.message : 'Blad ladowania')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries('')
  }, [fetchEntries])

  // Handle escape key for preview and context menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (preview) {
          setPreview(null)
          setZoom(1)
        }
        if (contextMenu) {
          setContextMenu(null)
        }
        if (confirmDelete) {
          setConfirmDelete(null)
        }
        if (showNewFolder) {
          setShowNewFolder(false)
          setNewFolderName('')
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [preview, contextMenu, confirmDelete, showNewFolder])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const navigateToFolder = (path: string) => {
    fetchEntries(path)
  }

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/')
    fetchEntries(parentPath)
  }

  const generateLink = async (entry: DropboxEntry, showPreview = false) => {
    if (showPreview) {
      setPreviewLoading(true)
    } else {
      setGeneratingLink(entry.id)
    }

    try {
      const res = await fetch('/api/dropbox/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entry.path }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      if (showPreview) {
        setPreview({
          url: data.url,
          directUrl: data.directUrl,
          name: entry.name,
        })
        setZoom(1)
      } else {
        const success = await copyToClipboard(data.url)
        if (success) {
          setCopiedId(entry.id)
          setTimeout(() => setCopiedId(null), 2000)
        } else {
          setError('Nie udalo sie skopiowac linku')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad tworzenia linku')
    } finally {
      setGeneratingLink(null)
      setPreviewLoading(false)
    }
  }

  // Upload files
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress(`Wysylanie ${i + 1}/${files.length}: ${file.name}`)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', currentPath)

        const res = await fetch('/api/dropbox/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)
      }

      // Refresh entries
      await fetchEntries(currentPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad uploadu')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleUpload(e.dataTransfer.files)
  }

  // Delete entry
  const handleDelete = async (entry: DropboxEntry) => {
    setConfirmDelete(null)
    setDeleting(entry.id)

    try {
      const res = await fetch('/api/dropbox/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entry.path }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      // Remove from list
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad usuwania')
    } finally {
      setDeleting(null)
    }
  }

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setCreatingFolder(true)

    try {
      const res = await fetch('/api/dropbox/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          name: newFolderName.trim(),
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      // Add to list and sort
      setEntries((prev) => {
        const newEntries = [...prev, data.entry]
        return newEntries.sort((a, b) => {
          if (a.type === 'folder' && b.type !== 'folder') return -1
          if (a.type !== 'folder' && b.type === 'folder') return 1
          return a.name.localeCompare(b.name)
        })
      })

      setShowNewFolder(false)
      setNewFolderName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad tworzenia folderu')
    } finally {
      setCreatingFolder(false)
    }
  }

  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : []

  return (
    <div
      className="space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-primary-500/20 border-4 border-dashed border-primary-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg text-center">
            <Upload className="w-16 h-16 mx-auto text-primary-500 mb-4" />
            <p className="text-xl font-medium text-gray-900 dark:text-white">
              Upusc pliki tutaj
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Przegladarka Dropbox</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Przegladaj pliki, uploaduj i generuj linki do udostepnienia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Nowy folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Wysylanie...' : 'Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {uploadProgress && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          {uploadProgress}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-3">
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          <button
            onClick={() => fetchEntries('')}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Folder glowny"
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
        ) : entries.length === 0 && !showNewFolder ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Folder jest pusty</p>
            <p className="text-sm mt-2">Przeciagnij pliki tutaj lub kliknij Upload</p>
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

            {/* New folder input */}
            {showNewFolder && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                    if (e.key === 'Escape') {
                      setShowNewFolder(false)
                      setNewFolderName('')
                    }
                  }}
                  placeholder="Nazwa folderu..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Utworz'}
                </button>
                <button
                  onClick={() => {
                    setShowNewFolder(false)
                    setNewFolderName('')
                  }}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {entries.map((entry) => {
              const FileIcon = entry.type === 'folder' ? Folder : getFileIcon(entry.name)
              const isImage = isImageFile(entry.name)
              const isDeleting = deleting === entry.id

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    isDeleting ? 'opacity-50' : ''
                  }`}
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

                  <div className="flex items-center gap-1">
                    {entry.type === 'file' && (
                      <>
                        {/* Preview button for images */}
                        {isImage && (
                          <button
                            onClick={() => generateLink(entry, true)}
                            disabled={previewLoading}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
                            title="Podglad"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}

                        {/* Copy link button */}
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
                              Link
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => setConfirmDelete(entry)}
                      disabled={isDeleting}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Usun"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Potwierdz usuniecie
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Czy na pewno chcesz usunac{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {confirmDelete.name}
              </span>
              ?
              {confirmDelete.type === 'folder' && (
                <span className="block mt-1 text-sm text-red-600 dark:text-red-400">
                  Uwaga: Folder zostanie usuniety wraz z cala zawartoscia!
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Usun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {(preview || previewLoading) && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => { setPreview(null); setZoom(1); }} />

          {/* Top toolbar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
            <div className="text-white">
              {preview && <span className="text-sm">{preview.name}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Pomniejsz"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white/75 text-sm min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Powieksz"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              {preview && (
                <>
                  <a
                    href={preview.directUrl}
                    download={preview.name}
                    className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Pobierz"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button
                    onClick={async () => {
                      const success = await copyToClipboard(preview.url)
                      if (success) {
                        setCopiedId('preview')
                        setTimeout(() => setCopiedId(null), 2000)
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      copiedId === 'preview'
                        ? 'text-green-400 bg-green-900/30'
                        : 'text-white/75 hover:text-white hover:bg-white/10'
                    }`}
                    title="Kopiuj link"
                  >
                    {copiedId === 'preview' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <LinkIcon className="w-5 h-5" />
                    )}
                  </button>
                </>
              )}
              <button
                onClick={() => { setPreview(null); setZoom(1); }}
                className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Zamknij (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="relative max-w-[90vw] max-h-[85vh] overflow-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center p-20">
                <Loader2 className="w-10 h-10 animate-spin text-white" />
              </div>
            ) : preview ? (
              <img
                src={preview.directUrl}
                alt={preview.name}
                className="max-w-none transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
