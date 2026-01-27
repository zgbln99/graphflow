'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, BellRing, X, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  data?: Record<string, unknown>
  onClick?: () => void
}

interface UseNotificationsReturn {
  permission: NotificationPermission | 'unsupported'
  isSupported: boolean
  requestPermission: () => Promise<boolean>
  sendNotification: (options: NotificationOptions) => void
}

// ============================================
// useNotifications Hook
// ============================================

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')

  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission)
    } else {
      setPermission('unsupported')
    }
  }, [isSupported])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [isSupported])

  const sendNotification = useCallback((options: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192.png',
        tag: options.tag,
        data: options.data,
      })

      if (options.onClick) {
        notification.onclick = () => {
          window.focus()
          options.onClick?.()
          notification.close()
        }
      }

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000)
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }, [isSupported, permission])

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  }
}

// ============================================
// Notification Permission Button
// ============================================

interface NotificationPermissionButtonProps {
  className?: string
}

export function NotificationPermissionButton({ className }: NotificationPermissionButtonProps) {
  const { permission, isSupported, requestPermission } = useNotifications()
  const [isRequesting, setIsRequesting] = useState(false)

  if (!isSupported) {
    return (
      <div className={cn('text-sm text-gray-500', className)}>
        Twoja przeglądarka nie wspiera powiadomień
      </div>
    )
  }

  if (permission === 'granted') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-green-600 dark:text-green-400', className)}>
        <BellRing className="w-4 h-4" />
        Powiadomienia włączone
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-red-600 dark:text-red-400', className)}>
        <BellOff className="w-4 h-4" />
        Powiadomienia zablokowane
        <span className="text-xs text-gray-500">(zmień w ustawieniach przeglądarki)</span>
      </div>
    )
  }

  const handleRequest = async () => {
    setIsRequesting(true)
    await requestPermission()
    setIsRequesting(false)
  }

  return (
    <button
      onClick={handleRequest}
      disabled={isRequesting}
      className={cn(
        'flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50',
        className
      )}
    >
      <Bell className="w-4 h-4" />
      {isRequesting ? 'Proszenie o dostęp...' : 'Włącz powiadomienia'}
    </button>
  )
}

// ============================================
// Notification Settings Panel
// ============================================

interface NotificationSetting {
  id: string
  label: string
  description: string
  enabled: boolean
}

interface NotificationSettingsProps {
  settings: NotificationSetting[]
  onToggle: (id: string, enabled: boolean) => void
  className?: string
}

export function NotificationSettings({ settings, onToggle, className }: NotificationSettingsProps) {
  const { permission, isSupported, requestPermission } = useNotifications()

  return (
    <div className={cn('space-y-4', className)}>
      {/* Permission status */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <BellRing className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            ) : permission === 'denied' ? (
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <BellOff className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Powiadomienia przeglądarki
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {permission === 'granted'
                  ? 'Powiadomienia są włączone'
                  : permission === 'denied'
                  ? 'Powiadomienia są zablokowane'
                  : 'Powiadomienia nie są włączone'}
              </p>
            </div>
          </div>
          {permission === 'default' && isSupported && (
            <button
              onClick={requestPermission}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
            >
              Włącz
            </button>
          )}
        </div>
      </div>

      {/* Individual settings */}
      {permission === 'granted' && (
        <div className="space-y-3">
          {settings.map(setting => (
            <div
              key={setting.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {setting.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {setting.description}
                </p>
              </div>
              <button
                onClick={() => onToggle(setting.id, !setting.enabled)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors',
                  setting.enabled
                    ? 'bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    setting.enabled && 'translate-x-5'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Deadline Reminder Hook
// ============================================

interface DeadlineReminder {
  projectId: string
  projectNumber: string
  projectTitle: string
  deadline: Date
  daysLeft: number
}

export function useDeadlineReminders(reminders: DeadlineReminder[]) {
  const { permission, sendNotification } = useNotifications()

  useEffect(() => {
    if (permission !== 'granted') return

    // Check for upcoming deadlines
    const urgentReminders = reminders.filter(r => r.daysLeft <= 3 && r.daysLeft >= 0)

    urgentReminders.forEach(reminder => {
      const dayText = reminder.daysLeft === 0
        ? 'dzisiaj!'
        : reminder.daysLeft === 1
        ? 'jutro!'
        : `za ${reminder.daysLeft} dni`

      sendNotification({
        title: `⏰ Deadline ${dayText}`,
        body: `${reminder.projectNumber}: ${reminder.projectTitle}`,
        tag: `deadline-${reminder.projectId}`,
        onClick: () => {
          window.location.href = `/panel/projects/${reminder.projectId}`
        },
      })
    })
  }, [reminders, permission, sendNotification])
}

export default useNotifications
