'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Info, Trash2, X } from 'lucide-react'

type ModalVariant = 'danger' | 'warning' | 'info'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ModalVariant
  isLoading?: boolean
}

const variants = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  },
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Potwierdź',
  cancelText = 'Anuluj',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Focus confirm button when modal opens
      setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 100)

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isLoading) {
          onClose()
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isLoading, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const config = variants[variant]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative w-full max-w-md transform rounded-xl bg-white dark:bg-gray-900 shadow-2xl transition-all animate-fade-in-scale"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            {/* Icon */}
            <div className={`mx-auto w-14 h-14 rounded-full ${config.iconBg} flex items-center justify-center mb-4`}>
              <Icon className={`w-7 h-7 ${config.iconColor}`} />
            </div>

            {/* Content */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 ${config.buttonBg}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4\" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Przetwarzanie...
                  </span>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>

          {/* Decorative gradient line */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-xl bg-gradient-to-r ${
            variant === 'danger' ? 'from-red-500 to-red-600' :
            variant === 'warning' ? 'from-amber-500 to-amber-600' :
            'from-blue-500 to-blue-600'
          }`} />
        </div>
      </div>
    </div>
  )
}

// Hook for easier usage
import { useState, useCallback } from 'react'

interface UseConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ModalVariant
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [options, setOptions] = useState<UseConfirmOptions | null>(null)
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: UseConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setResolveRef(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef?.(true)
    setIsOpen(false)
    setIsLoading(false)
  }, [resolveRef])

  const handleClose = useCallback(() => {
    resolveRef?.(false)
    setIsOpen(false)
    setIsLoading(false)
  }, [resolveRef])

  const ConfirmDialog = options ? (
    <ConfirmModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
      isLoading={isLoading}
    />
  ) : null

  return { confirm, ConfirmDialog, setIsLoading }
}
