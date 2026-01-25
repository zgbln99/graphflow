import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft, Bell } from 'lucide-react'
import { NotificationSettingsForm } from '@/components/settings/notification-settings-form'

export default async function NotificationSettingsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  // Pobierz lub utwórz ustawienia
  let settings = await prisma.notificationSetting.findFirst()

  if (!settings) {
    settings = await prisma.notificationSetting.create({
      data: {
        statusChangeEnabled: true,
        newCommentEnabled: true,
        deadlineReminderEnabled: true,
        deadlineReminder48h: true,
        deadlineReminder24h: true,
      },
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/panel/settings"
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Ustawienia
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Powiadomienia</h1>
        <p className="text-gray-600 mt-1">
          Konfiguracja powiadomień email dla klientów
        </p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Bell className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Ustawienia powiadomień</h2>
            <p className="text-sm text-gray-500">Które powiadomienia wysyłać do klientów</p>
          </div>
        </div>

        <NotificationSettingsForm settings={settings} />
      </div>
    </div>
  )
}
