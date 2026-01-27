'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FolderKanban,
  ListTodo,
  Settings,
  User,
  Bell,
  Plus,
  Search,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

export interface BottomNavItem {
  icon: ReactNode
  label: string
  href: string
  badge?: number
  activeIcon?: ReactNode
}

interface BottomNavigationProps {
  items?: BottomNavItem[]
  showFab?: boolean
  fabIcon?: ReactNode
  onFabClick?: () => void
  className?: string
  hideOnScroll?: boolean
}

// ============================================
// Default navigation items
// ============================================

const defaultItems: BottomNavItem[] = [
  {
    icon: <Home className="w-6 h-6" />,
    label: 'Dashboard',
    href: '/panel',
  },
  {
    icon: <FolderKanban className="w-6 h-6" />,
    label: 'Projekty',
    href: '/panel/projects',
  },
  {
    icon: <ListTodo className="w-6 h-6" />,
    label: 'Zadania',
    href: '/panel/tasks',
  },
  {
    icon: <User className="w-6 h-6" />,
    label: 'Profil',
    href: '/panel/profile',
  },
]

// ============================================
// BottomNavigation Component
// ============================================

export function BottomNavigation({
  items = defaultItems,
  showFab = true,
  fabIcon = <Plus className="w-6 h-6" />,
  onFabClick,
  className,
  hideOnScroll = true,
}: BottomNavigationProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    if (!hideOnScroll) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, hideOnScroll])

  // Only show on mobile
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isMobile) return null

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-16 md:hidden" />

      {/* Navigation */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800',
          'transition-transform duration-300 ease-in-out',
          !isVisible && 'translate-y-full',
          className
        )}
      >
        <div className="relative flex items-center justify-around px-2 h-16 safe-area-pb">
          {items.map((item, index) => {
            const isActive = pathname === item.href ||
              (item.href !== '/panel' && pathname.startsWith(item.href))

            // If FAB is shown and we're at the middle, add extra spacing
            const isBeforeFab = showFab && index === Math.floor(items.length / 2) - 1
            const isAfterFab = showFab && index === Math.floor(items.length / 2)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-1 transition-colors',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400',
                  isBeforeFab && 'mr-6',
                  isAfterFab && 'ml-6'
                )}
              >
                {/* Icon with badge */}
                <div className="relative">
                  {isActive && item.activeIcon ? item.activeIcon : item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  'text-[10px] mt-0.5 font-medium transition-colors',
                  isActive ? 'opacity-100' : 'opacity-70'
                )}>
                  {item.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
                )}
              </Link>
            )
          })}

          {/* FAB Button */}
          {showFab && (
            <button
              type="button"
              onClick={onFabClick}
              className={cn(
                'absolute left-1/2 -translate-x-1/2 -top-6',
                'w-14 h-14 flex items-center justify-center',
                'bg-primary-600 hover:bg-primary-700 active:bg-primary-800',
                'text-white rounded-full shadow-lg',
                'transition-all duration-200',
                'active:scale-95'
              )}
            >
              {fabIcon}
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

// ============================================
// BottomSheet (mobile action menu)
// ============================================

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  className,
}: BottomSheetProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-white dark:bg-gray-900 rounded-t-2xl',
          'max-h-[85vh] overflow-hidden',
          'animate-slide-up',
          className
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-60px)] pb-safe">
          {children}
        </div>
      </div>
    </>
  )
}

// ============================================
// Quick Actions Sheet
// ============================================

interface QuickAction {
  icon: ReactNode
  label: string
  onClick: () => void
  color?: 'default' | 'primary' | 'danger'
}

interface QuickActionsSheetProps {
  isOpen: boolean
  onClose: () => void
  actions: QuickAction[]
  title?: string
}

export function QuickActionsSheet({
  isOpen,
  onClose,
  actions,
  title = 'Szybkie akcje',
}: QuickActionsSheetProps) {
  const colorClasses = {
    default: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
    primary: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30',
    danger: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-4 grid grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              action.onClick()
              onClose()
            }}
            className="flex flex-col items-center gap-2"
          >
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center',
              colorClasses[action.color || 'default']
            )}>
              {action.icon}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

// ============================================
// Mobile Search Bar
// ============================================

interface MobileSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  className?: string
  isExpanded?: boolean
  onToggle?: () => void
}

export function MobileSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Szukaj...',
  className,
  isExpanded = false,
  onToggle,
}: MobileSearchBarProps) {
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors',
          className
        )}
      >
        <Search className="w-6 h-6 text-gray-500 dark:text-gray-400" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed inset-x-0 top-0 z-50 bg-white dark:bg-gray-900 p-3 border-b border-gray-200 dark:border-gray-800 animate-fade-in',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
            placeholder={placeholder}
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Anuluj
        </button>
      </div>
    </div>
  )
}

export default BottomNavigation
