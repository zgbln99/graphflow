'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { FadeIn, AnimatedCounter, TiltCard } from '@/components/ui/animations'
import { cn } from '@/lib/utils'

// ============================================
// ANIMATED STAT CARD
// ============================================

interface AnimatedStatCardProps {
  icon: ReactNode
  label: string
  value: number
  color: 'blue' | 'purple' | 'yellow' | 'red' | 'green'
  href?: string
  delay?: number
}

export function AnimatedStatCard({
  icon,
  label,
  value,
  color,
  href,
  delay = 0,
}: AnimatedStatCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  }

  const glowColors = {
    blue: 'hover:shadow-blue-500/20',
    purple: 'hover:shadow-purple-500/20',
    yellow: 'hover:shadow-yellow-500/20',
    red: 'hover:shadow-red-500/20',
    green: 'hover:shadow-green-500/20',
  }

  const content = (
    <div className="flex items-center gap-3">
      <div className={cn('p-2 rounded-lg transition-transform group-hover:scale-110', colors[color])}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
          <AnimatedCounter value={value} duration={1500} />
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )

  const cardClasses = cn(
    'bg-white rounded-xl border border-gray-200 shadow-sm',
    'dark:bg-gray-800 dark:border-gray-700',
    'p-4 transition-all duration-300',
    'hover:shadow-lg',
    glowColors[color],
    'group'
  )

  if (href) {
    return (
      <FadeIn delay={delay} direction="up">
        <TiltCard intensity={5}>
          <Link href={href} className={cardClasses}>
            {content}
          </Link>
        </TiltCard>
      </FadeIn>
    )
  }

  return (
    <FadeIn delay={delay} direction="up">
      <TiltCard intensity={5}>
        <div className={cardClasses}>{content}</div>
      </TiltCard>
    </FadeIn>
  )
}

// ============================================
// ANIMATED QUICK STAT
// ============================================

interface AnimatedQuickStatProps {
  label: string
  value: number
  icon: ReactNode
  delay?: number
}

export function AnimatedQuickStat({ label, value, icon, delay = 0 }: AnimatedQuickStatProps) {
  return (
    <FadeIn delay={delay} direction="up">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
        <div className="text-gray-400 animate-pulse">{icon}</div>
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
            <AnimatedCounter value={value} duration={1000} />
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </FadeIn>
  )
}

// ============================================
// ANIMATED SECTION
// ============================================

interface AnimatedSectionProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function AnimatedSection({ children, delay = 0, className = '' }: AnimatedSectionProps) {
  return (
    <FadeIn delay={delay} direction="up" className={className}>
      {children}
    </FadeIn>
  )
}

// ============================================
// ANIMATED PROJECT CARD
// ============================================

interface AnimatedProjectCardProps {
  children: ReactNode
  href: string
  delay?: number
}

export function AnimatedProjectCard({ children, href, delay = 0 }: AnimatedProjectCardProps) {
  return (
    <FadeIn delay={delay} direction="left">
      <Link
        href={href}
        className="block p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 hover:translate-x-1"
      >
        {children}
      </Link>
    </FadeIn>
  )
}

// ============================================
// ANIMATED DEADLINE CARD
// ============================================

interface AnimatedDeadlineCardProps {
  children: ReactNode
  href: string
  isUrgent: boolean
  delay?: number
}

export function AnimatedDeadlineCard({ children, href, isUrgent, delay = 0 }: AnimatedDeadlineCardProps) {
  return (
    <FadeIn delay={delay} direction="right">
      <Link
        href={href}
        className={cn(
          'block p-3 sm:p-4 transition-all duration-200',
          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          isUrgent && 'animate-pulse-soft'
        )}
      >
        {children}
      </Link>
    </FadeIn>
  )
}

// ============================================
// ANIMATED ACTIVITY ITEM
// ============================================

interface AnimatedActivityItemProps {
  children: ReactNode
  href: string
  delay?: number
}

export function AnimatedActivityItem({ children, href, delay = 0 }: AnimatedActivityItemProps) {
  return (
    <FadeIn delay={delay} direction="none">
      <Link
        href={href}
        className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        {children}
      </Link>
    </FadeIn>
  )
}

// ============================================
// ANIMATED CARD WRAPPER
// ============================================

interface AnimatedCardProps {
  children: ReactNode
  delay?: number
  className?: string
  withTilt?: boolean
}

export function AnimatedCard({ children, delay = 0, className = '', withTilt = false }: AnimatedCardProps) {
  const content = (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700', className)}>
      {children}
    </div>
  )

  return (
    <FadeIn delay={delay} direction="up">
      {withTilt ? <TiltCard intensity={3}>{content}</TiltCard> : content}
    </FadeIn>
  )
}
