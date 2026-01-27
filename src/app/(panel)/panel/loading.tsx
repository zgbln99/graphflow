'use client'

import {
  Briefcase,
  TrendingUp,
  CheckCircle,
  Building2,
  BarChart3,
  Calendar,
  ArrowRight,
} from 'lucide-react'

function SkeletonStatCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 p-4 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div>
          <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  )
}

function SkeletonProjectItem({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="p-4 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard delay={0} />
        <SkeletonStatCard delay={50} />
        <SkeletonStatCard delay={100} />
        <SkeletonStatCard delay={150} />
      </div>

      {/* Charts and lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Chart placeholder */}
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-6 animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-300 dark:text-gray-600" />
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>

        {/* Recent projects */}
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex items-center gap-1">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <SkeletonProjectItem key={i} delay={i * 50} />
            ))}
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-300 dark:text-gray-600" />
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(4)].map((_, i) => (
              <SkeletonProjectItem key={i} delay={i * 50} />
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-300 dark:text-gray-600" />
            <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 p-3 animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
              <div>
                <div className="h-5 w-8 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
