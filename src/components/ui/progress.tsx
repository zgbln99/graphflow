'use client'

import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface ProgressBarProps {
  value: number // 0-100
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: string
  showLabel?: boolean
  animated?: boolean
  className?: string
}

const heights = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color,
  showLabel = false,
  animated = true,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">Postęp</span>
          <span className="font-medium text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`${heights[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`
            h-full rounded-full transition-all duration-500 ease-out
            ${animated ? 'animate-progress-grow' : ''}
            ${!color ? 'bg-primary-500' : ''}
          `}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}

// Step Progress - for timeline/stages
interface Step {
  id: string
  name: string
  status: 'completed' | 'current' | 'upcoming'
  date?: string
}

interface StepProgressProps {
  steps: Step[]
  className?: string
}

export function StepProgress({ steps, className = '' }: StepProgressProps) {
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const progress = (completedSteps / steps.length) * 100

  return (
    <div className={className}>
      {/* Progress bar */}
      <div className="relative">
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`
                w-4 h-4 rounded-full border-2 transition-all
                ${step.status === 'completed'
                  ? 'bg-primary-500 border-primary-500'
                  : step.status === 'current'
                    ? 'bg-white dark:bg-gray-900 border-primary-500'
                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                }
              `}
              style={{ marginLeft: index === 0 ? 0 : 'auto' }}
            />
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`
              text-center flex-1 min-w-0 px-1
              ${step.status === 'completed'
                ? 'text-primary-600 dark:text-primary-400'
                : step.status === 'current'
                  ? 'text-gray-900 dark:text-white font-medium'
                  : 'text-gray-400 dark:text-gray-500'
              }
            `}
          >
            <p className="text-xs truncate">{step.name}</p>
            {step.date && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{step.date}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Vertical step progress
interface VerticalStepProgressProps {
  steps: Step[]
  className?: string
}

export function VerticalStepProgress({ steps, className = '' }: VerticalStepProgressProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex gap-3">
            {/* Icon and line */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${step.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : step.status === 'current'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }
                `}
              >
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : step.status === 'current' ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`
                    w-0.5 flex-1 min-h-[40px]
                    ${step.status === 'completed'
                      ? 'bg-green-300 dark:bg-green-700'
                      : 'bg-gray-200 dark:bg-gray-700'
                    }
                  `}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <p
                className={`
                  font-medium
                  ${step.status === 'completed'
                    ? 'text-green-700 dark:text-green-400'
                    : step.status === 'current'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                {step.name}
              </p>
              {step.date && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{step.date}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Circular progress
interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  showLabel?: boolean
  className?: string
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = '#3b82f6',
  showLabel = true,
  className = '',
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  )
}
