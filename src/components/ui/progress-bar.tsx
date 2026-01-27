'use client'

import { forwardRef, HTMLAttributes, useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type ProgressBarVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Current progress value (0-100 by default, or 0-max if max is specified) */
  value: number
  /** Maximum value (default: 100) */
  max?: number
  /** Visual variant/color scheme */
  variant?: ProgressBarVariant
  /** Size of the progress bar */
  size?: ProgressBarSize
  /** Custom color for the progress fill (overrides variant) */
  color?: string
  /** Custom background color for the track */
  trackColor?: string
  /** Show percentage label */
  showLabel?: boolean
  /** Label position */
  labelPosition?: 'inside' | 'outside' | 'top'
  /** Custom label text (overrides percentage) */
  label?: string
  /** Enable animation on value change */
  animated?: boolean
  /** Enable striped pattern */
  striped?: boolean
  /** Animate stripes (only works when striped is true) */
  stripedAnimated?: boolean
  /** Show indeterminate loading state */
  indeterminate?: boolean
  /** Rounded corners style */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  /** Animation duration in ms */
  animationDuration?: number
}

// ============================================================================
// Style Maps
// ============================================================================

const sizeClasses: Record<ProgressBarSize, { track: string; text: string }> = {
  xs: { track: 'h-1', text: 'text-[10px]' },
  sm: { track: 'h-2', text: 'text-xs' },
  md: { track: 'h-3', text: 'text-xs' },
  lg: { track: 'h-4', text: 'text-sm' },
  xl: { track: 'h-6', text: 'text-sm' },
}

const variantClasses: Record<ProgressBarVariant, string> = {
  default: 'bg-primary-500 dark:bg-primary-400',
  success: 'bg-green-500 dark:bg-green-400',
  warning: 'bg-yellow-500 dark:bg-yellow-400',
  danger: 'bg-red-500 dark:bg-red-400',
  info: 'bg-blue-500 dark:bg-blue-400',
}

const roundedClasses: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded',
  lg: 'rounded-lg',
  full: 'rounded-full',
}

// ============================================================================
// LinearProgressBar Component
// ============================================================================

export const LinearProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      variant = 'default',
      size = 'md',
      color,
      trackColor,
      showLabel = false,
      labelPosition = 'outside',
      label,
      animated = true,
      striped = false,
      stripedAnimated = false,
      indeterminate = false,
      rounded = 'full',
      animationDuration = 500,
      className,
      ...props
    },
    ref
  ) => {
    const [animatedValue, setAnimatedValue] = useState(animated ? 0 : value)
    const animatedValueRef = useRef(animated ? 0 : value)

    // Animate value changes
    useEffect(() => {
      if (!animated) {
        setAnimatedValue(value)
        animatedValueRef.current = value
        return
      }

      const startValue = animatedValueRef.current
      const endValue = value
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / animationDuration, 1)

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const currentValue = startValue + (endValue - startValue) * easeOut

        setAnimatedValue(currentValue)
        animatedValueRef.current = currentValue

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }, [value, animated, animationDuration])

    const percentage = indeterminate
      ? 0
      : Math.min(Math.max((animatedValue / max) * 100, 0), 100)

    const displayLabel = label ?? `${Math.round(percentage)}%`

    const sizeStyles = sizeClasses[size]
    const showInsideLabel = showLabel && labelPosition === 'inside' && (size === 'lg' || size === 'xl')

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Top label */}
        {showLabel && labelPosition === 'top' && (
          <div className="flex justify-between items-center mb-1">
            <span className={cn('text-gray-600 dark:text-gray-400', sizeStyles.text)}>
              Progress
            </span>
            <span className={cn('font-medium text-gray-900 dark:text-white', sizeStyles.text)}>
              {displayLabel}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Track */}
          <div
            className={cn(
              'flex-1 overflow-hidden bg-gray-200 dark:bg-gray-700',
              sizeStyles.track,
              roundedClasses[rounded]
            )}
            style={{ backgroundColor: trackColor }}
            role="progressbar"
            aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={indeterminate ? 'Loading' : `${Math.round(percentage)}% complete`}
          >
            {/* Fill */}
            <div
              className={cn(
                'h-full transition-all flex items-center justify-center',
                roundedClasses[rounded],
                !color && variantClasses[variant],
                striped && 'bg-stripes',
                stripedAnimated && 'animate-stripes',
                indeterminate && 'animate-indeterminate w-1/3'
              )}
              style={{
                width: indeterminate ? undefined : `${percentage}%`,
                backgroundColor: color,
                transitionDuration: animated ? '0ms' : `${animationDuration}ms`,
              }}
            >
              {/* Inside label */}
              {showInsideLabel && percentage > 10 && (
                <span
                  className={cn(
                    'text-white font-medium px-2 truncate',
                    sizeStyles.text
                  )}
                >
                  {displayLabel}
                </span>
              )}
            </div>
          </div>

          {/* Outside label */}
          {showLabel && labelPosition === 'outside' && (
            <span
              className={cn(
                'flex-shrink-0 font-medium text-gray-900 dark:text-white min-w-[3rem] text-right',
                sizeStyles.text
              )}
            >
              {displayLabel}
            </span>
          )}
        </div>
      </div>
    )
  }
)

LinearProgressBar.displayName = 'LinearProgressBar'

// ============================================================================
// Segmented Progress Bar
// ============================================================================

