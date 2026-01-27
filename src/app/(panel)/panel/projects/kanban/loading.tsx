'use client'

import { Filter } from 'lucide-react'

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Title */}
      <div className="h-5 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />

      {/* Tags */}
      <div className="flex gap-1 mb-3">
        <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-2">
          <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  )
}

function SkeletonColumn({ delay = 0, cardCount = 3 }: { delay?: number; cardCount?: number }) {
  return (
    <div
      className="flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-800/50 rounded-xl animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        {/* Progress bar skeleton */}
        <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3">
        {[...Array(cardCount)].map((_, i) => (
          <SkeletonCard key={i} delay={i * 100} />
        ))}
      </div>
    </div>
  )
}

export default function KanbanLoading() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Filter Bar skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              <div className="h-9 w-40 bg-gray-100 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>

      {/* Kanban Board skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        <SkeletonColumn delay={0} cardCount={3} />
        <SkeletonColumn delay={100} cardCount={2} />
        <SkeletonColumn delay={200} cardCount={4} />
        <SkeletonColumn delay={300} cardCount={1} />
        <SkeletonColumn delay={400} cardCount={2} />
      </div>

      {/* Loading indicator */}
      <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        <span className="ml-2 text-sm">Ładowanie tablicy Kanban...</span>
      </div>
    </div>
  )
}
