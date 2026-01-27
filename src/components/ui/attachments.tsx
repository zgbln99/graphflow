'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import {
  Paperclip,
  Upload,
  X,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/utils'

// ============================================
// Types
// ============================================

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  url: string
  thumbnailUrl?: string
  uploadedAt?: Date
  uploadedBy?: string
}

export interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface AttachmentDropzoneProps {
  onFilesSelect: (files: File[]) => void
  accept?: string
  maxSize?: number // in bytes
  maxFiles?: number
  disabled?: boolean
  className?: string
  compact?: boolean
}

interface AttachmentListProps {
  attachments: Attachment[]
  onRemove?: (id: string) => void
  onPreview?: (attachment: Attachment) => void
  onDownload?: (attachment: Attachment) => void
  canRemove?: boolean
  className?: string
  layout?: 'list' | 'grid' | 'compact'
}

interface AttachmentUploaderProps {
  uploadingFiles: UploadingFile[]
  className?: string
}

// ============================================
// Helpers
// ============================================

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <FileImage className="w-5 h-5" />
  if (type.startsWith('video/')) return <FileVideo className="w-5 h-5" />
  if (type.startsWith('audio/')) return <FileAudio className="w-5 h-5" />
  if (type.includes('pdf')) return <FileText className="w-5 h-5" />
  if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('7z')) {
    return <FileArchive className="w-5 h-5" />
  }
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) {
    return <FileSpreadsheet className="w-5 h-5" />
  }
  if (type.includes('javascript') || type.includes('typescript') || type.includes('json') || type.includes('html') || type.includes('css')) {
    return <FileCode className="w-5 h-5" />
  }
  return <File className="w-5 h-5" />
}

function getFileTypeColor(type: string) {
  if (type.startsWith('image/')) return 'text-purple-500 bg-purple-50 dark:bg-purple-900/30'
  if (type.startsWith('video/')) return 'text-pink-500 bg-pink-50 dark:bg-pink-900/30'
  if (type.startsWith('audio/')) return 'text-orange-500 bg-orange-50 dark:bg-orange-900/30'
  if (type.includes('pdf')) return 'text-red-500 bg-red-50 dark:bg-red-900/30'
  if (type.includes('zip') || type.includes('rar')) return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'
  if (type.includes('sheet') || type.includes('excel')) return 'text-green-500 bg-green-50 dark:bg-green-900/30'
  if (type.includes('javascript') || type.includes('json')) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/30'
  return 'text-gray-500 bg-gray-50 dark:bg-gray-800'
}

// ============================================
// Attachment Dropzone
// ============================================

export function AttachmentDropzone({
  onFilesSelect,
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  disabled = false,
  className,
  compact = false,
}: AttachmentDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFiles = useCallback((files: File[]): File[] => {
    setError(null)

    if (files.length > maxFiles) {
      setError(`Maksymalnie ${maxFiles} plików`)
      return files.slice(0, maxFiles)
    }

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`Plik "${file.name}" jest za duży. Maksymalnie ${formatFileSize(maxSize)}`)
        return false
      }
      return true
    })

    return validFiles
  }, [maxFiles, maxSize])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    const validFiles = validateFiles(files)
    if (validFiles.length > 0) {
      onFilesSelect(validFiles)
    }
  }, [disabled, onFilesSelect, validateFiles])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = validateFiles(files)
    if (validFiles.length > 0) {
      onFilesSelect(validFiles)
    }
    e.target.value = ''
  }, [onFilesSelect, validateFiles])

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Paperclip className="w-4 h-4" />
          <span>Załącz plik</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        {error && (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <Upload
          className={cn(
            'w-10 h-10 mx-auto mb-3',
            isDragging ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'
          )}
        />

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          {isDragging ? (
            'Upuść pliki tutaj'
          ) : (
            <>
              <span className="text-primary-600 dark:text-primary-400 font-medium">
                Kliknij aby wybrać
              </span>{' '}
              lub przeciągnij pliki
            </>
          )}
        </p>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Maks. {maxFiles} {maxFiles === 1 ? 'plik' : 'plików'}, do {formatFileSize(maxSize)} każdy
        </p>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  )
}

// ============================================
// Attachment List
// ============================================

