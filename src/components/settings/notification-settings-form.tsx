'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle } from 'lucide-react'
import { updateNotificationSettingsAction } from './notification-actions'

interface NotificationSettingsFormProps {
  settings: {
    id: string
    statusChangeEnabled: boolean
    newCommentEnabled: boolean
    deadlineReminderEnabled: boolean
    deadlineReminder48h: boolean
    deadlineReminder24h: boolean
  }
}

export function NotificationSettingsForm({ settings }: NotificationSettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [formData, setFormData] = useState({
    statusChangeEnabled: settings.statusChangeEnabled,
    newCommentEnabled: settings.newCommentEnabled,
    deadlineReminderEnabled: settings.deadlineReminderEnabled,
    deadlineReminder48h: settings.deadlineReminder48h,
    deadlineReminder24h: settings.deadlineReminder24h,
  })

  function handleChange(field: string, value: boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      await updateNotificationSettingsAction(settings.id, formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Zmiana statusu */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="statusChangeEnabled"
          checked={formData.statusChangeEnabled}
          onChange={(e) => handleChange('statusChangeEnabled', e.target.checked)}
          className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <div>
          <label htmlFor="statusChangeEnabled" className="font-medium text-gray-900 cursor-pointer">
            Zmiana statusu projektu
          </label>
          <p className="text-sm text-gray-500">
            Powiadomienie gdy status projektu lub ticketu się zmieni
          </p>
        </div>
      </div>

      {/* Nowy komentarz */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="newCommentEnabled"
          checked={formData.newCommentEnabled}
          onChange={(e) => handleChange('newCommentEnabled', e.target.checked)}
          className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <div>
          <label htmlFor="newCommentEnabled" className="font-medium text-gray-900 cursor-pointer">
            Nowy komentarz
          </label>
          <p className="text-sm text-gray-500">
            Powiadomienie gdy ktoś doda komentarz do ticketu
          </p>
        </div>
      </div>

      {/* Przypomnienia o deadline */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="deadlineReminderEnabled"
            checked={formData.deadlineReminderEnabled}
            onChange={(e) => handleChange('deadlineReminderEnabled', e.target.checked)}
            className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <div>
            <label htmlFor="deadlineReminderEnabled" className="font-medium text-gray-900 cursor-pointer">
              Przypomnienia o deadline
            </label>
            <p className="text-sm text-gray-500">
              Automatyczne przypomnienia przed terminem
            </p>
          </div>
        </div>

        {formData.deadlineReminderEnabled && (
          <div className="ml-8 space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="deadlineReminder48h"
                checked={formData.deadlineReminder48h}
                onChange={(e) => handleChange('deadlineReminder48h', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="deadlineReminder48h" className="text-sm text-gray-700 cursor-pointer">
                48 godzin przed terminem
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="deadlineReminder24h"
                checked={formData.deadlineReminder24h}
                onChange={(e) => handleChange('deadlineReminder24h', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="deadlineReminder24h" className="text-sm text-gray-700 cursor-pointer">
                24 godziny przed terminem
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {saved && (
          <span className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Zapisano
          </span>
        )}
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Zapisuję...
            </>
          ) : (
            'Zapisz ustawienia'
          )}
        </button>
      </div>
    </form>
  )
}
