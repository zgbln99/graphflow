'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Filter, SortAsc, SortDesc, X } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface SortOption {
  value: string
  label: string
}

interface ListFiltersProps {
  filters?: FilterConfig[]
  sortOptions?: SortOption[]
  searchPlaceholder?: string
  showSearch?: boolean
}

export function ListFilters({
  filters = [],
  sortOptions = [],
  searchPlaceholder = 'Szukaj...',
  showSearch = true,
}: ListFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [showFiltersMenu, setShowFiltersMenu] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({ search: search || null })
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      // Reset page when filters change
      if (!updates.hasOwnProperty('page')) {
        params.delete('page')
      }

      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams]
  )

  const currentSort = searchParams.get('sort') || ''
  const currentOrder = searchParams.get('order') || 'desc'

  const activeFiltersCount = filters.filter(
    (f) => searchParams.get(f.key)
  ).length

  function clearAllFilters() {
    const params = new URLSearchParams()
    router.push(pathname)
    setSearch('')
  }

  function toggleSortOrder() {
    updateParams({ order: currentOrder === 'asc' ? 'desc' : 'asc' })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        {showSearch && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="input pl-9 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        )}

        {/* Filter dropdowns */}
        {filters.map((filter) => {
          const currentValue = searchParams.get(filter.key) || ''
          return (
            <select
              key={filter.key}
              value={currentValue}
              onChange={(e) => updateParams({ [filter.key]: e.target.value || null })}
              className="input dark:bg-gray-800 dark:border-gray-700 dark:text-white min-w-[140px]"
            >
              <option value="">{filter.label}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )
        })}

        {/* Sort */}
        {sortOptions.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={currentSort}
              onChange={(e) => updateParams({ sort: e.target.value || null })}
              className="input dark:bg-gray-800 dark:border-gray-700 dark:text-white min-w-[140px]"
            >
              <option value="">Sortuj...</option>
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {currentSort && (
              <button
                onClick={toggleSortOrder}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title={currentOrder === 'asc' ? 'Rosnąco' : 'Malejąco'}
              >
                {currentOrder === 'asc' ? (
                  <SortAsc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <SortDesc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            )}
          </div>
        )}

        {/* Clear all */}
        {(activeFiltersCount > 0 || search) && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <X className="w-4 h-4" />
            Wyczyść filtry
          </button>
        )}
      </div>

      {/* Active filters chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const value = searchParams.get(filter.key)
            if (!value) return null

            const option = filter.options.find((o) => o.value === value)

            return (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm"
              >
                <span className="text-primary-500 dark:text-primary-500">{filter.label}:</span>
                {option?.label || value}
                <button
                  onClick={() => updateParams({ [filter.key]: null })}
                  className="p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
