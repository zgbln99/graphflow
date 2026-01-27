'use client'

import { useState, useEffect } from 'react'
import { Eye, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarGroup } from './avatar-upload'

// ============================================
// Types
// ============================================

export interface Viewer {
  id: string
  name: string
  avatarUrl?: string | null
  viewingSince: Date
}

interface WhosViewingProps {
  viewers: Viewer[]
  currentUserId: string
  maxDisplay?: number
  className?: string
  variant?: 'inline' | 'tooltip' | 'badge'
}

// ============================================
// Who's Viewing Component
// ============================================

export function WhosViewing({
  viewers,
  currentUserId,
  maxDisplay = 3,
  className,
  variant = 'inline',
}: WhosViewingProps) {
  // Filter out current user
  const otherViewers = viewers.filter(v => v.id !== currentUserId)

  if (otherViewers.length === 0) return null

  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium animate-pulse',
          className
        )}
      >
        <Eye className="w-3 h-3" />
        <span>{otherViewers.length} {otherViewers.length === 1 ? 'ogląda' : 'oglądają'}</span>
      </div>
    )
  }

  if (variant === 'tooltip') {
    return (
      <div className={cn('relative group', className)}>
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 cursor-pointer">
          <Eye className="w-4 h-4" />
          <span className="text-sm">{otherViewers.length}</span>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          <div className="font-medium mb-1">Aktualnie oglądają:</div>
          {otherViewers.slice(0, 5).map(viewer => (
            <div key={viewer.id} className="flex items-center gap-2 py-0.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span>{viewer.name}</span>
            </div>
          ))}
          {otherViewers.length > 5 && (
            <div className="text-gray-400 mt-1">
              i {otherViewers.length - 5} innych...
            </div>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      </div>
    )
  }

  // Inline variant (default)
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-fade-in',
        className
      )}
    >
      {/* Avatars with pulse */}
      <div className="relative">
        <AvatarGroup
          users={otherViewers.slice(0, maxDisplay)}
          max={maxDisplay}
          size="xs"
        />
        {/* Live indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-green-50 dark:border-green-900 animate-pulse" />
      </div>

      {/* Text */}
      <div className="text-sm">
        <span className="text-green-700 dark:text-green-400">
          {otherViewers.length === 1 ? (
            <><span className="font-medium">{otherViewers[0].name}</span> ogląda</>
          ) : otherViewers.length === 2 ? (
            <><span className="font-medium">{otherViewers[0].name}</span> i <span className="font-medium">{otherViewers[1].name}</span> oglądają</>
          ) : (
            <><span className="font-medium">{otherViewers[0].name}</span> i {otherViewers.length - 1} innych oglądają</>
          )}
        </span>
        <span className="text-green-600 dark:text-green-500 ml-1">teraz</span>
      </div>
    </div>
  )
}

// ============================================
// Live Presence Indicator (minimal)
// ============================================

interface LivePresenceProps {
  count: number
  className?: string
}

export function LivePresence({ count, className }: LivePresenceProps) {
  if (count === 0) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {count} {count === 1 ? 'online' : 'online'}
      </span>
    </div>
  )
}

// ============================================
// usePresence hook (for real-time updates)
// ============================================

interface UsePresenceOptions {
  projectId: string
  userId: string
  userName: string
  userAvatar?: string | null
  endpoint?: string
}

export function usePresence(options: UsePresenceOptions) {
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // In a real implementation, this would connect to a WebSocket or SSE endpoint
    // For now, we'll simulate it

    const currentViewer: Viewer = {
      id: options.userId,
      name: options.userName,
      avatarUrl: options.userAvatar,
      viewingSince: new Date(),
    }

    setViewers([currentViewer])
    setIsConnected(true)

    // Simulate other viewers joining/leaving (for demo)
    const demoViewers: Viewer[] = [
      { id: 'demo1', name: 'Jan Kowalski', viewingSince: new Date() },
      { id: 'demo2', name: 'Anna Nowak', viewingSince: new Date() },
    ]

    // Uncomment to see demo viewers:
    // const timeout = setTimeout(() => {
    //   setViewers(prev => [...prev, ...demoViewers])
    // }, 2000)

    return () => {
      setIsConnected(false)
      // clearTimeout(timeout)
    }
  }, [options.projectId, options.userId, options.userName, options.userAvatar])

  return {
    viewers,
    isConnected,
    viewerCount: viewers.length,
  }
}

export default WhosViewing
