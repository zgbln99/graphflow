'use client'

import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

interface LightboxImage {
  src: string
  alt: string
  filename?: string
}

interface LightboxProps {
  images: LightboxImage[]
  initialIndex: number
  onClose: () => void
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)

  const currentImage = images[currentIndex]

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
    setZoom(1)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    setZoom(1)
  }, [images.length])

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goPrev()
          break
        case 'ArrowRight':
          goNext()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, goNext, goPrev])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Top toolbar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <div className="text-white">
          <span className="text-sm opacity-75">
            {currentIndex + 1} / {images.length}
          </span>
          {currentImage.filename && (
            <span className="ml-3 text-sm">{currentImage.filename}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Pomniejsz (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/75 text-sm min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Powiększ (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <a
            href={currentImage.src}
            download={currentImage.filename}
            className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Pobierz"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Zamknij (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/75 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            title="Poprzedni (←)"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/75 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            title="Następny (→)"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Image */}
      <div className="relative max-w-[90vw] max-h-[85vh] overflow-auto">
        <img
          src={currentImage.src}
          alt={currentImage.alt}
          className="max-w-none transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-black/50 rounded-lg max-w-[90vw] overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index)
                setZoom(1)
              }}
              className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden transition-all ${
                index === currentIndex
                  ? 'ring-2 ring-white'
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
