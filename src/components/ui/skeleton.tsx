'use client'

import { ReactNode, HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded'
type SkeletonAnimation = 'pulse' | 'wave' | 'none'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
  animation?: SkeletonAnimation
  width?: string | number
  height?: string | number
  className?: string
}

// ============================================================================
// Animation Classes
// ============================================================================

const animationClasses: Record<SkeletonAnimation, string> = {
  pulse: 'animate-pulse',
  wave: 'animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]',
  none: '',
}

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-lg',
}

// ============================================================================
// Base Skeleton Component
// ============================================================================

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      animation = 'pulse',
      width,
      height,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'bg-gray-200 dark:bg-gray-700'

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        role="status"
        aria-label="Loading..."
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

// ============================================================================
// SkeletonText - Multiple lines of text
// ============================================================================

interface SkeletonTextProps {
  lines?: number
  animation?: SkeletonAnimation
  lastLineWidth?: string
  lineHeight?: string
  gap?: string
  className?: string
}

export function SkeletonText({
  lines = 3,
  animation = 'pulse',
  lastLineWidth = '75%',
  lineHeight = '1rem',
  gap = '0.5rem',
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          animation={animation}
          className="w-full"
          style={{
            height: lineHeight,
            width: i === lines - 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// SkeletonAvatar - Circular avatar placeholder
// ============================================================================

interface SkeletonAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  animation?: SkeletonAnimation
  className?: string
}

const avatarSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

export function SkeletonAvatar({
  size = 'md',
  animation = 'pulse',
  className,
}: SkeletonAvatarProps) {
  const dimension = typeof size === 'number' ? size : avatarSizes[size]

  return (
    <Skeleton
      variant="circular"
      animation={animation}
      width={dimension}
      height={dimension}
      className={cn('flex-shrink-0', className)}
    />
  )
}

// ============================================================================
// SkeletonCard - Card placeholder with flexible layout
// ============================================================================

interface SkeletonCardProps {
  showAvatar?: boolean
  showImage?: boolean
  imageHeight?: string | number
  lines?: number
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonCard({
  showAvatar = true,
  showImage = false,
  imageHeight = 160,
  lines = 2,
  animation = 'pulse',
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'card overflow-hidden',
        animation === 'pulse' && 'animate-pulse',
        className
      )}
    >
      {showImage && (
        <Skeleton
          variant="rectangular"
          animation={animation === 'pulse' ? 'none' : animation}
          height={imageHeight}
          className="w-full"
        />
      )}
      <div className="p-6">
        <div className="flex items-start gap-4">
          {showAvatar && (
            <Skeleton
              variant="rounded"
              animation={animation === 'pulse' ? 'none' : animation}
              width={48}
              height={48}
              className="flex-shrink-0"
            />
          )}
          <div className="flex-1 space-y-3">
            <Skeleton
              variant="text"
              animation={animation === 'pulse' ? 'none' : animation}
              height={20}
              className="w-1/3"
            />
            <SkeletonText
              lines={lines}
              animation={animation === 'pulse' ? 'none' : animation}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SkeletonTable - Table with configurable rows and columns
// ============================================================================

interface SkeletonTableProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonTableRow({
  columns = 5,
  animation = 'pulse',
}: {
  columns?: number
  animation?: SkeletonAnimation
}) {
  return (
    <tr className={animation === 'pulse' ? 'animate-pulse' : ''}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton
            variant="text"
            animation={animation === 'pulse' ? 'none' : animation}
            height={16}
            className={cn(
              i === 0 ? 'w-16' : i === columns - 1 ? 'w-20' : 'w-full'
            )}
          />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({
  rows = 5,
  columns = 5,
  showHeader = true,
  animation = 'pulse',
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn('card overflow-hidden', className)}>
      <table className="w-full">
        {showHeader && (
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton
                    variant="text"
                    animation={animation}
                    height={16}
                    className="w-20"
                  />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} animation={animation} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// SkeletonKanban - Kanban board placeholder
// ============================================================================

interface SkeletonKanbanProps {
  columns?: number
  cardsPerColumn?: number
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonKanbanCard({
  animation = 'pulse',
}: {
  animation?: SkeletonAnimation
}) {
  return (
    <div
      className={cn('card p-4', animation === 'pulse' && 'animate-pulse')}
    >
      <div className="flex items-start justify-between mb-3">
        <Skeleton
          variant="text"
          animation={animation === 'pulse' ? 'none' : animation}
          height={20}
          className="w-20"
        />
        <Skeleton
          variant="rounded"
          animation={animation === 'pulse' ? 'none' : animation}
          height={20}
          className="w-16 rounded-full"
        />
      </div>
      <Skeleton
        variant="text"
        animation={animation === 'pulse' ? 'none' : animation}
        height={20}
        className="w-3/4 mb-2"
      />
      <SkeletonText
        lines={2}
        animation={animation === 'pulse' ? 'none' : animation}
      />
      <div className="flex items-center gap-2 mt-4">
        <SkeletonAvatar
          size="xs"
          animation={animation === 'pulse' ? 'none' : animation}
        />
        <Skeleton
          variant="text"
          animation={animation === 'pulse' ? 'none' : animation}
          height={16}
          className="w-24"
        />
      </div>
    </div>
  )
}

export function SkeletonKanbanColumn({
  cards = 3,
  animation = 'pulse',
}: {
  cards?: number
  animation?: SkeletonAnimation
}) {
  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton
          variant="text"
          animation={animation}
          height={20}
          className="w-24"
        />
        <Skeleton
          variant="circular"
          animation={animation}
          width={24}
          height={24}
        />
      </div>
      <div className="space-y-3">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonKanbanCard key={i} animation={animation} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonKanban({
  columns = 4,
  cardsPerColumn = 3,
  animation = 'pulse',
  className,
}: SkeletonKanbanProps) {
  return (
    <div className={cn('flex gap-6 overflow-x-auto pb-4', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonKanbanColumn
          key={i}
          cards={cardsPerColumn}
          animation={animation}
        />
      ))}
    </div>
  )
}

// Aliases for backwards compatibility
export const SkeletonKanbanBoard = SkeletonKanban

// ============================================================================
// SkeletonProjectCard - Project card placeholder
// ============================================================================

interface SkeletonProjectCardProps {
  showDescription?: boolean
  showMeta?: boolean
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonProjectCard({
  showDescription = true,
  showMeta = true,
  animation = 'pulse',
  className,
}: SkeletonProjectCardProps) {
  return (
    <div
      className={cn('card p-4', animation === 'pulse' && 'animate-pulse', className)}
    >
      <div className="flex items-start justify-between mb-3">
        <Skeleton
          variant="text"
          animation={animation === 'pulse' ? 'none' : animation}
          height={20}
          className="w-20"
        />
        <Skeleton
          variant="rounded"
          animation={animation === 'pulse' ? 'none' : animation}
          height={20}
          className="w-16 rounded-full"
        />
      </div>
      <Skeleton
        variant="text"
        animation={animation === 'pulse' ? 'none' : animation}
        height={20}
        className="w-3/4 mb-2"
      />
      {showDescription && (
        <SkeletonText
          lines={2}
          animation={animation === 'pulse' ? 'none' : animation}
        />
      )}
      {showMeta && (
        <div className="flex items-center gap-2 mt-4">
          <SkeletonAvatar
            size="xs"
            animation={animation === 'pulse' ? 'none' : animation}
          />
          <Skeleton
            variant="text"
            animation={animation === 'pulse' ? 'none' : animation}
            height={16}
            className="w-24"
          />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SkeletonList - Generic list placeholder
// ============================================================================

interface SkeletonListProps {
  items?: number
  showAvatar?: boolean
  showAction?: boolean
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonListItem({
  showAvatar = true,
  showAction = false,
  animation = 'pulse',
}: {
  showAvatar?: boolean
  showAction?: boolean
  animation?: SkeletonAnimation
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4',
        animation === 'pulse' && 'animate-pulse'
      )}
    >
      {showAvatar && (
        <SkeletonAvatar
          size="md"
          animation={animation === 'pulse' ? 'none' : animation}
        />
      )}
      <div className="flex-1 min-w-0">
        <Skeleton
          variant="text"
          animation={animation === 'pulse' ? 'none' : animation}
          height={18}
          className="w-1/2 mb-2"
        />
        <Skeleton
          variant="text"
          animation={animation === 'pulse' ? 'none' : animation}
          height={14}
          className="w-3/4"
        />
      </div>
      {showAction && (
        <Skeleton
          variant="rounded"
          animation={animation === 'pulse' ? 'none' : animation}
          width={80}
          height={32}
        />
      )}
    </div>
  )
}

export function SkeletonList({
  items = 5,
  showAvatar = true,
  showAction = false,
  animation = 'pulse',
  className,
}: SkeletonListProps) {
  return (
    <div
      className={cn(
        'card divide-y divide-gray-100 dark:divide-gray-700',
        className
      )}
    >
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem
          key={i}
          showAvatar={showAvatar}
          showAction={showAction}
          animation={animation}
        />
      ))}
    </div>
  )
}

// ============================================================================
// SkeletonStats - Statistics cards placeholder
// ============================================================================

interface SkeletonStatsProps {
  count?: number
  columns?: 2 | 3 | 4
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonStatCard({
  animation = 'pulse',
}: {
  animation?: SkeletonAnimation
}) {
  return (
    <div
      className={cn('card p-6', animation === 'pulse' && 'animate-pulse')}
    >
      <div className="flex items-center gap-4">
        <Skeleton
          variant="rounded"
          animation={animation === 'pulse' ? 'none' : animation}
          width={48}
          height={48}
        />
        <div className="flex-1">
          <Skeleton
            variant="text"
            animation={animation === 'pulse' ? 'none' : animation}
            height={16}
            className="w-20 mb-2"
          />
          <Skeleton
            variant="text"
            animation={animation === 'pulse' ? 'none' : animation}
            height={32}
            className="w-16"
          />
        </div>
      </div>
    </div>
  )
}

export function SkeletonStats({
  count = 4,
  columns = 4,
  animation = 'pulse',
  className,
}: SkeletonStatsProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div
      className={cn('grid grid-cols-1 gap-6', gridCols[columns], className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} animation={animation} />
      ))}
    </div>
  )
}

// ============================================================================
// SkeletonTimeline - Vertical timeline placeholder
// ============================================================================

interface SkeletonTimelineProps {
  items?: number
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonTimelineItem({
  isLast = false,
  animation = 'pulse',
}: {
  isLast?: boolean
  animation?: SkeletonAnimation
}) {
  return (
    <div
      className={cn('flex gap-4', animation === 'pulse' && 'animate-pulse')}
    >
      <div className="flex flex-col items-center">
        <Skeleton
          variant="circular"
          animation={animation === 'pulse' ? 'none' : animation}
          width={32}
          height={32}
        />
        {!isLast && (
          <Skeleton
            variant="rectangular"
            animation={animation === 'pulse' ? 'none' : animation}
            width={2}
            className="flex-1 min-h-[40px]"
          />
        )}
      </div>
      <div className={cn('pb-6 flex-1', isLast && 'pb-0')}>
        <Skeleton
          variant="text"
          animation={animation === 'pulse' ? 'none' : animation}
          height={18}
          className="w-32 mb-1"
        />
        <Skeleton
          variant="text"
          animation={animation === 'pulse' ? 'none' : animation}
          height={14}
          className="w-24 mb-3"
        />
        <SkeletonText
          lines={2}
          animation={animation === 'pulse' ? 'none' : animation}
        />
      </div>
    </div>
  )
}

export function SkeletonTimeline({
  items = 4,
  animation = 'pulse',
  className,
}: SkeletonTimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonTimelineItem
          key={i}
          isLast={i === items - 1}
          animation={animation}
        />
      ))}
    </div>
  )
}

// ============================================================================
// SkeletonForm - Form fields placeholder
// ============================================================================

interface SkeletonFormProps {
  fields?: number
  showButtons?: boolean
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonForm({
  fields = 4,
  showButtons = true,
  animation = 'pulse',
  className,
}: SkeletonFormProps) {
  return (
    <div
      className={cn('space-y-6', animation === 'pulse' && 'animate-pulse', className)}
    >
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton
            variant="text"
            animation={animation === 'pulse' ? 'none' : animation}
            height={16}
            className="w-24 mb-2"
          />
          <Skeleton
            variant="rounded"
            animation={animation === 'pulse' ? 'none' : animation}
            height={40}
            className="w-full"
          />
        </div>
      ))}
      {showButtons && (
        <div className="flex gap-3">
          <Skeleton
            variant="rounded"
            animation={animation === 'pulse' ? 'none' : animation}
            width={96}
            height={40}
          />
          <Skeleton
            variant="rounded"
            animation={animation === 'pulse' ? 'none' : animation}
            width={96}
            height={40}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SkeletonProjectDetail - Full project detail page placeholder
// ============================================================================

interface SkeletonProjectDetailProps {
  animation?: SkeletonAnimation
  className?: string
}

export function SkeletonProjectDetail({
  animation = 'pulse',
  className,
}: SkeletonProjectDetailProps) {
  return (
    <div
      className={cn('space-y-6', animation === 'pulse' && 'animate-pulse', className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton
              variant="text"
              animation={animation === 'pulse' ? 'none' : animation}
              height={24}
              className="w-24"
            />
            <Skeleton
              variant="rounded"
              animation={animation === 'pulse' ? 'none' : animation}
              height={24}
              className="w-20 rounded-full"
            />
          </div>
          <Skeleton
            variant="text"
            animation={animation === 'pulse' ? 'none' : animation}
            height={32}
            className="w-2/3 mb-2"
          />
          <Skeleton
            variant="text"
            animation={animation === 'pulse' ? 'none' : animation}
            height={16}
            className="w-1/2"
          />
        </div>
        <Skeleton
          variant="rounded"
          animation={animation === 'pulse' ? 'none' : animation}
          width={96}
          height={40}
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <Skeleton
              variant="text"
              animation={animation === 'pulse' ? 'none' : animation}
              height={24}
              className="w-32 mb-4"
            />
            <SkeletonText
              lines={4}
              animation={animation === 'pulse' ? 'none' : animation}
            />
          </div>
          <div className="card p-6">
            <Skeleton
              variant="text"
              animation={animation === 'pulse' ? 'none' : animation}
              height={24}
              className="w-32 mb-4"
            />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton
                    variant="rounded"
                    animation={animation === 'pulse' ? 'none' : animation}
                    width={40}
                    height={40}
                  />
                  <div className="flex-1">
                    <Skeleton
                      variant="text"
                      animation={animation === 'pulse' ? 'none' : animation}
                      height={16}
                      className="w-48 mb-1"
                    />
                    <Skeleton
                      variant="text"
                      animation={animation === 'pulse' ? 'none' : animation}
                      height={12}
                      className="w-24"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <Skeleton
              variant="text"
              animation={animation === 'pulse' ? 'none' : animation}
              height={24}
              className="w-24 mb-4"
            />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton
                    variant="text"
                    animation={animation === 'pulse' ? 'none' : animation}
                    height={16}
                    className="w-20"
                  />
                  <Skeleton
                    variant="text"
                    animation={animation === 'pulse' ? 'none' : animation}
                    height={16}
                    className="w-32"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Loading Wrapper - Conditional skeleton display
// ============================================================================

interface LoadingWrapperProps {
  isLoading: boolean
  skeleton: ReactNode
  children: ReactNode
  fallback?: ReactNode
}

export function LoadingWrapper({
  isLoading,
  skeleton,
  children,
  fallback,
}: LoadingWrapperProps) {
  if (isLoading) {
    return <>{skeleton}</>
  }

  return <>{children ?? fallback}</>
}

// ============================================================================
// Skeleton Group - Animate multiple skeletons together
// ============================================================================

interface SkeletonGroupProps {
  animation?: SkeletonAnimation
  children: ReactNode
  className?: string
}

export function SkeletonGroup({
  animation = 'pulse',
  children,
  className,
}: SkeletonGroupProps) {
  return (
    <div
      className={cn(
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'animate-shimmer',
        className
      )}
    >
      {children}
    </div>
  )
}
