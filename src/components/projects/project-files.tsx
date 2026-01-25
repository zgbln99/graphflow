'use client'

import { useState, useCallback } from 'react'
import { Upload, Trash2, Image, Loader2, Download, Star } from 'lucide-react'

interface ProjectFile {
  id: string
  filename: string
  storedName: string
  mimeType: string
  size: number
  isPreview: boolean
  createdAt: string
  uploadedBy?: { name: string } | null
}

interface ProjectFilesProps {
  projectId: string
  initialFiles: ProjectFile[]
  isAdmin: boolean
}

export function ProjectFiles({ projectId, initialFiles, isAdmin }: ProjectFilesProps) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, isPreview: boolean = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('isPreview', isPreview.toString())

    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Błąd uploadu')
      }

      setFiles(prev => {
        // Jeśli to preview, usuń poprzedni preview z listy
        if (isPreview) {
          return [data.file, ...prev.filter(f => !f.isPreview)]
        }
        return [data.file, ...prev]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd uploadu')
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }, [projectId])

  const handleDelete = useCallback(async (fileId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten plik?')) return

    try {
      const res = await fetch(`/api/projects/${projectId}/files?fileId=${fileId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd usuwania')
      }

      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania')
    }
  }, [projectId])

  const previewFile = files.find(f => f.isPreview)
  const otherFiles = files.filter(f => !f.isPreview)

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Podgląd projektu */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Podgląd projektu
          </h3>
          {isAdmin && (
            <label className="btn btn-sm gap-1 cursor-pointer">
              <Upload className="w-4 h-4" />
              {previewFile ? 'Zmień' : 'Dodaj'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e, true)}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {previewFile ? (
          <div className="relative group">
            <img
              src={`/api/uploads/${projectId}/${previewFile.storedName}`}
              alt="Podgląd projektu"
              className="w-full max-h-96 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
            />
            {isAdmin && (
              <button
                onClick={() => handleDelete(previewFile.id)}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Usuń"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Brak podglądu</p>
              {isAdmin && <p className="text-sm">Kliknij "Dodaj" aby wgrać</p>}
            </div>
          </div>
        )}
      </div>

      {/* Inne pliki */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Pliki ({otherFiles.length})
          </h3>
          <label className="btn btn-sm gap-1 cursor-pointer">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Dodaj plik
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(e, false)}
              disabled={uploading}
            />
          </label>
        </div>

        {otherFiles.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Brak dodatkowych plików</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherFiles.map((file) => (
              <div
                key={file.id}
                className="relative group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <img
                  src={`/api/uploads/${projectId}/${file.storedName}`}
                  alt={file.filename}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2 bg-white dark:bg-gray-800">
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={file.filename}>
                    {file.filename}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={`/api/uploads/${projectId}/${file.storedName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100"
                    title="Otwórz"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      title="Usuń"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
