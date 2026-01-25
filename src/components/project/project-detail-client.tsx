'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtime } from '@/hooks/use-realtime'

interface ProjectStatus {
  id: string
  name: string
  color: string
}

interface ProjectDetailClientProps {
  projectId: string
  initialStatus: ProjectStatus
  children: React.ReactNode
}

export function ProjectDetailClient({
  projectId,
  initialStatus,
  children,
}: ProjectDetailClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)

  // Update status when props change
  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  // Listen for real-time updates
  const handleRealtimeEvent = useCallback((event: { type: string; data?: any }) => {
    // Events come as { type: 'notification', data: { type: 'PROJECT_STATUS_CHANGED', ... } }
    if (event.type !== 'notification' || !event.data) return

    // Only handle events for this project
    const eventData = event.data
    if (eventData.projectId !== projectId) return

    switch (eventData.type) {
      case 'PROJECT_STATUS_CHANGED':
        if (eventData.newStatus) {
          setStatus(eventData.newStatus)
        }
        router.refresh()
        break

      case 'PROJECT_UPDATED':
      case 'FILES_UPDATED':
      case 'TIMELINE_UPDATED':
        // Refresh the page to get updated data
        router.refresh()
        break
    }
  }, [projectId, router])

  useRealtime(handleRealtimeEvent)

  return <>{children}</>
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
  const router = useRouter()
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

    if (eventData.type === 'PROJECT_STATUS_CHANGED') {
      if (eventData.newStatus) {
        setStatus(eventData.newStatus)
        router.refresh()
      }
    } else if (eventData.type === 'PROJECT_UPDATED') {
      // Project was updated, refresh to get new status
      router.refresh()
    }
  }, [projectId, router])

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
