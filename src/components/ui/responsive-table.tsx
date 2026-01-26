'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

// Types
interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  mobileHidden?: boolean  // Hide on mobile
  mobilePrimary?: boolean // Show as primary text on mobile
  mobileSecondary?: boolean // Show as secondary text on mobile
}

interface ResponsiveTableProps<T extends { id: string | number }> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  loading?: boolean
}

export function ResponsiveTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'Brak danych',
  loading = false,
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set())

  const toggleRow = (id: string | number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const getValue = (row: T, column: Column<T>) => {
    if (column.render) {
      return column.render(row)
    }
    return (row as any)[column.key]
  }

  const primaryColumn = columns.find(c => c.mobilePrimary) || columns[0]
  const secondaryColumn = columns.find(c => c.mobileSecondary)
  const detailColumns = columns.filter(c => !c.mobilePrimary && !c.mobileSecondary && !c.mobileHidden)

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.filter(c => !c.mobileHidden).map((column) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
              >
                {columns.filter(c => !c.mobileHidden).map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-4 py-4 text-gray-900 dark:text-white"
                  >
                    {getValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {data.map((row) => {
          const isExpanded = expandedRows.has(row.id)

          return (
            <div
              key={row.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Main row */}
              <div
                onClick={() => onRowClick?.(row)}
                className={`p-4 ${onRowClick ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-700' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {getValue(row, primaryColumn)}
                    </p>
                    {secondaryColumn && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {getValue(row, secondaryColumn)}
                      </p>
                    )}
                  </div>
                  {detailColumns.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleRow(row.id)
                      }}
                      className="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && detailColumns.length > 0 && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  {detailColumns.map((column) => (
                    <div key={String(column.key)} className="flex items-start justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {column.header}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white text-right ml-4">
                        {getValue(row, column)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
