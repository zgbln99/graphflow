'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2 } from 'lucide-react'

interface FilePreviewFile {
  id: string
  filename: string
  mimeType: string
  url: string
  size?: number
}

interface FilePreviewModalProps {
  files: FilePreviewFile[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export function FilePreviewModal({ files, initialIndex = 0, isOpen, onClose }: FilePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const currentFile = files[currentIndex]

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setZoom(1)
      setRotation(0)
      setIsLoading(true)
    }
  }, [isOpen, initialIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevFile()
          break
        case 'ArrowRight':
          e.preventDefault()
          nextFile()
          break
        case '+':
        case '=':
          e.preventDefault()
          handleZoomIn()
          break
        case '-':
          e.preventDefault()
          handleZoomOut()
          break
        case 'r':
          e.preventDefault()
          handleRotate()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, files.length])

  const prevFile = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : files.length - 1))
    setZoom(1)
    setRotation(0)
    setIsLoading(true)
  }, [files.length])

  const nextFile = useCallback(() => {
    setCurrentIndex(prev => (prev < files.length - 1 ? prev + 1 : 0))
    setZoom(1)
    setRotation(0)
    setIsLoading(true)
  }, [files.length])

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = currentFile.url
    link.download = currentFile.filename
    link.click()
  }

  const isImage = currentFile?.mimeType?.startsWith('image/')
  const isPdf = currentFile?.mimeType === 'application/pdf'

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isOpen || !currentFile) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="text-white font-medium truncate max-w-[200px] sm:max-w-none">
            {currentFile.filename}
          </span>
          {currentFile.size && (
            <span className="text-gray-400 text-sm hidden sm:inline">
              {formatFileSize(currentFile.size)}
            </span>
          )}
          {files.length > 1 && (
            <span className="text-gray-400 text-sm">
              {currentIndex + 1} / {files.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls for images */}
          {isImage && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Pomniejsz (-)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white/70 text-sm w-14 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Powiększ (+)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Obróć (R)"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-white/20 mx-2" />
            </>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Pełny ekran (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={handleDownload}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Pobierz"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2"
            title="Zamknij (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Navigation arrows */}
        {files.length > 1 && (
          <>
            <button
              onClick={prevFile}
              className="absolute left-4 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              title="Poprzedni (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextFile}
              className="absolute right-4 z-10 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              title="Następny (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* File content */}
        <div className="relative max-w-full max-h-full overflow-auto p-4">
          {isImage ? (
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
              <img
                src={currentFile.url}
                alt={currentFile.filename}
                onLoad={() => setIsLoading(false)}
                className="max-w-full max-h-[calc(100vh-120px)] object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  opacity: isLoading ? 0 : 1,
                }}
                draggable={false}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${currentFile.url}#toolbar=0`}
              className="w-[90vw] h-[calc(100vh-120px)] bg-white rounded-lg"
              title={currentFile.filename}
            />
          ) : (
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg mb-4">{currentFile.filename}</p>
              <p className="text-gray-400 mb-4">Podgląd niedostępny dla tego typu pliku</p>
              <button
                onClick={handleDownload}
                className="btn bg-white text-black hover:bg-gray-100"
              >
                <Download className="w-4 h-4 mr-2" />
                Pobierz plik
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails for multiple files */}
      {files.length > 1 && (
        <div className="flex justify-center gap-2 px-4 py-3 bg-black/50 backdrop-blur-sm overflow-x-auto">
          {files.map((file, index) => (
            <button
              key={file.id}
              onClick={() => {
                setCurrentIndex(index)
                setZoom(1)
                setRotation(0)
                setIsLoading(true)
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-white scale-110'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {file.mimeType?.startsWith('image/') ? (
                <img
                  src={file.url}
                  alt={file.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-2xl">
                  📄
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Hook for easy modal management
export function useFilePreview() {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<FilePreviewFile[]>([])
  const [initialIndex, setInitialIndex] = useState(0)

  const openPreview = useCallback((files: FilePreviewFile[], startIndex = 0) => {
    setFiles(files)
    setInitialIndex(startIndex)
    setIsOpen(true)
  }, [])

  const closePreview = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    files,
    initialIndex,
    openPreview,
    closePreview,
  }
}
