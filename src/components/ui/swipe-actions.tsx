'use client'

import { useState, useRef, ReactNode, TouchEvent } from 'react'
import { Trash2, Edit, Archive, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

export interface SwipeAction {
  icon: ReactNode
  label: string
  color: 'red' | 'blue' | 'green' | 'yellow' | 'gray'
  onClick: () => void
}

interface SwipeActionsProps {
  children: ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  threshold?: number
  className?: string
}

// ============================================
// Color mappings
// ============================================

const colorClasses = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  gray: 'bg-gray-500 text-white',
}

// ============================================
// SwipeActions Component
// ============================================

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
}: SwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const handleTouchStart = (e: TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsSwiping(true)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping) return

    const diff = e.touches[0].clientX - startX
    setCurrentX(diff)

    // Determine direction and show actions
    if (diff > threshold && leftActions.length > 0) {
      setShowLeft(true)
      setShowRight(false)
    } else if (diff < -threshold && rightActions.length > 0) {
      setShowRight(true)
      setShowLeft(false)
    } else {
      setShowLeft(false)
      setShowRight(false)
    }
  }

  const handleTouchEnd = () => {
    setIsSwiping(false)

    // Execute action if threshold was crossed
    if (showLeft && leftActions.length > 0) {
      leftActions[0].onClick()
    } else if (showRight && rightActions.length > 0) {
      rightActions[0].onClick()
    }

    // Reset state
    setCurrentX(0)
    setShowLeft(false)
    setShowRight(false)
  }

  const translateX = Math.min(Math.max(currentX, -150), 150)

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Left actions (swipe right to reveal) */}
      {leftActions.length > 0 && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center transition-opacity duration-200',
            showLeft ? 'opacity-100' : 'opacity-0'
          )}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                'h-full px-4 flex flex-col items-center justify-center gap-1 transition-transform',
                colorClasses[action.color],
                showLeft ? 'translate-x-0' : '-translate-x-full'
              )}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (swipe left to reveal) */}
      {rightActions.length > 0 && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center transition-opacity duration-200',
            showRight ? 'opacity-100' : 'opacity-0'
          )}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                'h-full px-4 flex flex-col items-center justify-center gap-1 transition-transform',
                colorClasses[action.color],
                showRight ? 'translate-x-0' : 'translate-x-full'
              )}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          'relative bg-white dark:bg-gray-900 transition-transform duration-200',
          isSwiping && 'transition-none'
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================
// Pre-configured swipe item for lists
// ============================================

interface SwipeableListItemProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
  onArchive?: () => void
  className?: string
}

export function SwipeableListItem({
  children,
  onEdit,
  onDelete,
  onArchive,
  className,
}: SwipeableListItemProps) {
  const leftActions: SwipeAction[] = []
  const rightActions: SwipeAction[] = []

  if (onEdit) {
    leftActions.push({
      icon: <Edit className="w-5 h-5" />,
      label: 'Edytuj',
      color: 'blue',
      onClick: onEdit,
    })
  }

  if (onArchive) {
    rightActions.push({
      icon: <Archive className="w-5 h-5" />,
      label: 'Archiwum',
      color: 'yellow',
      onClick: onArchive,
    })
  }

  if (onDelete) {
    rightActions.push({
      icon: <Trash2 className="w-5 h-5" />,
      label: 'Usuń',
      color: 'red',
      onClick: onDelete,
    })
  }

  return (
    <SwipeActions
      leftActions={leftActions}
      rightActions={rightActions}
      className={className}
    >
      {children}
    </SwipeActions>
  )
}

export default SwipeActions
