'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, CheckCircle, X, RefreshCw } from 'lucide-react'

interface BulkActionsProps {
  selectedIds: string[]
  onClear: () => void
  actions: {
    label: string
    action: string
    icon: React.ReactNode
    variant?: 'default' | 'danger'
    confirm?: string
  }[]
  onAction: (action: string, ids: string[]) => Promise<{ success?: boolean; error?: string }>
}

export function BulkActions({ selectedIds, onClear, actions, onAction }: BulkActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<string | null>(null)

  if (selectedIds.length === 0) return null

  async function handleAction(action: typeof actions[0]) {
    if (action.confirm && !window.confirm(action.confirm)) {
      return
    }

    setActiveAction(action.action)
    startTransition(async () => {
      const result = await onAction(action.action, selectedIds)
      if (result.success) {
        onClear()
        router.refresh()
      } else if (result.error) {
        alert(result.error)
      }
      setActiveAction(null)
    })
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl shadow-2xl">
        <span className="text-sm font-medium">
          {selectedIds.length} {selectedIds.length === 1 ? 'zaznaczony' : 'zaznaczonych'}
        </span>

        <div className="w-px h-6 bg-gray-700 dark:bg-gray-600" />

        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.action}
              onClick={() => handleAction(action)}
              disabled={isPending}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                action.variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isPending && activeAction === action.action ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                action.icon
              )}
              {action.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700 dark:bg-gray-600" />

        <button
          onClick={onClear}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          title="Wyczyść zaznaczenie"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Wrapper for checkbox selection in tables
interface BulkSelectCheckboxProps {
  id: string
  isSelected: boolean
  onToggle: (id: string) => void
}

export function BulkSelectCheckbox({ id, isSelected, onToggle }: BulkSelectCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => onToggle(id)}
      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
    />
  )
}

// Select all checkbox for table header
interface BulkSelectAllProps {
  allIds: string[]
  selectedIds: string[]
  onSelectAll: (ids: string[]) => void
  onClear: () => void
}

export function BulkSelectAll({ allIds, selectedIds, onSelectAll, onClear }: BulkSelectAllProps) {
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))
  const someSelected = selectedIds.length > 0 && !allSelected

  function handleChange() {
    if (allSelected || someSelected) {
      onClear()
    } else {
      onSelectAll(allIds)
    }
  }

  return (
    <input
      type="checkbox"
      checked={allSelected}
      ref={(el) => {
        if (el) el.indeterminate = someSelected
      }}
      onChange={handleChange}
      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
    />
  )
}
