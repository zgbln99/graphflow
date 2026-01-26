'use client'

import { useMemo } from 'react'

interface AvatarProps {
  name: string
  email?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showTooltip?: boolean
  className?: string
}

// Generate consistent color based on string
function stringToColor(str: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
  ]

  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

export function Avatar({ name, email, size = 'md', showTooltip = true, className = '' }: AvatarProps) {
  const color = useMemo(() => stringToColor(email || name), [email, name])
  const initials = useMemo(() => getInitials(name), [name])

  return (
    <div className={`relative group ${className}`}>
      <div
        className={`
          ${sizes[size]}
          rounded-full flex items-center justify-center font-medium text-white
          ring-2 ring-white dark:ring-gray-800
          transition-transform group-hover:scale-105
        `}
        style={{ backgroundColor: color }}
        title={showTooltip ? name : undefined}
      >
        {initials}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {name}
          {email && <span className="block text-gray-400">{email}</span>}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </div>
  )
}

// Avatar Group - shows multiple avatars stacked
interface AvatarGroupProps {
  users: Array<{ name: string; email?: string }>
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max)
  const remainingCount = users.length - max

  return (
    <div className="flex items-center -space-x-2">
      {visibleUsers.map((user, index) => (
        <Avatar
          key={user.email || user.name + index}
          name={user.name}
          email={user.email}
          size={size}
          className="hover:z-10"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={`
            ${sizes[size]}
            rounded-full flex items-center justify-center
            bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300
            font-medium ring-2 ring-white dark:ring-gray-800
          `}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

// Avatar with name inline
interface AvatarWithNameProps extends AvatarProps {
  subtitle?: string
}

export function AvatarWithName({ name, email, size = 'md', subtitle, className = '' }: AvatarWithNameProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Avatar name={name} email={email} size={size} showTooltip={false} />
      <div className="min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{name}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
