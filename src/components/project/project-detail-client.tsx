'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { WhosViewing, usePresence, Viewer } from '@/components/ui/whos-viewing'

interface ProjectStatus {
  id: string
  name: string
  color: string
}

interface ProjectDetailClientProps {
  projectId: string
  initialStatus: ProjectStatus
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string | null
  children: React.ReactNode
}

export function ProjectDetailClient({
  projectId,
  initialStatus,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  children,
}: ProjectDetailClientProps) {
  const [status, setStatus] = useState(initialStatus)
  const isReloading = useRef(false)

  // Track who's viewing this project
  const { viewers } = usePresence({
    projectId,
    userId: currentUserId,
    userName: currentUserName,
    userAvatar: currentUserAvatar,
  })

  // Update status when props change
  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  // Listen for real-time updates
  const handleRealtimeEvent = useCallback((event: { type: string; data?: any }) => {
    // Prevent multiple reloads
    if (isReloading.current) return

    // Events come as { type: 'notification', data: { type: 'PROJECT_STATUS_CHANGED', ... } }
    if (event.type !== 'notification' || !event.data) return

    // Only handle events for this project
    const eventData = event.data
    if (eventData.projectId !== projectId) return

    console.log('[ProjectDetailClient] Received event:', eventData.type, eventData)

    switch (eventData.type) {
      case 'PROJECT_STATUS_CHANGED':
        if (eventData.newStatus) {
          setStatus(eventData.newStatus)
        }
        // Force full page reload to get fresh data
        isReloading.current = true
        window.location.reload()
        break

      case 'PROJECT_UPDATED':
      case 'FILES_UPDATED':
      case 'TIMELINE_UPDATED':
      case 'COMMENT_ADDED':
        // Force full page reload to get fresh data
        isReloading.current = true
        window.location.reload()
        break
    }
  }, [projectId])

  useRealtime(handleRealtimeEvent)

  return (
    <>
      {/* Who's viewing banner */}
      {viewers.length > 1 && (
        <div className="mb-4">
          <WhosViewing
            viewers={viewers}
            currentUserId={currentUserId}
            variant="inline"
          />
        </div>
      )}
      {children}
    </>
  )
}

// Component to display status that can be updated in real-time
interface LiveStatusBadgeProps {
  projectId: string
  initialStatus: ProjectStatus
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LiveStatusBadge({
  projectId,
  initialStatus,
  className = '',
  size = 'md',
}: LiveStatusBadgeProps) {
  const [status, setStatus] = useState(initialStatus)

  // Update status when props change
  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  // Listen for real-time updates
  const handleRealtimeEvent = useCallback((event: { type: string; data?: any }) => {
    // Events come as { type: 'notification', data: { type: 'PROJECT_STATUS_CHANGED', ... } }
    if (event.type !== 'notification' || !event.data) return

    const eventData = event.data
    if (eventData.projectId !== projectId) return

    console.log('[LiveStatusBadge] Received event:', eventData.type, eventData)

    if (eventData.type === 'PROJECT_STATUS_CHANGED' && eventData.newStatus) {
      setStatus(eventData.newStatus)
    }
  }, [projectId])

  useRealtime(handleRealtimeEvent)

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base font-medium',
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${status.color}20`,
        color: status.color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      {status.name}
    </div>
  )
}
