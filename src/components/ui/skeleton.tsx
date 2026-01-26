'use client'

import { ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  children?: ReactNode
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className={`h-4 ${i === 0 ? 'w-16' : i === columns - 1 ? 'w-20' : 'w-full'}`} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonProjectCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <SkeletonText lines={2} />
      <div className="flex items-center gap-2 mt-4">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

export function SkeletonKanbanColumn() {
  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonProjectCard key={i} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonKanbanBoard() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonKanbanColumn key={i} />
      ))}
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonProjectDetail() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <SkeletonText lines={4} />
          </div>
          <div className="card p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonForm() {
  return (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  )
}

// Loading wrapper that shows skeleton while loading
interface LoadingWrapperProps {
  isLoading: boolean
  skeleton: ReactNode
  children: ReactNode
}

export function LoadingWrapper({ isLoading, skeleton, children }: LoadingWrapperProps) {
  if (isLoading) {
    return <>{skeleton}</>
  }
  return <>{children}</>
}
