'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Trash2, Image as ImageIcon, Loader2, Download, Star, Expand } from 'lucide-react'
import { Lightbox } from '@/components/ui/lightbox'

interface ProjectFile {
  id: string
  filename: string
  storedName: string
  mimeType: string
  size: number
  isPreview: boolean
  createdAt: string | Date
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const previewInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File, isPreview: boolean = false) => {
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
        if (isPreview) {
          return [data.file, ...prev.filter(f => !f.isPreview)]
        }
        return [data.file, ...prev]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd uploadu')
    } finally {
      setUploading(false)
    }
  }, [projectId])

  const handleInputUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, isPreview: boolean = false) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file, isPreview)
    }
    e.target.value = ''
  }, [uploadFile])

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploading) setIsDragging(true)
  }, [uploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, isPreview: boolean = false) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (uploading) return

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      uploadFile(file, isPreview)
    } else {
      setError('Dozwolone są tylko pliki graficzne')
    }
  }, [uploading, uploadFile])

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

  // Prepare images for lightbox
  const allImages = files.map(f => ({
    src: `/api/uploads/${projectId}/${f.storedName}`,
    alt: f.filename,
    filename: f.filename,
  }))

  const openLightbox = useCallback((file: ProjectFile) => {
    const index = files.findIndex(f => f.id === file.id)
    if (index !== -1) {
      setLightboxIndex(index)
    }
  }, [files])

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
          <div
            className="relative group"
            onDragEnter={isAdmin ? handleDragEnter : undefined}
            onDragLeave={isAdmin ? handleDragLeave : undefined}
            onDragOver={isAdmin ? handleDragOver : undefined}
            onDrop={isAdmin ? (e) => handleDrop(e, true) : undefined}
          >
            <img
              src={`/api/uploads/${projectId}/${previewFile.storedName}`}
              alt="Podgląd projektu"
              className="w-full max-h-96 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer"
              onClick={() => openLightbox(previewFile)}
            />
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openLightbox(previewFile)}
                className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70"
                title="Powiększ"
              >
                <Expand className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(previewFile.id)}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  title="Usuń"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {isDragging && isAdmin && (
              <div className="absolute inset-0 bg-primary-500/20 border-2 border-primary-500 rounded-lg flex items-center justify-center">
                <p className="text-primary-700 dark:text-primary-300 font-medium bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-lg">
                  Upuść aby zmienić podgląd
                </p>
              </div>
            )}
          </div>
        ) : isAdmin ? (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, true)}
            onClick={() => previewInputRef.current?.click()}
            className={`flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-center text-gray-500 dark:text-gray-400">
              <ImageIcon className={`w-12 h-12 mx-auto mb-2 ${isDragging ? 'text-primary-500' : 'opacity-50'}`} />
              {isDragging ? (
                <p className="font-medium text-primary-600 dark:text-primary-400">Upuść plik tutaj</p>
              ) : (
                <>
                  <p>Brak podglądu</p>
                  <p className="text-sm">Przeciągnij lub kliknij aby dodać</p>
                </>
              )}
            </div>
            <input
              ref={previewInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleInputUpload(e, true)}
              disabled={uploading}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Brak podglądu</p>
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
              ref={filesInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleInputUpload(e, false)}
              disabled={uploading}
            />
          </label>
        </div>

        {otherFiles.length === 0 ? (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, false)}
            onClick={() => filesInputRef.current?.click()}
            className={`flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-primary-500' : 'opacity-50'}`} />
              {isDragging ? (
                <p className="font-medium text-primary-600 dark:text-primary-400">Upuść pliki tutaj</p>
              ) : (
                <p className="text-sm">Przeciągnij pliki lub kliknij aby dodać</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherFiles.map((file) => (
              <div
                key={file.id}
                className="relative group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
                onClick={() => openLightbox(file)}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openLightbox(file)
                    }}
                    className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100"
                    title="Powiększ"
                  >
                    <Expand className="w-4 h-4" />
                  </button>
                  <a
                    href={`/api/uploads/${projectId}/${file.storedName}`}
                    download={file.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100"
                    title="Pobierz"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(file.id)
                      }}
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

      {/* Lightbox */}
      {lightboxIndex !== null && allImages.length > 0 && (
        <Lightbox
          images={allImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
