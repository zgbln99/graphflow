'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Command, Keyboard } from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['⌘', 'K'], description: 'Otwórz paletę komend', category: 'Nawigacja' },
  { keys: ['G', 'H'], description: 'Przejdź do Dashboard', category: 'Nawigacja' },
  { keys: ['G', 'P'], description: 'Przejdź do Projektów', category: 'Nawigacja' },
  { keys: ['G', 'T'], description: 'Przejdź do Ticketów', category: 'Nawigacja' },
  { keys: ['G', 'K'], description: 'Przejdź do Kanban', category: 'Nawigacja' },
  { keys: ['G', 'S'], description: 'Przejdź do Ustawień', category: 'Nawigacja' },

  // Actions
  { keys: ['N', 'P'], description: 'Nowy projekt', category: 'Akcje' },
  { keys: ['N', 'T'], description: 'Nowy ticket', category: 'Akcje' },
  { keys: ['?'], description: 'Pokaż skróty klawiszowe', category: 'Akcje' },
  { keys: ['Esc'], description: 'Zamknij modal/dialog', category: 'Akcje' },

  // Search & Filter
  { keys: ['/'], description: 'Fokus na wyszukiwanie', category: 'Wyszukiwanie' },
  { keys: ['⌘', 'F'], description: 'Filtruj wyniki', category: 'Wyszukiwanie' },
]

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open with ? key (shift + /)
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      // Don't trigger if in input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }
      e.preventDefault()
      setIsOpen((prev) => !prev)
    }

    // Close with Escape
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false)
    }
  }, [isOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, Shortcut[]>)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl animate-fade-in-scale"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Skróty klawiszowe
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 grid md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <span className="text-gray-700 dark:text-gray-300 text-sm">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex}>
                            <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700">
                              {key === '⌘' ? (
                                <Command className="w-3 h-3" />
                              ) : (
                                key
                              )}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-0.5 text-gray-400">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Naciśnij <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">?</kbd> aby
              pokazać lub ukryć tę pomoc
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Keyboard shortcut indicator for buttons
interface ShortcutIndicatorProps {
  keys: string[]
  className?: string
}

export function ShortcutIndicator({ keys, className = '' }: ShortcutIndicatorProps) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {keys.map((key, index) => (
        <span key={index}>
          <kbd className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
            {key === '⌘' ? <Command className="w-2.5 h-2.5" /> : key}
          </kbd>
          {index < keys.length - 1 && <span className="mx-0.5 text-gray-300">+</span>}
        </span>
      ))}
    </span>
  )
}
