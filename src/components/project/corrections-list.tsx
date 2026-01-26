'use client'

import { useState } from 'react'
import { CheckCircle, Circle, AlertTriangle, Clock } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

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

  const toggleResolved = async (correctionId: string) => {
    if (!isAdmin) return

    setIsUpdating(correctionId)
    try {
      const response = await fetch(`/api/projects/${projectId}/corrections/${correctionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: !items.find(c => c.id === correctionId)?.isResolved }),
      })

      if (response.ok) {
        const updated = await response.json()
        setItems(items.map(c => c.id === correctionId ? { ...c, ...updated } : c))
      }
    } catch (error) {
      console.error('Error updating correction:', error)
    } finally {
      setIsUpdating(null)
    }
  }

  const pendingCount = items.filter(c => !c.isResolved).length
  const resolvedCount = items.filter(c => c.isResolved).length

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Brak poprawek</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
          <Circle className="w-4 h-4" />
          <span>Do zrobienia: {pendingCount}</span>
        </div>
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Zrobione: {resolvedCount}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-green-500 h-2 transition-all duration-300"
          style={{ width: `${(resolvedCount / items.length) * 100}%` }}
        />
      </div>

      {/* Corrections list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {items.map((correction, index) => (
          <div
            key={correction.id}
            className={`py-3 flex items-start gap-3 ${correction.isResolved ? 'opacity-60' : ''}`}
          >
            {/* Status indicator/toggle */}
            {isAdmin ? (
              <button
                onClick={() => toggleResolved(correction.id)}
                disabled={isUpdating === correction.id}
                className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  correction.isResolved
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-red-400 hover:border-red-500 text-red-400'
                } ${isUpdating === correction.id ? 'opacity-50' : ''}`}
              >
                {correction.isResolved ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </button>
            ) : (
              <div
                className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                  correction.isResolved
                    ? 'bg-green-500 text-white'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}
              >
                {correction.isResolved ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-gray-900 dark:text-white ${correction.isResolved ? 'line-through' : ''}`}>
                {correction.content}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>Dodano {formatRelativeTime(correction.createdAt)}</span>
                {correction.isResolved && correction.resolvedAt && (
                  <>
                    <span>•</span>
                    <span className="text-green-600 dark:text-green-400">
                      Zrobiono {formatRelativeTime(correction.resolvedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
