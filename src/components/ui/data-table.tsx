'use client'

import { useState, useMemo, useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

// Types
type SortDirection = 'asc' | 'desc' | null

interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  width?: string
  render?: (row: T, index: number) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
  selectable?: boolean
  onSelectionChange?: (selectedRows: T[]) => void
  searchable?: boolean
  searchKeys?: (keyof T)[]
  pagination?: boolean
  pageSize?: number
  stickyHeader?: boolean
  className?: string
  emptyMessage?: string
  loading?: boolean
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  selectable = false,
  onSelectionChange,
  searchable = false,
  searchKeys = [],
  pagination = false,
  pageSize = 10,
  stickyHeader = true,
  className = '',
  emptyMessage = 'Brak danych',
  loading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Handle sort
  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortKey(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }, [sortKey, sortDirection])

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data]

    // Filter by search
    if (searchQuery && searchKeys.length > 0) {
      const query = searchQuery.toLowerCase()
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const value = row[key]
          return value && String(value).toLowerCase().includes(query)
        })
      )
    }

    // Sort
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortKey]
        const bValue = (b as any)[sortKey]

        if (aValue === bValue) return 0
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        const comparison = aValue < bValue ? -1 : 1
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, searchQuery, searchKeys, sortKey, sortDirection])

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData
    const start = (currentPage - 1) * pageSize
    return processedData.slice(start, start + pageSize)
  }, [processedData, pagination, currentPage, pageSize])

  const totalPages = Math.ceil(processedData.length / pageSize)

  // Selection
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set())
      onSelectionChange?.([])
    } else {
      const newSelected = new Set(paginatedData.map((row) => row.id))
      setSelectedIds(newSelected)
      onSelectionChange?.(paginatedData)
    }
  }, [paginatedData, selectedIds, onSelectionChange])

  const handleSelectRow = useCallback((row: T) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(row.id)) {
      newSelected.delete(row.id)
    } else {
      newSelected.add(row.id)
    }
    setSelectedIds(newSelected)
    onSelectionChange?.(data.filter((r) => newSelected.has(r.id)))
  }, [selectedIds, data, onSelectionChange])

  const isAllSelected = paginatedData.length > 0 && selectedIds.size === paginatedData.length
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < paginatedData.length

  // Get column value
  const getValue = (row: T, column: Column<T>) => {
    if (column.render) {
      return column.render(row, data.indexOf(row))
    }
    return (row as any)[column.key]
  }

  return (
    <div className={`${className}`}>
      {/* Search bar */}
      {searchable && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Szukaj..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      {selectable && selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800 flex items-center gap-4">
          <span className="text-sm text-primary-700 dark:text-primary-300 font-medium">
            Zaznaczono: {selectedIds.size}
          </span>
          <button
            onClick={() => {
              setSelectedIds(new Set())
              onSelectionChange?.([])
            }}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Odznacz wszystkie
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-gray-50 dark:bg-gray-800 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <button
                    onClick={handleSelectAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isAllSelected || isSomeSelected
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {isAllSelected && <Check className="w-3 h-3" />}
                    {isSomeSelected && <div className="w-2 h-0.5 bg-white" />}
                  </button>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${column.className || ''}`}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(String(column.key))}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group"
                    >
                      {column.header}
                      <span className="text-gray-400 group-hover:text-gray-500">
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                        )}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  {selectable && (
                    <td className="px-4 py-4">
                      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    transition-colors
                    ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
                    ${selectedIds.has(row.id) ? 'bg-primary-50 dark:bg-primary-900/10' : ''}
                  `}
                >
                  {selectable && (
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleSelectRow(row)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedIds.has(row.id)
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {selectedIds.has(row.id) && <Check className="w-3 h-3" />}
                      </button>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-4 py-4 text-gray-900 dark:text-white ${column.className || ''}`}
                    >
                      {getValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pokazano {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, processedData.length)} z {processedData.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
