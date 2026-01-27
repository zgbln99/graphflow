'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, MessageSquare, FileText, Clock, User, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatRelativeTime } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface QuickPreviewProps {
  children: ReactNode
  content: ReactNode
  delay?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  disabled?: boolean
}

// ============================================
// QuickPreview Component
// ============================================

export function QuickPreview({
  children,
  content,
  delay = 300,
  position = 'right',
  className,
  disabled = false,
}: QuickPreviewProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showPreview = () => {
    if (disabled) return

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        let top = 0
        let left = 0

        switch (position) {
          case 'top':
            top = rect.top - 8
            left = rect.left + rect.width / 2
            break
          case 'bottom':
            top = rect.bottom + 8
            left = rect.left + rect.width / 2
            break
          case 'left':
            top = rect.top + rect.height / 2
            left = rect.left - 8
            break
          case 'right':
          default:
            top = rect.top + rect.height / 2
            left = rect.right + 8
            break
        }

        setCoords({ top, left })
        setIsVisible(true)
      }
    }, delay)
  }

  const hidePreview = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const positionClasses = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showPreview}
        onMouseLeave={hidePreview}
        className={className}
      >
        {children}
      </div>

      {mounted && isVisible && createPortal(
        <div
          className={cn(
            'fixed z-[100] animate-fade-in pointer-events-none',
            positionClasses[position]
          )}
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[280px] max-w-[360px]">
            {content}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ============================================
// Project Quick Preview
// ============================================

interface ProjectPreviewData {
  number: string
  title: string
  description?: string | null
  status: { name: string; color: string }
  clientName?: string
  deadline?: Date | null
  updatedAt: Date
  ticketsCount?: number
  filesCount?: number
  tags?: Array<{ name: string; color: string }>
}

interface ProjectQuickPreviewProps {
  children: ReactNode
  project: ProjectPreviewData
  className?: string
}

export function ProjectQuickPreview({ children, project, className }: ProjectQuickPreviewProps) {
  const content = (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {project.number}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${project.status.color}20`,
              color: project.status.color,
            }}
          >
            {project.status.name}
          </span>
        </div>
        <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
          {project.title}
        </h4>
        {project.clientName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <User className="w-3 h-3" />
            {project.clientName}
          </p>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 4).map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${tag.color}15`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
          {project.tags.length > 4 && (
            <span className="text-xs text-gray-400">+{project.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {project.ticketsCount !== undefined && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {project.ticketsCount}
          </span>
        )}
        {project.filesCount !== undefined && (
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {project.filesCount}
          </span>
        )}
        {project.deadline && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(project.deadline)}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Zaktualizowano {formatRelativeTime(project.updatedAt)}
      </div>
    </div>
  )

  return (
    <QuickPreview content={content} className={className}>
      {children}
    </QuickPreview>
  )
}

// ============================================
// User Quick Preview
// ============================================

interface UserPreviewData {
  name: string
  email: string
  role: string
  avatarUrl?: string | null
  lastActive?: Date | null
}

interface UserQuickPreviewProps {
  children: ReactNode
  user: UserPreviewData
  className?: string
}

export function UserQuickPreview({ children, user, className }: UserQuickPreviewProps) {
  const content = (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-lg">
        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white">{user.name}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {user.role === 'ADMIN' ? 'Administrator' : 'Klient'}
          {user.lastActive && ` • Aktywny ${formatRelativeTime(user.lastActive)}`}
        </p>
      </div>
    </div>
  )

  return (
    <QuickPreview content={content} position="bottom" className={className}>
      {children}
    </QuickPreview>
  )
}

export default QuickPreview
