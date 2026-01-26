'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  showHome?: boolean
  className?: string
}

// Auto-generate breadcrumbs from path
const pathLabels: Record<string, string> = {
  panel: 'Dashboard',
  projects: 'Projekty',
  tickets: 'Tickety',
  clients: 'Klienci',
  users: 'Użytkownicy',
  settings: 'Ustawienia',
  kanban: 'Kanban',
  new: 'Nowy',
  edit: 'Edycja',
  timeline: 'Timeline',
  statuses: 'Statusy',
  tags: 'Tagi',
  templates: 'Szablony',
  inbox: 'Skrzynka',
  audit: 'Audit',
  dropbox: 'Dropbox',
}

export function Breadcrumbs({ items, showHome = true, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs from path if items not provided
  const breadcrumbs = useMemo(() => {
    if (items) return items

    const segments = pathname.split('/').filter(Boolean)
    const crumbs: BreadcrumbItem[] = []

    let currentPath = ''
    for (const segment of segments) {
      currentPath += `/${segment}`

      // Skip dynamic segments that look like IDs
      if (segment.match(/^[a-z0-9]{20,}$/i)) {
        continue
      }

      const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      crumbs.push({
        label,
        href: currentPath,
      })
    }

    return crumbs
  }, [items, pathname])

  // Don't show if only one item (current page)
  if (breadcrumbs.length <= 1 && !showHome) {
    return null
  }

  return (
    <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {showHome && (
          <li>
            <Link
              href="/panel"
              className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="sr-only">Dashboard</span>
            </Link>
          </li>
        )}

        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          const isFirst = index === 0 && !showHome

          return (
            <li key={item.href || item.label} className="flex items-center">
              {(!isFirst || showHome) && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
              )}

              {isLast || !item.href ? (
                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                  {item.icon}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1.5"
                >
                  {item.icon}
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Page header with breadcrumbs
interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
