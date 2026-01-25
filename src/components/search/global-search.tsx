'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Folder, Ticket, Building2, FileText, Loader2 } from 'lucide-react'
import { searchAction } from './search-actions'

interface SearchResult {
  type: 'project' | 'ticket' | 'client' | 'comment'
  id: string
  title: string
  subtitle?: string
  url: string
}

interface GlobalSearchProps {
  isAdmin?: boolean
}

export function GlobalSearch({ isAdmin }: GlobalSearchProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Search debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      const res = await searchAction(query)
      setResults(res)
      setIsLoading(false)
      setSelectedIndex(0)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i < results.length - 1 ? i + 1 : i))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i > 0 ? i - 1 : i))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        router.push(results[selectedIndex].url)
        setIsOpen(false)
        setQuery('')
      }
    },
    [results, selectedIndex, router]
  )

  function handleSelect(result: SearchResult) {
    router.push(result.url)
    setIsOpen(false)
    setQuery('')
  }

  function close() {
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  const iconMap = {
    project: Folder,
    ticket: Ticket,
    client: Building2,
    comment: FileText,
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Szukaj...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={close}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[20%] mx-auto max-w-xl z-50 animate-fade-in-scale">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Szukaj projektów, ticketów, klientów..."
              className="flex-1 py-4 text-lg outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : query ? (
              <button onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            ) : null}
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.map((result, index) => {
                const Icon = iconMap[result.type]
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        index === selectedIndex
                          ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 capitalize">
                      {result.type === 'project' && 'Projekt'}
                      {result.type === 'ticket' && 'Ticket'}
                      {result.type === 'client' && 'Klient'}
                      {result.type === 'comment' && 'Komentarz'}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : query && !isLoading ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              Brak wyników dla "{query}"
            </div>
          ) : !query ? (
            <div className="py-8 text-center text-gray-400">
              <p>Wpisz frazę aby wyszukać</p>
              <p className="text-sm mt-1">Projekty, tickety, klienci, komentarze</p>
            </div>
          ) : null}

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border dark:border-gray-600">↑↓</kbd>
                nawigacja
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border dark:border-gray-600">Enter</kbd>
                otwórz
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border dark:border-gray-600">Esc</kbd>
              zamknij
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