interface SegmentedProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Number of total segments */
  segments: number
  /** Number of completed segments */
  completed: number
  /** Visual variant/color scheme */
  variant?: ProgressBarVariant
  /** Size of the progress bar */
  size?: ProgressBarSize
  /** Custom color for completed segments */
  color?: string
  /** Gap between segments */
  gap?: number
  /** Show label */
  showLabel?: boolean
}

export const SegmentedProgressBar = forwardRef<HTMLDivElement, SegmentedProgressBarProps>(
  (
    {
      segments,
      completed,
      variant = 'default',
      size = 'md',
      color,
      gap = 2,
      showLabel = false,
      className,
      ...props
    },
    ref
  ) => {
    const sizeStyles = sizeClasses[size]
    const completedCount = Math.min(Math.max(completed, 0), segments)

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && (
          <div className="flex justify-between items-center mb-1">
            <span className={cn('text-gray-600 dark:text-gray-400', sizeStyles.text)}>
              Progress
            </span>
            <span className={cn('font-medium text-gray-900 dark:text-white', sizeStyles.text)}>
              {completedCount} / {segments}
            </span>
          </div>
        )}
        <div
          className="flex"
          style={{ gap: `${gap}px` }}
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={segments}
        >
          {Array.from({ length: segments }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 rounded-sm transition-all duration-300',
                sizeStyles.track,
                index < completedCount
                  ? color
                    ? ''
                    : variantClasses[variant]
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
              style={index < completedCount && color ? { backgroundColor: color } : undefined}
            />
          ))}
        </div>
      </div>
    )
  }
)

SegmentedProgressBar.displayName = 'SegmentedProgressBar'

// ============================================================================
// Multi-Color Progress Bar
// ============================================================================

interface ProgressSegment {
  value: number
  color: string
  label?: string
}

interface MultiColorProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Array of progress segments with values and colors */
  segments: ProgressSegment[]
  /** Maximum value (default: 100) */
  max?: number
  /** Size of the progress bar */
  size?: ProgressBarSize
  /** Show legend */
  showLegend?: boolean
  /** Rounded corners style */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

export const MultiColorProgressBar = forwardRef<HTMLDivElement, MultiColorProgressBarProps>(
  (
    {
      segments,
      max = 100,
      size = 'md',
      showLegend = false,
      rounded = 'full',
      className,
      ...props
    },
    ref
  ) => {
    const sizeStyles = sizeClasses[size]
    const total = segments.reduce((sum, seg) => sum + seg.value, 0)

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div
          className={cn(
            'flex overflow-hidden bg-gray-200 dark:bg-gray-700',
            sizeStyles.track,
            roundedClasses[rounded]
          )}
          role="progressbar"
          aria-valuenow={Math.round((total / max) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {segments.map((segment, index) => {
            const width = (segment.value / max) * 100
            return (
              <div
                key={index}
                className="h-full transition-all duration-500"
                style={{
                  width: `${width}%`,
                  backgroundColor: segment.color,
                }}
              />
            )
          })}
        </div>

        {showLegend && (
          <div className="flex flex-wrap gap-4 mt-2">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: segment.color }}
                />
                <span className={cn('text-gray-600 dark:text-gray-400', sizeStyles.text)}>
                  {segment.label ?? `${Math.round((segment.value / max) * 100)}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)

MultiColorProgressBar.displayName = 'MultiColorProgressBar'

// ============================================================================
// Progress Bar with Steps
// ============================================================================

interface ProgressStep {
  label: string
  value: number
  completed?: boolean
}

interface SteppedProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Current value */
  value: number
  /** Steps with labels and threshold values */
  steps: ProgressStep[]
  /** Maximum value */
  max?: number
  /** Visual variant */
  variant?: ProgressBarVariant
  /** Size */
  size?: ProgressBarSize
  /** Custom color */
  color?: string
}

export const SteppedProgressBar = forwardRef<HTMLDivElement, SteppedProgressBarProps>(
  (
    {
      value,
      steps,
      max = 100,
      variant = 'default',
      size = 'md',
      color,
      className,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const sizeStyles = sizeClasses[size]

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* Progress bar */}
        <div className="relative">
          <div
            className={cn(
              'overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-full',
              sizeStyles.track
            )}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                !color && variantClasses[variant]
              )}
              style={{
                width: `${percentage}%`,
                backgroundColor: color,
              }}
            />
          </div>

          {/* Step markers */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-0">
            {steps.map((step, index) => {
              const stepPosition = (step.value / max) * 100
              const isCompleted = value >= step.value || step.completed

              return (
                <div
                  key={index}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${stepPosition}%` }}
                >
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full border-2 transition-all',
                      isCompleted
                        ? cn(
                            'border-transparent',
                            !color && variantClasses[variant]
                          )
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                    )}
                    style={isCompleted && color ? { backgroundColor: color } : undefined}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Step labels */}
        <div className="relative mt-2 flex justify-between">
          {steps.map((step, index) => {
            const stepPosition = (step.value / max) * 100
            const isCompleted = value >= step.value || step.completed

            return (
              <div
                key={index}
                className="absolute -translate-x-1/2 text-center"
                style={{ left: `${stepPosition}%` }}
              >
                <span
                  className={cn(
                    sizeStyles.text,
                    isCompleted
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)

SteppedProgressBar.displayName = 'SteppedProgressBar'

// ============================================================================
// Default Export (alias for LinearProgressBar)
// ============================================================================

export const ProgressBar = LinearProgressBar
