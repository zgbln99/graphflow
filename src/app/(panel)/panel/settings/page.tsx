import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Settings, Clock, Tags, FolderKanban, Mail, Bell } from 'lucide-react'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const [statusCount, tagCount, templateCount] = await Promise.all([
    prisma.projectStatus.count(),
    prisma.projectTag.count(),
    prisma.timelineTemplate.count(),
  ])

  const settings = [
    {
      href: '/panel/settings/statuses',
      icon: Clock,
      title: 'Statusy projektów',
      description: 'Zarządzaj statusami dla projektów',
      count: statusCount,
    },
    {
      href: '/panel/settings/tags',
      icon: Tags,
      title: 'Tagi projektów',
      description: 'Zarządzaj tagami do kategoryzacji projektów',
      count: tagCount,
    },
    {
      href: '/panel/settings/templates',
      icon: FolderKanban,
      title: 'Szablony timeline',
      description: 'Definiuj szablony etapów dla projektów',
      count: templateCount,
    },
    {
      href: '/panel/settings/notifications',
      icon: Bell,
      title: 'Powiadomienia',
      description: 'Ustawienia powiadomień email',
    },
    {
      href: '/panel/settings/email',
      icon: Mail,
      title: 'Konfiguracja email',
      description: 'Ustawienia SMTP i IMAP',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ustawienia</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Konfiguracja systemu GraphFlow</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settings.map((setting) => {
          const Icon = setting.icon
          return (
            <Link
              key={setting.href}
              href={setting.href}
              className="card dark:bg-gray-800 dark:border-gray-700 p-5 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{setting.title}</h3>
                    {setting.count !== undefined && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">{setting.count}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{setting.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
