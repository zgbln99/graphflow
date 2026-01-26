'use client'

import { useState } from 'react'
import { X, Trash2, Tag, FolderInput, CheckSquare, AlertTriangle, Loader2 } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface BulkAction {
  id: string
  label: string
  icon: LucideIcon
  onClick: (selectedIds: string[]) => Promise<void> | void
  variant?: 'default' | 'danger'
  confirmMessage?: string
}

interface BulkActionsToolbarProps {
  selectedIds: string[]
  onClearSelection: () => void
  actions: BulkAction[]
  itemLabel?: string
  className?: string
}

export function BulkActionsToolbar({
  selectedIds,
  onClearSelection,
  actions,
  itemLabel = 'element',
  className = '',
}: BulkActionsToolbarProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null)

  if (selectedIds.length === 0) return null

  const handleAction = async (action: BulkAction) => {
    if (action.confirmMessage) {
      setConfirmAction(action)
      return
    }

    await executeAction(action)
  }

  const executeAction = async (action: BulkAction) => {
    setIsLoading(action.id)
    setConfirmAction(null)
    try {
      await action.onClick(selectedIds)
    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error)
    } finally {
      setIsLoading(null)
    }
  }

  const getItemLabel = () => {
    const count = selectedIds.length
    if (count === 1) return `1 ${itemLabel}`
    if (count >= 2 && count <= 4) return `${count} ${itemLabel}y`
    return `${count} ${itemLabel}ów`
  }

  return (
    <>
      {/* Toolbar */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl border border-gray-700 px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200 ${className}`}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className="font-medium whitespace-nowrap">{getItemLabel()}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          {actions.map((action) => {
            const Icon = action.icon
            const isCurrentLoading = isLoading === action.id

            return (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={isLoading !== null}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  action.variant === 'danger'
                    ? 'hover:bg-red-500/20 text-red-400'
                    : 'hover:bg-white/10'
                } ${isLoading !== null ? 'opacity-50' : ''}`}
              >
                {isCurrentLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline text-sm">{action.label}</span>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700" />

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Odznacz wszystkie"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmAction.variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary-100 dark:bg-primary-900/30'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  confirmAction.variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Potwierdź akcję
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Wybrano {getItemLabel()}
                </p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {confirmAction.confirmMessage}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="btn-secondary"
              >
                Anuluj
              </button>
              <button
                onClick={() => executeAction(confirmAction)}
                className={confirmAction.variant === 'danger' ? 'btn bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'}
              >
                {confirmAction.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Preset actions for common operations
export const createDeleteAction = (
  onDelete: (ids: string[]) => Promise<void>
): BulkAction => ({
  id: 'delete',
  label: 'Usuń',
  icon: Trash2,
  variant: 'danger',
  confirmMessage: 'Czy na pewno chcesz usunąć wybrane elementy? Ta akcja jest nieodwracalna.',
  onClick: onDelete,
})

export const createChangeStatusAction = (
  onChangeStatus: (ids: string[]) => void
): BulkAction => ({
  id: 'change-status',
  label: 'Zmień status',
  icon: FolderInput,
  onClick: onChangeStatus,
})

export const createAddTagsAction = (
  onAddTags: (ids: string[]) => void
): BulkAction => ({
  id: 'add-tags',
  label: 'Dodaj tagi',
  icon: Tag,
  onClick: onAddTags,
})
