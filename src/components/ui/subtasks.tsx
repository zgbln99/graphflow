'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Check,
  Circle,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface Subtask {
  id: string
  content: string
  isCompleted: boolean
  order?: number
  createdAt?: Date
  completedAt?: Date | null
}

interface SubtasksProps {
  /** Array of subtasks */
  items: Subtask[]
  /** Callback when a subtask is toggled */
  onToggle: (id: string, isCompleted: boolean) => Promise<void> | void
  /** Callback when a subtask is added */
  onAdd: (content: string) => Promise<Subtask | void> | void
  /** Callback when a subtask is deleted */
  onDelete: (id: string) => Promise<void> | void
  /** Callback when a subtask content is updated */
  onUpdate?: (id: string, content: string) => Promise<void> | void
  /** Callback when subtasks are reordered */
  onReorder?: (items: Subtask[]) => Promise<void> | void
  /** Whether the component is in loading state */
  isLoading?: boolean
  /** Title for the checklist */
  title?: string
  /** Placeholder for new item input */
  placeholder?: string
  /** Whether to show progress bar */
  showProgress?: boolean
  /** Whether items can be reordered via drag and drop */
  sortable?: boolean
  /** Whether completed items should be hidden */
  hideCompleted?: boolean
  /** Whether to allow inline editing */
  editable?: boolean
  /** Additional className */
  className?: string
  /** Variant style */
  variant?: 'default' | 'compact' | 'card'
}

// ============================================================================
// SubtaskItem Component
// ============================================================================

interface SubtaskItemProps {
  item: Subtask
  onToggle: (id: string, isCompleted: boolean) => void
  onDelete: (id: string) => void
  onUpdate?: (id: string, content: string) => void
  isLoading?: boolean
  sortable?: boolean
  editable?: boolean
  variant?: 'default' | 'compact' | 'card'
}

