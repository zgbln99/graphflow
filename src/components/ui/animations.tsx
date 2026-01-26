'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ============================================
// FADE IN ANIMATION
// ============================================

interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  className?: string
}

export function FadeIn({
  children,
  delay = 0,
  duration = 500,
  direction = 'up',
  className = '',
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [delay])

  const directionStyles = {
    up: 'translate-y-8',
    down: '-translate-y-8',
    left: 'translate-x-8',
    right: '-translate-x-8',
    none: '',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all',
        isVisible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${directionStyles[direction]}`,
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  )
}

// ============================================
// STAGGERED CHILDREN ANIMATION
// ============================================

interface StaggerChildrenProps {
  children: ReactNode[]
  staggerDelay?: number
  className?: string
}

export function StaggerChildren({
  children,
  staggerDelay = 100,
  className = '',
}: StaggerChildrenProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <FadeIn key={index} delay={index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  )
}

// ============================================
// ANIMATED COUNTER
// ============================================

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [hasAnimated])

  useEffect(() => {
    if (!hasAnimated) return

    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      const currentValue = Math.floor(startValue + (value - startValue) * easeOut)
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [hasAnimated, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}

// ============================================
// PULSE ANIMATION
// ============================================

interface PulseProps {
  children: ReactNode
  color?: string
  className?: string
}

export function Pulse({ children, color = 'rgb(99, 102, 241)', className = '' }: PulseProps) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span className="relative">{children}</span>
    </span>
  )
}

// ============================================
// SHIMMER EFFECT (for loading)
// ============================================

interface ShimmerProps {
  width?: string | number
  height?: string | number
  className?: string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

export function Shimmer({
  width = '100%',
  height = 20,
  className = '',
  rounded = 'md',
}: ShimmerProps) {
  const roundedClass = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-200 dark:bg-gray-700',
        roundedClass[rounded],
        className
      )}
      style={{ width, height }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  )
}

// ============================================
// SKELETON CARD
// ============================================

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={cn('card p-4 space-y-3', className)}>
      <Shimmer height={24} width="60%" />
      <Shimmer height={16} width="100%" />
      <Shimmer height={16} width="80%" />
      <div className="flex gap-2 pt-2">
        <Shimmer height={32} width={80} rounded="full" />
        <Shimmer height={32} width={80} rounded="full" />
      </div>
    </div>
  )
}

// ============================================
// CONFETTI EFFECT
// ============================================

interface ConfettiProps {
  active: boolean
  duration?: number
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    color: string
    delay: number
    rotation: number
  }>>([])

  useEffect(() => {
    if (active) {
      const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6']
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 500,
        rotation: Math.random() * 360,
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => setParticles([]), duration)
      return () => clearTimeout(timer)
    }
  }, [active, duration])

  if (particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 animate-[confetti_3s_ease-out_forwards]"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}ms`,
            transform: `rotate(${particle.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ============================================
// RIPPLE BUTTON
// ============================================

interface RippleButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function RippleButton({
  children,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    setRipples((prev) => [...prev, { x, y, id }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 600)

    onClick?.()
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={cn('relative overflow-hidden', className)}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-[ripple_0.6s_ease-out]"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  )
}

// ============================================
// 3D TILT CARD
// ============================================

interface TiltCardProps {
  children: ReactNode
  className?: string
  intensity?: number
}

export function TiltCard({ children, className = '', intensity = 10 }: TiltCardProps) {
  const [transform, setTransform] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -intensity
    const rotateY = ((x - centerX) / centerX) * intensity

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`)
  }

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)')
  }

  return (
    <div
      ref={ref}
      className={cn('transition-transform duration-200 ease-out', className)}
      style={{ transform }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

// ============================================
// FLOATING ACTION BUTTON
// ============================================

interface FloatingActionButtonProps {
  icon: ReactNode
  onClick?: () => void
  label?: string
  className?: string
}

export function FloatingActionButton({
  icon,
  onClick,
  label,
  className = '',
}: FloatingActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed bottom-6 right-6 z-40 flex items-center gap-2 p-4 rounded-full',
        'bg-primary-600 text-white shadow-lg',
        'hover:bg-primary-700 hover:shadow-xl hover:scale-110',
        'active:scale-95 transition-all duration-200',
        className
      )}
    >
      <span className="transition-transform duration-200" style={{ transform: isHovered ? 'rotate(90deg)' : 'rotate(0deg)' }}>
        {icon}
      </span>
      {label && (
        <span
          className={cn(
            'overflow-hidden transition-all duration-200 whitespace-nowrap',
            isHovered ? 'max-w-32 opacity-100 ml-1' : 'max-w-0 opacity-0'
          )}
        >
          {label}
        </span>
      )}
    </button>
  )
}

// ============================================
// ANIMATED GRADIENT BACKGROUND
// ============================================

interface GradientBackgroundProps {
  children: ReactNode
  className?: string
}

export function GradientBackground({ children, className = '' }: GradientBackgroundProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-purple-500/20 to-pink-500/20 animate-[gradient_8s_ease_infinite] bg-[length:400%_400%]" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ============================================
// SUCCESS CHECKMARK ANIMATION
// ============================================

export function SuccessCheckmark({ className = '' }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        className="w-16 h-16 text-green-500"
        viewBox="0 0 52 52"
      >
        <circle
          className="animate-[circle_0.6s_ease-in-out_forwards]"
          cx="26"
          cy="26"
          r="25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            strokeDasharray: 166,
            strokeDashoffset: 166,
          }}
        />
        <path
          className="animate-[check_0.3s_0.6s_ease-in-out_forwards]"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 27l7 7 16-16"
          style={{
            strokeDasharray: 48,
            strokeDashoffset: 48,
          }}
        />
      </svg>
    </div>
  )
}

// ============================================
// TYPING ANIMATION
// ============================================

interface TypingTextProps {
  text: string
  speed?: number
  className?: string
}

export function TypingText({ text, speed = 50, className = '' }: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let index = 0
    setDisplayedText('')
    setIsComplete(false)

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        setIsComplete(true)
        clearInterval(timer)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed])

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  )
}
