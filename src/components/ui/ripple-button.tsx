'use client'

import { useState, useCallback, MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RippleProps {
  x: number
  y: number
  size: number
}

interface RippleButtonProps {
  children: ReactNode
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  rippleColor?: string
}

export function RippleButton({
  children,
  onClick,
  className,
  disabled = false,
  type = 'button',
  variant = 'primary',
  size = 'md',
  rippleColor,
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<RippleProps[]>([])

  const addRipple = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    const newRipple = { x, y, size }
    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.slice(1))
    }, 600)
  }, [])

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    addRipple(e)
    onClick?.(e)
  }

  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const defaultRippleColors = {
    primary: 'rgba(255, 255, 255, 0.3)',
    secondary: 'rgba(99, 102, 241, 0.2)',
    danger: 'rgba(255, 255, 255, 0.3)',
    ghost: 'rgba(99, 102, 241, 0.2)',
  }

  const actualRippleColor = rippleColor || defaultRippleColors[variant]

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'relative overflow-hidden rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {/* Ripple effects */}
      {ripples.map((ripple, index) => (
        <span
          key={index}
          className="absolute rounded-full animate-ripple pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: actualRippleColor,
          }}
        />
      ))}

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  )
}

// ============================================
// Ripple effect CSS (add to globals.css)
// ============================================

// Add this to globals.css:
// @keyframes ripple {
//   0% {
//     transform: scale(0);
//     opacity: 1;
//   }
//   100% {
//     transform: scale(1);
//     opacity: 0;
//   }
// }
// .animate-ripple {
//   animation: ripple 0.6s ease-out forwards;
// }

export default RippleButton
