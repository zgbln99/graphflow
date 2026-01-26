'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'bottom' | 'right'
}

export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when open
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const positionClasses = {
    bottom: 'inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh] animate-in slide-in-from-bottom',
    right: 'inset-y-0 right-0 w-full max-w-md rounded-l-2xl animate-in slide-in-from-right',
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`absolute bg-white dark:bg-gray-800 shadow-xl ${positionClasses[position]} duration-300`}
      >
        {/* Handle for bottom drawer */}
        {position === 'bottom' && (
          <div className="flex justify-center py-2">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: position === 'bottom' ? 'calc(90vh - 80px)' : '100vh' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Bottom sheet for actions
interface BottomSheetAction {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface ActionSheetProps {
  isOpen: boolean
  onClose: () => void
  actions: BottomSheetAction[]
  title?: string
}

export function ActionSheet({ isOpen, onClose, actions, title }: ActionSheetProps) {
  return (
    <MobileDrawer isOpen={isOpen} onClose={onClose} title={title} position="bottom">
      <div className="space-y-1">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              action.onClick()
              onClose()
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              action.variant === 'danger'
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onClose}
        className="w-full mt-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        Anuluj
      </button>
    </MobileDrawer>
  )
}
