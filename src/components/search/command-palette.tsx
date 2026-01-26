'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, FolderOpen, Building2, User, FileText, Loader2 } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'project' | 'client' | 'user'
  title: string
  subtitle?: string
  href: string
}

export function CommandPalette() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Open with Cmd+K or Ctrl+K
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
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results)
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      router.push(results[selectedIndex].href)
      setIsOpen(false)
    }
  }, [results, selectedIndex, router])

  function selectResult(result: SearchResult) {
    router.push(result.href)
    setIsOpen(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="w-4 h-4" />
      case 'client':
        return <Building2 className="w-4 h-4" />
      case 'user':
        return <User className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative max-w-2xl mx-auto mt-[20vh]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Szukaj projektow, klientow..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto">
            {results.length === 0 && query && !isLoading && (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                Brak wynikow dla "{query}"
              </div>
            )}

            {results.length === 0 && !query && (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <p className="mb-2">Wpisz fraze aby wyszukac</p>
                <p className="text-sm">Projekty, klienci, uzytkownicy</p>
              </div>
            )}

            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => selectResult(result)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  index === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                <div className="text-gray-400">{getIcon(result.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {result.title}
                  </p>
                  {result.subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 capitalize">{result.type}</span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑↓</kbd> nawigacja</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> wybierz</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> zamknij</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
