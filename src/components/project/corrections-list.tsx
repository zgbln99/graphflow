'use client'

import { useState, useRef, useEffect } from 'react'
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  GripVertical
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { SuccessConfetti } from '@/components/ui/confetti'

interface Correction {
  id: string
  content: string
  isResolved: boolean
  resolvedAt: Date | null
  createdAt: Date
}

interface CorrectionsListProps {
  corrections: Correction[]
  isAdmin?: boolean
  projectId: string
}

export function CorrectionsList({ corrections, isAdmin = false, projectId }: CorrectionsListProps) {
  const [items, setItems] = useState<Correction[]>(corrections)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [recentlyResolved, setRecentlyResolved] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAddForm && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showAddForm])

  const toggleResolved = async (correctionId: string) => {
    if (!isAdmin) return

    const correction = items.find(c => c.id === correctionId)
    if (!correction) return

    const newResolvedState = !correction.isResolved

    // Optimistic update
    setItems(items.map(c =>
      c.id === correctionId
        ? { ...c, isResolved: newResolvedState, resolvedAt: newResolvedState ? new Date() : null }
        : c
    ))
    setIsUpdating(correctionId)

    // Show sparkle animation when resolving
    if (newResolvedState) {
      setRecentlyResolved(correctionId)
      setTimeout(() => setRecentlyResolved(null), 1000)
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/corrections/${correctionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: newResolvedState }),
      })

      if (!response.ok) {
        // Revert on error
        setItems(items.map(c =>
          c.id === correctionId
            ? { ...c, isResolved: !newResolvedState, resolvedAt: !newResolvedState ? new Date() : null }
            : c
        ))
      } else {
        // Check if all corrections are now resolved
        const updatedItems = items.map(c =>
          c.id === correctionId
            ? { ...c, isResolved: newResolvedState }
            : c
        )
        const allResolved = updatedItems.every(c => c.isResolved)
        if (allResolved && updatedItems.length > 0) {
          setShowConfetti(true)
        }
      }
    } catch (error) {
      console.error('Error updating correction:', error)
      // Revert on error
      setItems(items.map(c =>
        c.id === correctionId
          ? { ...c, isResolved: !newResolvedState, resolvedAt: !newResolvedState ? new Date() : null }
          : c
      ))
    } finally {
      setIsUpdating(null)
    }
  }

  const addCorrection = async () => {
    if (!newContent.trim() || isAdding) return

    setIsAdding(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      })

      if (response.ok) {
        const created = await response.json()
        setItems([created, ...items])
        setNewContent('')
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding correction:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const deleteCorrection = async (correctionId: string) => {
    if (deletingId) return

    setDeletingId(correctionId)

    // Optimistic remove with animation
    const correctionEl = document.getElementById(`correction-${correctionId}`)
    if (correctionEl) {
      correctionEl.style.transform = 'translateX(100%)'
      correctionEl.style.opacity = '0'
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/corrections/${correctionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTimeout(() => {
          setItems(items.filter(c => c.id !== correctionId))
        }, 200)
      } else {
        // Revert animation on error
        if (correctionEl) {
          correctionEl.style.transform = ''
          correctionEl.style.opacity = ''
        }
      }
    } catch (error) {
      console.error('Error deleting correction:', error)
      if (correctionEl) {
        correctionEl.style.transform = ''
        correctionEl.style.opacity = ''
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCorrection()
    } else if (e.key === 'Escape') {
      setShowAddForm(false)
      setNewContent('')
    }
  }

  const pendingCount = items.filter(c => !c.isResolved).length
  const resolvedCount = items.filter(c => c.isResolved).length
  const progressPercent = items.length > 0 ? (resolvedCount / items.length) * 100 : 0

  // Sort: pending first, then by date
  const sortedItems = [...items].sort((a, b) => {
    if (a.isResolved !== b.isResolved) {
      return a.isResolved ? 1 : -1
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (items.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Brak poprawek</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Confetti celebration when all done */}
      <SuccessConfetti
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Summary with animated progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <Circle className="w-4 h-4" />
            <span className="font-medium">{pendingCount}</span>
            <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">do zrobienia</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">{resolvedCount}</span>
            <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">zrobione</span>
          </div>
        </div>

        {/* Percentage */}
        <span className={cn(
          "text-sm font-medium transition-colors",
          progressPercent === 100
            ? "text-green-600 dark:text-green-400"
            : "text-gray-500 dark:text-gray-400"
        )}>
          {Math.round(progressPercent)}%
        </span>
      </div>

      {/* Animated progress bar */}
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            progressPercent === 100
              ? "bg-gradient-to-r from-green-400 to-green-500"
              : "bg-gradient-to-r from-primary-400 to-primary-500"
          )}
          style={{ width: `${progressPercent}%` }}
        />
        {/* Shimmer effect when complete */}
        {progressPercent === 100 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        )}
      </div>

      {/* Add new correction (admin only) */}
      {isAdmin && (
        <div className="pt-2">
          {showAddForm ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <Plus className="w-3 h-3 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Wpisz treść poprawki..."
                className="flex-1 bg-transparent border-b-2 border-primary-500 focus:border-primary-600 outline-none py-1 text-gray-900 dark:text-white placeholder-gray-400"
                disabled={isAdding}
              />
              <button
                onClick={addCorrection}
                disabled={!newContent.trim() || isAdding}
                className="px-3 py-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Dodaj'
                )}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewContent('') }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center gap-2 py-2 px-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Dodaj poprawkę</span>
            </button>
          )}
        </div>
      )}

      {/* Corrections list */}
      <div className="space-y-1">
        {sortedItems.map((correction, index) => {
          const isRecentlyResolved = recentlyResolved === correction.id
          const pendingIndex = items.filter(c => !c.isResolved).findIndex(c => c.id === correction.id) + 1

          return (
            <div
              key={correction.id}
              id={`correction-${correction.id}`}
              className={cn(
                "group relative py-3 px-3 -mx-3 rounded-lg transition-all duration-200",
                correction.isResolved
                  ? "bg-green-50/50 dark:bg-green-900/10"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                isRecentlyResolved && "animate-pulse ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox/indicator */}
                {isAdmin ? (
                  <button
                    onClick={() => toggleResolved(correction.id)}
                    disabled={isUpdating === correction.id}
                    className={cn(
                      "flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                      correction.isResolved
                        ? "bg-green-500 border-green-500 text-white scale-100"
                        : "border-red-400 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
                      isUpdating === correction.id && "opacity-50 animate-pulse"
                    )}
                  >
                    {correction.isResolved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold text-red-500">{pendingIndex || index + 1}</span>
                    )}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                      correction.isResolved
                        ? "bg-green-500 text-white"
                        : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    )}
                  >
                    {correction.isResolved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{pendingIndex || index + 1}</span>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-gray-900 dark:text-white transition-all duration-200",
                    correction.isResolved && "line-through text-gray-500 dark:text-gray-400"
                  )}>
                    {correction.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(correction.createdAt)}</span>
                    {correction.isResolved && correction.resolvedAt && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {formatRelativeTime(correction.resolvedAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Sparkle animation on resolve */}
                {isRecentlyResolved && (
                  <div className="absolute right-2 top-2">
                    <Sparkles className="w-5 h-5 text-yellow-500 animate-bounce" />
                  </div>
                )}

                {/* Delete button (admin only) */}
                {isAdmin && (
                  <button
                    onClick={() => deleteCorrection(correction.id)}
                    disabled={deletingId === correction.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    title="Usuń poprawkę"
                  >
                    {deletingId === correction.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Celebration when all done */}
      {items.length > 0 && pendingCount === 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">
                Wszystkie poprawki wykonane! 🎉
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Projekt gotowy do następnego etapu
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
