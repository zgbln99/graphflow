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

  // Listen for real-time status updates
  const handleRealtimeEvent = useCallback((event: { type: string; data?: any }) => {
    if (event.type === 'PROJECT_STATUS_CHANGED' && event.data?.projectId === projectId) {
      const { newStatus } = event.data
      if (newStatus) {
        setStatus(newStatus)
        // Also refresh to get any other updates
        router.refresh()
      }
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

  // Listen for real-time status updates
  const handleRealtimeEvent = useCallback((event: { type: string; data?: any }) => {
    if (event.type === 'PROJECT_STATUS_CHANGED' && event.data?.projectId === projectId) {
      const { newStatus } = event.data
      if (newStatus) {
        setStatus(newStatus)
        router.refresh()
      }
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
