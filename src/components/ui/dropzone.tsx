'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Loader2, X, AlertCircle } from 'lucide-react'

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // in bytes
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function Dropzone({
  onFilesSelected,
  accept = 'image/*',
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className = '',
  children,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const validFiles: File[] = []
      const acceptedTypes = accept.split(',').map((t) => t.trim())

      for (const file of files) {
        // Check type
        const isValidType = acceptedTypes.some((type) => {
          if (type === '*/*') return true
          if (type.endsWith('/*')) {
            const category = type.split('/')[0]
            return file.type.startsWith(category + '/')
          }
          return file.type === type
        })

        if (!isValidType) {
          setError(`Typ pliku ${file.type} nie jest dozwolony`)
          continue
        }

        // Check size
        if (file.size > maxSize) {
          setError(`Plik ${file.name} jest za duży (max ${formatSize(maxSize)})`)
          continue
        }

        validFiles.push(file)
      }

      return validFiles
    },
    [accept, maxSize]
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragging(true)
        setError(null)
      }
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const droppedFiles = Array.from(e.dataTransfer.files)
      const filesToProcess = multiple ? droppedFiles : [droppedFiles[0]]
      const validFiles = validateFiles(filesToProcess.filter(Boolean))

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }
    },
    [disabled, multiple, validateFiles, onFilesSelected]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const validFiles = validateFiles(files)

      if (validFiles.length > 0) {
        onFilesSelected(validFiles)
      }

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [validateFiles, onFilesSelected]
  )

  const openFileDialog = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled])

  return (
    <div className={className}>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
        />

        {children || (
          <div className="flex flex-col items-center text-center">
            <Upload
              className={`w-10 h-10 mb-3 ${
                isDragging ? 'text-primary-500' : 'text-gray-400'
              }`}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-primary-600 dark:text-primary-400">
                Kliknij aby wybrać
              </span>{' '}
              lub przeciągnij i upuść
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {accept === 'image/*' ? 'PNG, JPG, GIF, WebP' : accept} do {formatSize(maxSize)}
            </p>
          </div>
        )}

        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary-50/90 dark:bg-primary-900/90 rounded-lg">
            <p className="text-primary-600 dark:text-primary-400 font-medium">
              Upuść plik tutaj
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

// Inline dropzone version (smaller, for embedding in existing UI)
interface InlineDropzoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSize?: number
  disabled?: boolean
  uploading?: boolean
  label?: string
}

export function InlineDropzone({
  onFilesSelected,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024,
  disabled = false,
  uploading = false,
  label = 'Dodaj plik',
}: InlineDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !uploading) {
      setIsDragging(true)
    }
  }, [disabled, uploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || uploading) return

    const file = e.dataTransfer.files[0]
    if (file && file.size <= maxSize) {
      onFilesSelected([file])
    }
  }, [disabled, uploading, maxSize, onFilesSelected])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFilesSelected([file])
    }
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [onFilesSelected])

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        btn btn-sm gap-1 cursor-pointer transition-colors
        ${isDragging ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
        ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {uploading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Upload className="w-4 h-4" />
      )}
      {label}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled || uploading}
      />
    </label>
  )
}