function SubtaskItem({
  item,
  onToggle,
  onDelete,
  onUpdate,
  isLoading,
  sortable,
  editable,
  variant = 'default',
}: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleToggle = async () => {
    if (isLoading || isToggling) return
    setIsToggling(true)
    try {
      await onToggle(item.id, !item.isCompleted)
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (isLoading || isDeleting) return
    setIsDeleting(true)
    try {
      await onDelete(item.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (editValue.trim() && editValue !== item.content && onUpdate) {
      await onUpdate(item.id, editValue.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditValue(item.content)
      setIsEditing(false)
    }
  }

  const isCompact = variant === 'compact'

  return (
    <div
      className={cn(
        'group flex items-center gap-2 transition-all duration-200',
        isCompact ? 'py-1.5 px-2' : 'py-2.5 px-3',
        item.isCompleted
          ? 'bg-gray-50 dark:bg-gray-800/30'
          : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50',
        variant === 'card' && 'rounded-lg border border-gray-200 dark:border-gray-700 mb-2',
        'border-b border-gray-100 dark:border-gray-800 last:border-b-0'
      )}
    >
      {/* Drag handle */}
      {sortable && (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Przeciągnij aby zmienić kolejność"
        >
          <GripVertical className={cn(isCompact ? 'w-3 h-3' : 'w-4 h-4')} />
        </button>
      )}

      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={isLoading || isToggling}
        className={cn(
          'flex-shrink-0 transition-all duration-200',
          isCompact ? 'w-4 h-4' : 'w-5 h-5',
          'rounded-full border-2',
          item.isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500',
          isToggling && 'animate-pulse'
        )}
      >
        {isToggling ? (
          <Loader2 className={cn(isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3', 'animate-spin m-auto')} />
        ) : item.isCompleted ? (
          <Check className={cn(isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3', 'm-auto')} />
        ) : null}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing && editable ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full bg-white dark:bg-gray-800 border border-primary-500 rounded px-2 py-1 outline-none',
              isCompact ? 'text-sm' : 'text-base'
            )}
          />
        ) : (
          <span
            className={cn(
              'block truncate transition-all',
              isCompact ? 'text-sm' : 'text-base',
              item.isCompleted
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'text-gray-700 dark:text-gray-300',
              editable && 'cursor-text'
            )}
            onClick={() => editable && setIsEditing(true)}
          >
            {item.content}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDelete}
          disabled={isLoading || isDeleting}
          className={cn(
            'p-1 rounded transition-colors',
            'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
            isDeleting && 'animate-pulse'
          )}
          title="Usuń"
        >
          {isDeleting ? (
            <Loader2 className={cn(isCompact ? 'w-3 h-3' : 'w-4 h-4', 'animate-spin')} />
          ) : (
            <Trash2 className={cn(isCompact ? 'w-3 h-3' : 'w-4 h-4')} />
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Subtasks Component
// ============================================================================

export function Subtasks({
  items,
  onToggle,
  onAdd,
  onDelete,
  onUpdate,
  onReorder,
  isLoading = false,
  title = 'Lista zadań',
  placeholder = 'Dodaj nowe zadanie...',
  showProgress = true,
  sortable = false,
  hideCompleted = false,
  editable = true,
  className,
  variant = 'default',
}: SubtasksProps) {
  const [newItemContent, setNewItemContent] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Calculate progress
  const completedCount = items.filter((item) => item.isCompleted).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  // Filter items based on hideCompleted
  const visibleItems = hideCompleted
    ? items.filter((item) => !item.isCompleted)
    : items

  // Sort items: uncompleted first, then by order
  const sortedItems = [...visibleItems].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1
    }
    return (a.order || 0) - (b.order || 0)
  })

  const handleAddItem = async () => {
    if (!newItemContent.trim() || isAddingItem || isLoading) return

    setIsAddingItem(true)
    try {
      await onAdd(newItemContent.trim())
      setNewItemContent('')
      inputRef.current?.focus()
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem()
    }
  }

  const handleToggle = useCallback(
    async (id: string, isCompleted: boolean) => {
      await onToggle(id, isCompleted)
    },
    [onToggle]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await onDelete(id)
    },
    [onDelete]
  )

  const handleUpdate = useCallback(
    async (id: string, content: string) => {
      if (onUpdate) {
        await onUpdate(id, content)
      }
    },
    [onUpdate]
  )

  const isCompact = variant === 'compact'

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        variant === 'card'
          ? 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm'
          : 'bg-gray-50 dark:bg-gray-800/50',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between',
          isCompact ? 'px-3 py-2' : 'px-4 py-3',
          'border-b border-gray-200 dark:border-gray-700',
          'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h4 className={cn('font-medium text-gray-900 dark:text-white', isCompact && 'text-sm')}>
            {title}
          </h4>
          <span
            className={cn(
              'text-gray-500 dark:text-gray-400',
              isCompact ? 'text-xs' : 'text-sm'
            )}
          >
            {completedCount}/{totalCount}
          </span>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          {isExpanded ? (
            <ChevronUp className={cn(isCompact ? 'w-4 h-4' : 'w-5 h-5')} />
          ) : (
            <ChevronDown className={cn(isCompact ? 'w-4 h-4' : 'w-5 h-5')} />
          )}
        </button>
      </div>

      {/* Progress bar */}
      {showProgress && isExpanded && (
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Items */}
      {isExpanded && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sortedItems.length === 0 ? (
            <div
              className={cn(
                'text-center py-8 text-gray-400 dark:text-gray-500',
                isCompact && 'py-4 text-sm'
              )}
            >
              {hideCompleted && completedCount > 0
                ? `${completedCount} ukrytych ukończonych zadań`
                : 'Brak zadań'}
            </div>
          ) : (
            sortedItems.map((item) => (
              <SubtaskItem
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={onUpdate ? handleUpdate : undefined}
                isLoading={isLoading}
                sortable={sortable}
                editable={editable}
                variant={variant}
              />
            ))
          )}
        </div>
      )}

      {/* Add new item */}
      {isExpanded && (
        <div
          className={cn(
            'flex items-center gap-2 border-t border-gray-200 dark:border-gray-700',
            isCompact ? 'px-3 py-2' : 'px-4 py-3'
          )}
        >
          <div className="flex-shrink-0">
            <Circle className={cn(isCompact ? 'w-4 h-4' : 'w-5 h-5', 'text-gray-300 dark:text-gray-600')} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || isAddingItem}
            className={cn(
              'flex-1 bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-500',
              isCompact ? 'text-sm' : 'text-base',
              'text-gray-700 dark:text-gray-300'
            )}
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemContent.trim() || isLoading || isAddingItem}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg transition-colors',
              isCompact ? 'text-xs' : 'text-sm',
              newItemContent.trim()
                ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            )}
          >
            {isAddingItem ? (
              <Loader2 className={cn(isCompact ? 'w-3 h-3' : 'w-4 h-4', 'animate-spin')} />
            ) : (
              <Plus className={cn(isCompact ? 'w-3 h-3' : 'w-4 h-4')} />
            )}
            <span className="hidden sm:inline">Dodaj</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Simple Checklist Component (for corrections, quick lists)
// ============================================================================

interface ChecklistProps {
  items: Subtask[]
  onToggle: (id: string, isCompleted: boolean) => void
  className?: string
  compact?: boolean
}

export function Checklist({ items, onToggle, className, compact = false }: ChecklistProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onToggle(item.id, !item.isCompleted)}
          className={cn(
            'w-full flex items-center gap-2 text-left transition-colors rounded-lg',
            compact ? 'px-2 py-1' : 'px-3 py-2',
            'hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          <div
            className={cn(
              'flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
              compact ? 'w-4 h-4' : 'w-5 h-5',
              item.isCompleted
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 dark:border-gray-600'
            )}
          >
            {item.isCompleted && (
              <Check className={cn(compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
            )}
          </div>
          <span
            className={cn(
              compact ? 'text-sm' : 'text-base',
              item.isCompleted
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {item.content}
          </span>
        </button>
      ))}
    </div>
  )
}

export default Subtasks
