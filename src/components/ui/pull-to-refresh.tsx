'use client'

import { useState, useRef, useCallback, useEffect, ReactNode, TouchEvent } from 'react'
import { RefreshCw, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  disabled?: boolean
  className?: string
  pullThreshold?: number
  maxPull?: number
  refreshingText?: string
  pullingText?: string
  releaseText?: string
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing'

// ============================================
// PullToRefresh Component
// ============================================

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className,
  pullThreshold = 80,
  maxPull = 120,
  refreshingText = 'Odświeżanie...',
  pullingText = 'Pociągnij aby odświeżyć',
  releaseText = 'Puść aby odświeżyć',
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<RefreshState>('idle')
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state === 'refreshing') return

    // Only start pull if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }, [disabled, state])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || state === 'refreshing' || startY.current === 0) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    // Only pull down
    if (diff > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      // Apply resistance to make it feel natural
      const resistance = 0.5
      const distance = Math.min(diff * resistance, maxPull)

      setPullDistance(distance)

      if (distance >= pullThreshold) {
        setState('ready')
      } else if (distance > 0) {
        setState('pulling')
      }

      // Prevent default scroll
      if (distance > 0) {
        e.preventDefault()
      }
    }
  }, [disabled, state, maxPull, pullThreshold])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || startY.current === 0) return

    if (state === 'ready') {
      setState('refreshing')
      setPullDistance(pullThreshold)

      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh error:', error)
      }

      // Animate back
      setState('idle')
      setPullDistance(0)
    } else {
      setState('idle')
      setPullDistance(0)
    }

    startY.current = 0
  }, [disabled, state, onRefresh, pullThreshold])

  // Reset on scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (container.scrollTop > 0 && state === 'pulling') {
        setState('idle')
        setPullDistance(0)
        startY.current = 0
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [state])

  const progress = Math.min(pullDistance / pullThreshold, 1)
  const rotation = progress * 180

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex flex-col items-center justify-end overflow-hidden transition-all duration-200 ease-out',
          state === 'refreshing' && 'transition-none'
        )}
        style={{
          height: pullDistance,
          top: 0,
        }}
      >
        <div className="pb-3 flex flex-col items-center gap-1">
          {/* Icon */}
          <div
            className={cn(
              'transition-transform',
              state === 'refreshing' && 'animate-spin'
            )}
            style={{
              transform: state !== 'refreshing' ? `rotate(${rotation}deg)` : undefined,
            }}
          >
            {state === 'refreshing' ? (
              <RefreshCw className="w-6 h-6 text-primary-500" />
            ) : (
              <ArrowDown
                className={cn(
                  'w-6 h-6 transition-colors',
                  state === 'ready' ? 'text-primary-500' : 'text-gray-400'
                )}
              />
            )}
          </div>

          {/* Text */}
          <span
            className={cn(
              'text-xs font-medium transition-colors',
              state === 'ready' || state === 'refreshing'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {state === 'refreshing' && refreshingText}
            {state === 'ready' && releaseText}
            {(state === 'pulling' || state === 'idle') && pullDistance > 0 && pullingText}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'transition-transform duration-200 ease-out',
          state === 'refreshing' && 'transition-none'
        )}
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================
// usePullToRefresh hook (for custom implementations)
// ============================================

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)

  const handleTouchStart = useCallback((y: number) => {
    if (!disabled && !isRefreshing) {
      startY.current = y
    }
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((y: number, scrollTop: number) => {
    if (disabled || isRefreshing || startY.current === 0) return

    const diff = y - startY.current

    if (diff > 0 && scrollTop === 0) {
      const resistance = 0.5
      const distance = diff * resistance
      setPullDistance(distance)
    }
  }, [disabled, isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || startY.current === 0) return

    if (pullDistance >= threshold) {
      setIsRefreshing(true)

      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh error:', error)
      }

      setIsRefreshing(false)
    }

    setPullDistance(0)
    startY.current = 0
  }, [disabled, pullDistance, threshold, onRefresh])

  return {
    isRefreshing,
    pullDistance,
    isReady: pullDistance >= threshold,
    progress: Math.min(pullDistance / threshold, 1),
    handlers: {
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    },
  }
}

// ============================================
// RefreshIndicator (minimal, standalone)
// ============================================

interface RefreshIndicatorProps {
  isRefreshing: boolean
  progress?: number
  className?: string
}

export function RefreshIndicator({
  isRefreshing,
  progress = 0,
  className,
}: RefreshIndicatorProps) {
  if (!isRefreshing && progress === 0) return null

  return (
    <div
      className={cn(
        'flex items-center justify-center py-3',
        className
      )}
    >
      <div
        className={cn(
          'p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg',
          isRefreshing && 'animate-pulse'
        )}
      >
        <RefreshCw
          className={cn(
            'w-5 h-5 text-primary-500',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: !isRefreshing ? `rotate(${progress * 360}deg)` : undefined,
            opacity: Math.max(progress, isRefreshing ? 1 : 0),
          }}
        />
      </div>
    </div>
  )
}

export default PullToRefresh
