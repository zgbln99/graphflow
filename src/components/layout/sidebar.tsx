'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FolderKanban,
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  Settings,
  Mail,
  Tags,
  Clock,
  X,
  Calendar,
  Download,
  History,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'

interface SidebarProps {
  user: SessionUser
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = user.role === 'ADMIN'

  const adminLinks = [
    { href: '/panel', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/panel/projects', label: 'Projekty', icon: Briefcase },
    { href: '/panel/clients', label: 'Klienci', icon: Building2 },
    { href: '/panel/calendar', label: 'Kalendarz', icon: Calendar },
    { href: '/panel/inbox', label: 'Skrzynka', icon: Mail },
    { href: '/panel/export', label: 'Eksport', icon: Download },
    { href: '/panel/audit', label: 'Historia zmian', icon: History },
    { href: '/panel/settings', label: 'Ustawienia', icon: Settings },
  ]

  const clientLinks = [
    { href: '/panel', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/panel/projects', label: 'Moje projekty', icon: Briefcase },
    { href: '/panel/projects/new', label: 'Nowy projekt', icon: Plus },
    { href: '/panel/calendar', label: 'Kalendarz', icon: Calendar },
  ]

  const links = isAdmin ? adminLinks : clientLinks

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/panel" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">GraphFlow</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href ||
              (link.href !== '/panel' && pathname.startsWith(link.href))

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'sidebar-link',
                  isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                )}
                onClick={onClose}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Admin extra section */}
        {isAdmin && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">
              Konfiguracja
            </p>
            <nav className="space-y-1">
              <Link
                href="/panel/settings/statuses"
                className={cn(
                  'sidebar-link',
                  pathname === '/panel/settings/statuses'
                    ? 'sidebar-link-active'
                    : 'sidebar-link-inactive'
                )}
              >
                <Clock className="w-5 h-5" />
                Statusy projektów
              </Link>
              <Link
                href="/panel/settings/tags"
                className={cn(
                  'sidebar-link',
                  pathname === '/panel/settings/tags'
                    ? 'sidebar-link-active'
                    : 'sidebar-link-inactive'
                )}
              >
                <Tags className="w-5 h-5" />
                Tagi
              </Link>
              <Link
                href="/panel/settings/templates"
                className={cn(
                  'sidebar-link',
                  pathname === '/panel/settings/templates'
                    ? 'sidebar-link-active'
                    : 'sidebar-link-inactive'
                )}
              >
                <FolderKanban className="w-5 h-5" />
                Szablony timeline
              </Link>
            </nav>
          </div>
        )}

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {isAdmin ? 'Administrator' : 'Klient'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
