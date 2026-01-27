import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft, Bell, Mail, Smartphone } from 'lucide-react'
import { NotificationSettingsForm } from '@/components/settings/notification-settings-form'
import { BrowserNotificationSettings } from '@/components/settings/browser-notification-settings'

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
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Ustawienia
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Powiadomienia</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Konfiguracja powiadomień email i przeglądarki
        </p>
      </div>

      {/* Browser notifications */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Powiadomienia przeglądarki</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Otrzymuj powiadomienia push nawet gdy karta jest nieaktywna</p>
          </div>
        </div>

        <BrowserNotificationSettings />
      </div>

      {/* Email notifications */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Powiadomienia email</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Które powiadomienia wysyłać do klientów</p>
          </div>
        </div>

        <NotificationSettingsForm settings={settings} />
      </div>
    </div>
  )
}
