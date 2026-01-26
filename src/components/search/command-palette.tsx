'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, FolderOpen, Building2, User, FileText, Loader2,
  Home, LayoutGrid, Settings, Plus, Tag, Clock, ArrowRight,
  Command, Keyboard, Sparkles, Zap
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'project' | 'client' | 'user'
  title: string
  subtitle?: string
  href: string
}

interface QuickCommand {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: 'navigation' | 'actions' | 'recent'
  keywords?: string[]
}

export function CommandPalette() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mode, setMode] = useState<'search' | 'commands'>('commands')
  const [recentItems, setRecentItems] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Quick commands - dostępne bez wpisywania
  const quickCommands: QuickCommand[] = useMemo(() => [
    {
      id: 'home',
      title: 'Dashboard',
      description: 'Strona główna',
      icon: <Home className="w-4 h-4" />,
      action: () => router.push('/panel'),
      category: 'navigation',
      keywords: ['home', 'strona główna'],
    },
    {
      id: 'projects',
      title: 'Projekty',
      description: 'Lista projektów',
      icon: <FolderOpen className="w-4 h-4" />,
      action: () => router.push('/panel/projects'),
      category: 'navigation',
      keywords: ['projekty', 'lista'],
    },
    {
      id: 'kanban',
      title: 'Tablica Kanban',
      description: 'Widok tablicy',
      icon: <LayoutGrid className="w-4 h-4" />,
      action: () => router.push('/panel/projects/kanban'),
      category: 'navigation',
      keywords: ['kanban', 'board', 'tablica'],
    },
    {
      id: 'tickets',
      title: 'Tickety',
      description: 'Wszystkie zgłoszenia',
      icon: <FileText className="w-4 h-4" />,
      action: () => router.push('/panel/tickets'),
      category: 'navigation',
      keywords: ['tickety', 'zgłoszenia'],
    },
    {
      id: 'clients',
      title: 'Klienci',
      description: 'Zarządzanie klientami',
      icon: <Building2 className="w-4 h-4" />,
      action: () => router.push('/panel/clients'),
      category: 'navigation',
      keywords: ['klienci'],
    },
    {
      id: 'users',
      title: 'Użytkownicy',
      description: 'Zarządzanie użytkownikami',
      icon: <User className="w-4 h-4" />,
      action: () => router.push('/panel/users'),
      category: 'navigation',
      keywords: ['użytkownicy', 'pracownicy'],
    },
    {
      id: 'settings',
      title: 'Ustawienia',
      description: 'Konfiguracja systemu',
      icon: <Settings className="w-4 h-4" />,
      action: () => router.push('/panel/settings'),
      category: 'navigation',
      keywords: ['ustawienia', 'settings', 'konfiguracja'],
    },
    {
      id: 'new-project',
      title: 'Nowy projekt',
      description: 'Utwórz nowy projekt',
      icon: <Plus className="w-4 h-4" />,
      action: () => router.push('/panel/projects/new'),
      category: 'actions',
      keywords: ['nowy', 'projekt', 'dodaj'],
    },
    {
      id: 'new-ticket',
      title: 'Nowy ticket',
      description: 'Utwórz nowe zgłoszenie',
      icon: <Plus className="w-4 h-4" />,
      action: () => router.push('/panel/tickets/new'),
      category: 'actions',
      keywords: ['nowy', 'ticket', 'zgłoszenie'],
    },
    {
      id: 'new-client',
      title: 'Nowy klient',
      description: 'Dodaj konto klienta',
      icon: <Plus className="w-4 h-4" />,
      action: () => router.push('/panel/clients/new'),
      category: 'actions',
      keywords: ['nowy', 'klient', 'dodaj'],
    },
  ], [router])

  // Filtrowanie komend
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return quickCommands
    const q = query.toLowerCase()
    return quickCommands.filter(cmd =>
      cmd.title.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(q))
    )
  }, [query, quickCommands])

  // Grupowanie komend
  const groupedCommands = useMemo(() => ({
    navigation: filteredCommands.filter(c => c.category === 'navigation'),
    actions: filteredCommands.filter(c => c.category === 'actions'),
  }), [filteredCommands])

  // Łączenie wszystkich elementów do nawigacji
  const allItems = useMemo(() => {
    if (mode === 'search' && results.length > 0) {
      return results
    }
    return [...groupedCommands.navigation, ...groupedCommands.actions]
  }, [mode, results, groupedCommands])

  // Open with Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
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
      setMode('commands')
    }
  }, [isOpen])

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setMode('commands')
      return
    }

    // Jeśli zaczyna od "/" to tryb komend
    if (query.startsWith('/')) {
      setMode('commands')
      return
    }

    // Jeśli wpisano >= 2 znaki, szukaj w bazie
    if (query.length >= 2) {
      const timeoutId = setTimeout(async () => {
        setIsLoading(true)
        setMode('search')
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
    }
  }, [query])

  // Scroll selected into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector('[data-selected="true"]')
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = allItems[selectedIndex]
      if (item) {
        if ('href' in item) {
          selectResult(item as SearchResult)
        } else {
          executeCommand(item as QuickCommand)
        }
      }
    }
  }, [allItems, selectedIndex])

  function selectResult(result: SearchResult) {
    // Save to recent
    saveRecent(result.title)
    router.push(result.href)
    setIsOpen(false)
  }

  function executeCommand(cmd: QuickCommand) {
    // Save to recent
    saveRecent(cmd.title)
    cmd.action()
    setIsOpen(false)
  }

  function saveRecent(title: string) {
    setRecentItems(prev => {
      const newRecent = [title, ...prev.filter(r => r !== title)].slice(0, 5)
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentCommands', JSON.stringify(newRecent))
      }
      return newRecent
    })
  }

  // Load recent on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recentCommands')
      if (saved) {
        setRecentItems(JSON.parse(saved))
      }
    }
  }, [])

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

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative max-w-2xl mx-auto mt-[15vh] px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-scale">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400" />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Szukaj lub wpisz komendę..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-lg"
            />
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg">
              ESC
            </kbd>
          </div>

          {/* Results/Commands */}
          <div ref={resultsRef} className="max-h-[400px] overflow-y-auto py-2">
            {/* Search Results */}
            {mode === 'search' && results.length > 0 && (
              <div className="mb-2">
                <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Wyniki wyszukiwania
                </div>
                {results.map((result, index) => {
                  const isSelected = selectedIndex === index
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      data-selected={isSelected}
                      onClick={() => selectResult(result)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150
                        ${isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <div className={`
                        p-2 rounded-lg transition-colors
                        ${isSelected
                          ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }
                      `}>
                        {getIcon(result.type)}
                      </div>
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
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full capitalize
                        ${isSelected
                          ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }
                      `}>
                        {result.type}
                      </span>
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 text-primary-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Quick Commands */}
            {(mode === 'commands' || (mode === 'search' && results.length === 0 && !isLoading)) && (
              <>
                {/* No results message */}
                {mode === 'search' && results.length === 0 && query && !isLoading && (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    <Search className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p>Brak wyników dla "<span className="font-medium">{query}</span>"</p>
                    <p className="text-sm mt-1">Spróbuj innych słów kluczowych</p>
                  </div>
                )}

                {/* Navigation commands */}
                {groupedCommands.navigation.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      Szybka nawigacja
                    </div>
                    {groupedCommands.navigation.map((cmd) => {
                      flatIndex++
                      const isSelected = selectedIndex === flatIndex
                      return (
                        <button
                          key={cmd.id}
                          data-selected={isSelected}
                          onClick={() => executeCommand(cmd)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
                            ${isSelected
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          <div className={`
                            p-1.5 rounded-lg transition-colors
                            ${isSelected
                              ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }
                          `}>
                            {cmd.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{cmd.title}</div>
                            {cmd.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-primary-500" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Action commands */}
                {groupedCommands.actions.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <Plus className="w-3.5 h-3.5" />
                      Szybkie akcje
                    </div>
                    {groupedCommands.actions.map((cmd) => {
                      flatIndex++
                      const isSelected = selectedIndex === flatIndex
                      return (
                        <button
                          key={cmd.id}
                          data-selected={isSelected}
                          onClick={() => executeCommand(cmd)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
                            ${isSelected
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          <div className={`
                            p-1.5 rounded-lg transition-colors
                            ${isSelected
                              ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
                              : 'bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400'
                            }
                          `}>
                            {cmd.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{cmd.title}</div>
                            {cmd.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-primary-500" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">↓</kbd>
                <span className="hidden sm:inline">nawigacja</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">↵</kbd>
                <span className="hidden sm:inline">wybierz</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Command className="w-3.5 h-3.5" />
              <span>+</span>
              <span>K</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
