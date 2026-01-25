'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface DeleteButtonProps {
  onDelete: () => Promise<{ success?: boolean; error?: string }>
  itemName: string
  redirectTo?: string
  className?: string
  size?: 'sm' | 'md'
}

export function DeleteButton({
  onDelete,
  itemName,
  redirectTo,
  className = '',
  size = 'md',
}: DeleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await onDelete()
      if (result.error) {
        setError(result.error)
        setShowConfirm(false)
      } else if (result.success) {
        if (redirectTo) {
          router.push(redirectTo)
        }
        router.refresh()
      }
    })
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`inline-flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ${sizeClasses[size]} ${className}`}
        disabled={isPending}
      >
        <Trash2 className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        Usuń
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isPending && setShowConfirm(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Potwierdź usunięcie</h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Czy na pewno chcesz usunąć <strong>{itemName}</strong>? Ta operacja jest nieodwracalna.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="btn-ghost"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Usuwanie...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Usuń
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
