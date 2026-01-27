'use client'

import { useState } from 'react'
import { useNotifications, NotificationPermissionButton } from '@/components/ui/browser-notifications'
import { Bell, BellRing, BellOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationToggle {
  id: string
  label: string
  description: string
  enabled: boolean
}

export function BrowserNotificationSettings() {
  const { permission, isSupported, sendNotification } = useNotifications()
  const [settings, setSettings] = useState<NotificationToggle[]>([
    {
      id: 'status_change',
      label: 'Zmiana statusu projektu',
      description: 'Powiadomienie gdy status projektu zostanie zmieniony',
      enabled: true,
    },
    {
      id: 'new_comment',
      label: 'Nowy komentarz',
      description: 'Powiadomienie gdy ktoś skomentuje Twój projekt lub ticket',
      enabled: true,
    },
    {
      id: 'deadline_reminder',
      label: 'Przypomnienie o deadline',
      description: 'Powiadomienie 24h przed terminem realizacji',
      enabled: true,
    },
    {
      id: 'mention',
      label: 'Wzmianki',
      description: 'Powiadomienie gdy ktoś Cię wspomni w komentarzu',
      enabled: true,
    },
  ])

  const handleToggle = (id: string) => {
    setSettings(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
    // TODO: Save to backend/localStorage
  }

  const handleTestNotification = () => {
    sendNotification({
      title: 'Test powiadomienia',
      body: 'Jeśli widzisz tę wiadomość, powiadomienia działają prawidłowo!',
    })
  }

  if (!isSupported) {
    return (
      <div className="text-center py-8">
        <BellOff className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-400">
          Twoja przeglądarka nie obsługuje powiadomień push.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Spróbuj użyć Chrome, Firefox lub Edge.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Permission status */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
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
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {permission === 'granted'
                  ? 'Powiadomienia włączone'
                  : permission === 'denied'
                  ? 'Powiadomienia zablokowane'
                  : 'Powiadomienia wyłączone'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {permission === 'granted'
                  ? 'Będziesz otrzymywać powiadomienia push'
                  : permission === 'denied'
                  ? 'Zmień ustawienia w przeglądarce'
                  : 'Włącz powiadomienia aby otrzymywać alerty'}
              </p>
            </div>
          </div>
          {permission === 'default' && (
            <NotificationPermissionButton />
          )}
          {permission === 'granted' && (
            <button
              onClick={handleTestNotification}
              className="px-3 py-1.5 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            >
              Testuj
            </button>
          )}
        </div>
      </div>

      {/* Individual notification settings */}
      {permission === 'granted' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Wybierz rodzaje powiadomień
          </p>
          {settings.map(setting => (
            <div
              key={setting.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
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
                onClick={() => handleToggle(setting.id)}
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
