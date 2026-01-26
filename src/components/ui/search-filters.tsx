'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Search,
  X,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
} from 'lucide-react'

// Types
interface FilterOption {
  value: string
  label: string
  color?: string
}

interface FilterConfig {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'date' | 'daterange'
  options?: FilterOption[]
  placeholder?: string
}

interface FilterValue {
  [key: string]: string | string[] | { from?: string; to?: string }
}

interface SearchWithFiltersProps {
  placeholder?: string
  filters: FilterConfig[]
  value: {
    search: string
    filters: FilterValue
  }
  onChange: (value: { search: string; filters: FilterValue }) => void
  onSearch?: () => void
  className?: string
}

export function SearchWithFilters({
  placeholder = 'Szukaj...',
  filters,
  value,
  onChange,
  onSearch,
  className = '',
}: SearchWithFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(value.search)
  const filtersRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Count active filters
  const activeFilterCount = Object.values(value.filters).filter((v) => {
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') return v.from || v.to
    return Boolean(v)
  }).length

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (localSearch !== value.search) {
        onChange({ ...value, search: localSearch })
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [localSearch])

  // Sync local search with value
  useEffect(() => {
    setLocalSearch(value.search)
  }, [value.search])

  // Close filters on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setIsFiltersOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateFilter = useCallback(
    (filterId: string, filterValue: string | string[] | { from?: string; to?: string }) => {
      onChange({
        ...value,
        filters: {
          ...value.filters,
          [filterId]: filterValue,
        },
      })
    },
    [value, onChange]
  )

  const clearFilters = useCallback(() => {
    const emptyFilters: FilterValue = {}
    filters.forEach((f) => {
      if (f.type === 'multiselect') {
        emptyFilters[f.id] = []
      } else if (f.type === 'daterange') {
        emptyFilters[f.id] = {}
      } else {
        emptyFilters[f.id] = ''
      }
    })
    onChange({ search: '', filters: emptyFilters })
    setLocalSearch('')
  }, [filters, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.()
    }
  }

  return (
    <div className={`space-y-3 ${className}`} ref={filtersRef}>
      {/* Search bar with filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('')
                onChange({ ...value, search: '' })
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
            isFiltersOpen || activeFilterCount > 0
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtry</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          {isFiltersOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Filters panel */}
      {isFiltersOpen && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <FilterField
                key={filter.id}
                config={filter}
                value={value.filters[filter.id]}
                onChange={(v) => updateFilter(filter.id, v)}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <RotateCcw className="w-4 h-4" />
              Wyczyść filtry
            </button>
          </div>
        </div>
      )}

      {/* Active filters chips */}
      {activeFilterCount > 0 && !isFiltersOpen && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const filterValue = value.filters[filter.id]
            if (!filterValue) return null

            if (filter.type === 'multiselect' && Array.isArray(filterValue) && filterValue.length > 0) {
              const selectedLabels = filterValue
                .map((v) => filter.options?.find((o) => o.value === v)?.label)
                .filter(Boolean)
              return (
                <FilterChip
                  key={filter.id}
                  label={`${filter.label}: ${selectedLabels.join(', ')}`}
                  onRemove={() => updateFilter(filter.id, [])}
                />
              )
            }

            if (filter.type === 'select' && typeof filterValue === 'string' && filterValue) {
              const selectedLabel = filter.options?.find((o) => o.value === filterValue)?.label
              return (
                <FilterChip
                  key={filter.id}
                  label={`${filter.label}: ${selectedLabel}`}
                  onRemove={() => updateFilter(filter.id, '')}
                />
              )
            }

            if (filter.type === 'daterange' && typeof filterValue === 'object') {
              const { from, to } = filterValue as { from?: string; to?: string }
              if (from || to) {
                const label = from && to ? `${from} - ${to}` : from ? `od ${from}` : `do ${to}`
                return (
                  <FilterChip
                    key={filter.id}
                    label={`${filter.label}: ${label}`}
                    onRemove={() => updateFilter(filter.id, {})}
                  />
                )
              }
            }

            return null
          })}
        </div>
      )}
    </div>
  )
}

// Filter field component
interface FilterFieldProps {
  config: FilterConfig
  value: string | string[] | { from?: string; to?: string } | undefined
  onChange: (value: string | string[] | { from?: string; to?: string }) => void
}

function FilterField({ config, value, onChange }: FilterFieldProps) {
  if (config.type === 'select') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {config.label}
        </label>
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{config.placeholder || 'Wszystkie'}</option>
          {config.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (config.type === 'multiselect') {
    const selectedValues = (value as string[]) || []
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {config.label}
        </label>
        <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
          {config.options?.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <div
                className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                  selectedValues.includes(option.value)
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {selectedValues.includes(option.value) && <Check className="w-3 h-3" />}
              </div>
              {option.color && (
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  if (config.type === 'daterange') {
    const dateValue = (value as { from?: string; to?: string }) || {}
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {config.label}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateValue.from || ''}
              onChange={(e) => onChange({ ...dateValue, from: e.target.value })}
              className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="Od"
            />
          </div>
          <div className="relative flex-1">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateValue.to || ''}
              onChange={(e) => onChange({ ...dateValue, to: e.target.value })}
              className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="Do"
            />
          </div>
        </div>
      </div>
    )
  }

  return null
}

// Filter chip component
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm">
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
