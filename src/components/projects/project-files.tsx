'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Trash2, Image as ImageIcon, Loader2, Download, Star, Expand, FileText, FileArchive, File, FileVideo, FileAudio, X, CheckCircle, AlertCircle, History, RefreshCw } from 'lucide-react'
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
  storageType?: string
  externalUrl?: string | null
  // Versioning
  version?: number
  parentFileId?: string | null
  versionNote?: string | null
  versions?: ProjectFile[]
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface ProjectFilesProps {
  projectId: string
  initialFiles: ProjectFile[]
  isAdmin: boolean
}

// Helper to get file URL - use download API for all files (handles both local and Dropbox)
function getFileUrl(projectId: string, file: ProjectFile): string {
  // Use the unified download endpoint that handles both local and Dropbox storage
  return `/api/projects/${projectId}/files/${file.id}/download`
}

// Helper to check if file is an image
function isImageFile(file: ProjectFile): boolean {
  return file.mimeType.startsWith('image/')
}

// Helper to get file icon based on mime type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.includes('pdf')) return FileText
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('archive')) return FileArchive
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return FileText
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function ProjectFiles({ projectId, initialFiles, isAdmin }: ProjectFilesProps) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles)
  const [uploadQueue, setUploadQueue] = useState<UploadingFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [versioningFileId, setVersioningFileId] = useState<string | null>(null)
  const previewInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)
  const versionInputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)

  const isUploading = uploadQueue.some(f => f.status === 'uploading' || f.status === 'pending')

  // Upload single file with progress tracking
  const uploadFileWithProgress = useCallback((uploadingFile: UploadingFile, isPreview: boolean = false, parentFileId?: string): Promise<ProjectFile | null> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', uploadingFile.file)
      formData.append('isPreview', isPreview.toString())
      if (parentFileId) {
        formData.append('parentFileId', parentFileId)
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadQueue(prev => prev.map(f =>
            f.id === uploadingFile.id ? { ...f, progress, status: 'uploading' } : f
          ))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            setUploadQueue(prev => prev.map(f =>
              f.id === uploadingFile.id ? { ...f, progress: 100, status: 'done' } : f
            ))
            resolve(data.file)
          } catch {
            setUploadQueue(prev => prev.map(f =>
              f.id === uploadingFile.id ? { ...f, status: 'error', error: 'Błąd parsowania odpowiedzi' } : f
            ))
            resolve(null)
          }
        } else {
          let errorMsg = 'Błąd uploadu'
          try {
            const data = JSON.parse(xhr.responseText)
            errorMsg = data.error || errorMsg
          } catch {}
          setUploadQueue(prev => prev.map(f =>
            f.id === uploadingFile.id ? { ...f, status: 'error', error: errorMsg } : f
          ))
          resolve(null)
        }
      })

      xhr.addEventListener('error', () => {
        setUploadQueue(prev => prev.map(f =>
          f.id === uploadingFile.id ? { ...f, status: 'error', error: 'Błąd połączenia' } : f
        ))
        resolve(null)
      })

      xhr.open('POST', `/api/projects/${projectId}/files`)
      xhr.send(formData)
    })
  }, [projectId])

  // Process upload queue
  const processQueue = useCallback(async (filesToUpload: UploadingFile[], isPreview: boolean = false) => {
    if (uploadingRef.current) return
    uploadingRef.current = true

    for (const uploadingFile of filesToUpload) {
      setUploadQueue(prev => prev.map(f =>
        f.id === uploadingFile.id ? { ...f, status: 'uploading' } : f
      ))

      const result = await uploadFileWithProgress(uploadingFile, isPreview)

      if (result) {
        setFiles(prev => {
          if (isPreview) {
            return [result, ...prev.filter(f => !f.isPreview)]
          }
          return [result, ...prev]
        })
      }
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(f => f.status !== 'done'))
    }, 2000)

    uploadingRef.current = false
  }, [uploadFileWithProgress])

  // Add files to queue and start upload
  const addFilesToQueue = useCallback((fileList: FileList | File[], isPreview: boolean = false) => {
    const newFiles: UploadingFile[] = Array.from(fileList).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: 'pending' as const,
    }))

    setUploadQueue(prev => [...prev, ...newFiles])
    setError(null)

    // Start processing
    processQueue(newFiles, isPreview)
  }, [processQueue])

  const handleInputUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, isPreview: boolean = false) => {
    const fileList = e.target.files
    if (fileList && fileList.length > 0) {
      addFilesToQueue(fileList, isPreview)
    }
    e.target.value = ''
  }, [addFilesToQueue])

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

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

    if (isUploading) return

    const fileList = e.dataTransfer.files
    if (fileList && fileList.length > 0) {
      addFilesToQueue(fileList, isPreview)
    }
  }, [isUploading, addFilesToQueue])

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

  const removeFromQueue = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(f => f.id !== id))
  }, [])

  // Handle uploading a new version of a file
  const handleVersionUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (fileList && fileList.length > 0 && versioningFileId) {
      const newFiles: UploadingFile[] = Array.from(fileList).map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: 0,
        status: 'pending' as const,
      }))

      setUploadQueue(prev => [...prev, ...newFiles])
      setError(null)

      // Upload as new version
      const uploadVersion = async () => {
        if (uploadingRef.current) return
        uploadingRef.current = true

        for (const uploadingFile of newFiles) {
          setUploadQueue(prev => prev.map(f =>
            f.id === uploadingFile.id ? { ...f, status: 'uploading' } : f
          ))

          const result = await uploadFileWithProgress(uploadingFile, false, versioningFileId)

          if (result) {
            setFiles(prev => [result, ...prev])
          }
        }

        setTimeout(() => {
          setUploadQueue(prev => prev.filter(f => f.status !== 'done'))
        }, 2000)

        uploadingRef.current = false
      }

      uploadVersion()
    }
    e.target.value = ''
    setVersioningFileId(null)
  }, [versioningFileId, uploadFileWithProgress])

  const previewFile = files.find(f => f.isPreview)
  const otherFiles = files.filter(f => !f.isPreview)

  // Prepare images for lightbox (only actual images)
  const imageFiles = files.filter(f => isImageFile(f))
  const allImages = imageFiles.map(f => ({
    src: getFileUrl(projectId, f),
    alt: f.filename,
    filename: f.filename,
  }))

  const openLightbox = useCallback((file: ProjectFile) => {
    if (!isImageFile(file)) return
    const index = imageFiles.findIndex(f => f.id === file.id)
    if (index !== -1) {
      setLightboxIndex(index)
    }
  }, [imageFiles])

  // Calculate total upload progress
  const totalProgress = uploadQueue.length > 0
    ? Math.round(uploadQueue.reduce((sum, f) => sum + f.progress, 0) / uploadQueue.length)
    : 0

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Upload Progress Panel */}
      {uploadQueue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Przesyłanie plików ({uploadQueue.filter(f => f.status === 'done').length}/{uploadQueue.length})
            </h4>
            {!isUploading && (
              <button
                onClick={() => setUploadQueue([])}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Overall progress bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary-500 transition-all duration-300 ease-out"
              style={{ width: `${totalProgress}%` }}
            />
          </div>

          {/* Individual file progress */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uploadQueue.map(item => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <div className="flex-shrink-0">
                  {item.status === 'done' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : item.status === 'uploading' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-gray-700 dark:text-gray-300" title={item.file.name}>
                    {item.file.name}
                  </p>
                  {item.status === 'uploading' && (
                    <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-500">{item.error}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                  {item.status === 'uploading' ? (
                    <span>{item.progress}%</span>
                  ) : item.status === 'done' ? (
                    <span className="text-green-500">Gotowe</span>
                  ) : item.status === 'error' ? (
                    <button onClick={() => removeFromQueue(item.id)} className="text-red-500 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <span>{formatFileSize(item.file.size)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Podgląd projektu */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Podgląd projektu
          </h3>
          {isAdmin && (
            <label className="btn btn-sm gap-1 cursor-pointer">
              <Upload className="w-4 h-4" />
              {previewFile ? 'Zmień' : 'Dodaj'}
              <input
                type="file"
                accept="*/*"
                className="hidden"
                onChange={(e) => handleInputUpload(e, true)}
                disabled={isUploading}
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
              src={getFileUrl(projectId, previewFile)}
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
                  className="p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600"
                  title="Usuń"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : isAdmin ? (
          <div
            onClick={() => previewInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, true)}
            className={`flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-center text-gray-500 dark:text-gray-400">
              {isUploading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin" />
              ) : (
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              )}
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
              accept="*/*"
              className="hidden"
              onChange={(e) => handleInputUpload(e, true)}
              disabled={isUploading}
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
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Dodaj pliki
            <input
              ref={filesInputRef}
              type="file"
              accept="*/*"
              multiple
              className="hidden"
              onChange={(e) => handleInputUpload(e, false)}
              disabled={isUploading}
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
              {isUploading ? (
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
              )}
              {isDragging ? (
                <p className="font-medium text-primary-600 dark:text-primary-400">Upuść pliki tutaj</p>
              ) : (
                <p className="text-sm">Przeciągnij pliki lub kliknij aby dodać</p>
              )}
            </div>
          </div>
        ) : (
          <div
            className="space-y-4"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, false)}
          >
            {/* Drop zone overlay when dragging over files grid */}
            {isDragging && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border-2 border-dashed border-primary-500 rounded-lg text-center">
                <p className="font-medium text-primary-600 dark:text-primary-400">Upuść pliki tutaj aby dodać</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {otherFiles.map((file) => {
                const isImage = isImageFile(file)
                const FileIcon = getFileIcon(file.mimeType)

                return (
                  <div
                    key={file.id}
                    className="relative group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
                    onClick={() => isImage ? openLightbox(file) : window.open(getFileUrl(projectId, file), '_blank')}
                  >
                    {isImage ? (
                      <img
                        src={getFileUrl(projectId, file)}
                        alt={file.filename}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <FileIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    <div className="p-2 bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1" title={file.filename}>
                          {file.filename}
                        </p>
                        {file.version && file.version > 1 && (
                          <span className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1 rounded">
                            v{file.version}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {isImage && (
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
                      )}
                      <a
                        href={getFileUrl(projectId, file)}
                        download={file.filename}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100"
                        title="Pobierz"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setVersioningFileId(file.parentFileId || file.id)
                              setTimeout(() => versionInputRef.current?.click(), 0)
                            }}
                            className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100"
                            title="Nowa wersja"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
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
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
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

      {/* Hidden input for version uploads */}
      <input
        ref={versionInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleVersionUpload}
        disabled={isUploading}
      />
    </div>
  )
}
