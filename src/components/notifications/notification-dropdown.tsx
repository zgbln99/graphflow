'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Check, CheckCheck, ExternalLink, Loader2, X, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }, [])

  // Handle real-time events
  const handleRealtimeEvent = useCallback((event: { type: string; data?: any }) => {
    if (event.type === 'notification') {
      // New notification received - fetch fresh data
      fetchNotifications()
    } else if (event.type === 'project_update' || event.type === 'comment_added') {
      // Refresh notifications on relevant events
      fetchNotifications()
    }
  }, [fetchNotifications])

  // Subscribe to real-time events
  useRealtime(handleRealtimeEvent)

  // Fetch notifications on mount and periodically as fallback
  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 15 seconds as fallback
    const interval = setInterval(fetchNotifications, 15000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function markAsRead(notificationId: string) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', notificationId }),
      })

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  async function markAllAsRead() {
    setIsLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read' }),
      })

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function clearAll() {
    if (!confirm('Czy na pewno chcesz usunąć wszystkie powiadomienia?')) return

    setIsLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-all' }),
      })

      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    setIsOpen(false)
  }

  const notificationTypeIcons: Record<string, string> = {
    PROJECT_CREATED: '📋',
    PROJECT_ACCEPTED: '✅',
    PROJECT_STATUS_CHANGE: '🔄',
    COMMENT_ADDED: '💬',
    DEADLINE_REMINDER: '⏰',
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-lg relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Powiadomienia</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3 h-3" />
                  )}
                  Oznacz
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  disabled={isLoading}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Wyczyść
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Brak powiadomień</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                  >
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => handleNotificationClick(notification)}
                        className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <NotificationContent notification={notification} icons={notificationTypeIcons} />
                      </Link>
                    ) : (
                      <div className="px-4 py-3">
                        <NotificationContent notification={notification} icons={notificationTypeIcons} />
                      </div>
                    )}

                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Oznacz jako przeczytane"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationContent({
  notification,
  icons,
}: {
  notification: Notification
  icons: Record<string, string>
}) {
  return (
    <div className="flex gap-3">
      <span className="text-xl shrink-0">
        {icons[notification.type] || '📌'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {notification.title}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {formatRelativeTime(new Date(notification.createdAt))}
        </p>
      </div>
      {notification.link && (
        <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
      )}
    </div>
  )
}
