'use client'

import { Search, Filter, Plus, LayoutGrid } from 'lucide-react'

function SkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <tr
      className="animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <td className="table-cell">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </td>
      <td className="table-cell">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex gap-1">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      </td>
      <td className="table-cell">
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </td>
      <td className="table-cell">
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </td>
      <td className="table-cell">
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </td>
      <td className="table-cell hidden sm:table-cell">
        <div className="h-5 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
      </td>
      <td className="table-cell hidden md:table-cell">
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </td>
      <td className="table-cell hidden lg:table-cell">
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </td>
    </tr>
  )
}

export default function ProjectsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="btn-secondary opacity-50">
            <LayoutGrid className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Kanban</span>
          </div>
          <div className="btn-primary opacity-50">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Nowy projekt</span>
          </div>
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <div className="h-10 w-40 bg-gray-100 dark:bg-gray-700 rounded-lg" />
            <div className="h-10 w-40 bg-gray-100 dark:bg-gray-700 rounded-lg" />
            <div className="h-10 w-24 bg-gray-100 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="table-header">Numer</th>
                <th className="table-header">Tytuł</th>
                <th className="table-header">Klient</th>
                <th className="table-header">Zlecił</th>
                <th className="table-header">Status</th>
                <th className="table-header hidden sm:table-cell">Tickety</th>
                <th className="table-header hidden md:table-cell">Deadline</th>
                <th className="table-header hidden lg:table-cell">Aktualizacja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {[...Array(8)].map((_, i) => (
                <SkeletonRow key={i} delay={i * 50} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