export function AttachmentList({
  attachments,
  onRemove,
  onPreview,
  onDownload,
  canRemove = true,
  className,
  layout = 'list',
}: AttachmentListProps) {
  if (attachments.length === 0) return null

  if (layout === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-lg text-sm',
              getFileTypeColor(attachment.type)
            )}
          >
            {getFileIcon(attachment.type)}
            <span className="max-w-[120px] truncate">{attachment.name}</span>
            {canRemove && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (layout === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3', className)}>
        {attachments.map((attachment) => {
          const isImage = attachment.type.startsWith('image/')
          const previewUrl = attachment.thumbnailUrl || (isImage ? attachment.url : null)

          return (
            <div
              key={attachment.id}
              className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Preview or Icon */}
              <div
                className={cn(
                  'aspect-square flex items-center justify-center',
                  previewUrl ? 'bg-gray-100 dark:bg-gray-800' : getFileTypeColor(attachment.type)
                )}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={attachment.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-4">
                    {getFileIcon(attachment.type)}
                  </div>
                )}
              </div>

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {onPreview && (
                  <button
                    type="button"
                    onClick={() => onPreview(attachment)}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <Eye className="w-5 h-5 text-white" />
                  </button>
                )}
                {onDownload && (
                  <button
                    type="button"
                    onClick={() => onDownload(attachment)}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <Download className="w-5 h-5 text-white" />
                  </button>
                )}
                {canRemove && onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(attachment.id)}
                    className="p-2 bg-white/20 rounded-full hover:bg-red-500/80 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>

              {/* Name */}
              <div className="p-2 bg-white dark:bg-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Default: list layout
  return (
    <div className={cn('space-y-2', className)}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {/* Icon */}
          <div className={cn('p-2 rounded-lg', getFileTypeColor(attachment.type))}>
            {getFileIcon(attachment.type)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {attachment.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(attachment.size)}
              {attachment.uploadedAt && (
                <> • {new Date(attachment.uploadedAt).toLocaleDateString('pl-PL')}</>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onPreview && (
              <button
                type="button"
                onClick={() => onPreview(attachment)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title="Podgląd"
              >
                <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            {onDownload && (
              <button
                type="button"
                onClick={() => onDownload(attachment)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title="Pobierz"
              >
                <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            {canRemove && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                title="Usuń"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// Attachment Uploader (shows upload progress)
// ============================================

export function AttachmentUploader({ uploadingFiles, className }: AttachmentUploaderProps) {
  if (uploadingFiles.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      {uploadingFiles.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
        >
          {/* Status icon */}
          <div className={cn(
            'p-2 rounded-lg',
            item.status === 'uploading' && 'bg-blue-50 dark:bg-blue-900/30 text-blue-500',
            item.status === 'success' && 'bg-green-50 dark:bg-green-900/30 text-green-500',
            item.status === 'error' && 'bg-red-50 dark:bg-red-900/30 text-red-500',
          )}>
            {item.status === 'uploading' && <Loader2 className="w-5 h-5 animate-spin" />}
            {item.status === 'success' && <CheckCircle className="w-5 h-5" />}
            {item.status === 'error' && <AlertCircle className="w-5 h-5" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {item.file.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(item.file.size)}
              </p>
              {item.status === 'uploading' && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <p className="text-xs text-blue-500">{item.progress}%</p>
                </>
              )}
              {item.status === 'error' && item.error && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <p className="text-xs text-red-500">{item.error}</p>
                </>
              )}
            </div>

            {/* Progress bar */}
            {item.status === 'uploading' && (
              <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// useFileUpload hook
// ============================================

interface UseFileUploadOptions {
  uploadUrl: string
  onSuccess?: (attachment: Attachment) => void
  onError?: (error: string) => void
}

export function useFileUpload({ uploadUrl, onSuccess, onError }: UseFileUploadOptions) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const uploadFile = useCallback(async (file: File) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Add to uploading list
    setUploadingFiles(prev => [...prev, {
      id,
      file,
      progress: 0,
      status: 'uploading',
    }])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      // Track progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadingFiles(prev =>
            prev.map(f => f.id === id ? { ...f, progress } : f)
          )
        }
      }

      // Handle completion
      const result = await new Promise<Attachment>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve(data)
            } catch {
              reject(new Error('Invalid response'))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.open('POST', uploadUrl)
        xhr.send(formData)
      })

      // Mark as success
      setUploadingFiles(prev =>
        prev.map(f => f.id === id ? { ...f, status: 'success' as const, progress: 100 } : f)
      )

      // Add to attachments
      setAttachments(prev => [...prev, result])
      onSuccess?.(result)

      // Remove from uploading list after delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== id))
      }, 2000)

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed'

      setUploadingFiles(prev =>
        prev.map(f => f.id === id ? { ...f, status: 'error' as const, error: errorMsg } : f)
      )

      onError?.(errorMsg)

      // Remove from uploading list after delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== id))
      }, 5000)

      return null
    }
  }, [uploadUrl, onSuccess, onError])

  const uploadFiles = useCallback(async (files: File[]) => {
    const results = await Promise.all(files.map(uploadFile))
    return results.filter((r): r is Attachment => r !== null)
  }, [uploadFile])

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments([])
  }, [])

  return {
    uploadingFiles,
    attachments,
    setAttachments,
    uploadFile,
    uploadFiles,
    removeAttachment,
    clearAttachments,
    isUploading: uploadingFiles.some(f => f.status === 'uploading'),
  }
}

export default AttachmentDropzone
