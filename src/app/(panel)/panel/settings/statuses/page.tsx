import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft, Plus, GripVertical, Star, Bell, BellOff } from 'lucide-react'

export default async function StatusesSettingsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const statuses = await prisma.projectStatus.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: {
        select: { projects: true },
      },
    },
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/panel/settings"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Ustawienia
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statusy projektów</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Zarządzaj statusami dostępnymi dla projektów
          </p>
        </div>
        <Link href="/panel/settings/statuses/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nowy status
        </Link>
      </div>

      <div className="card dark:bg-gray-800 dark:border-gray-700">
        {statuses.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Brak zdefiniowanych statusów
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {statuses.map((status) => (
              <Link
                key={status.id}
                href={`/panel/settings/statuses/${status.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <GripVertical className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{status.name}</span>
                    {status.isDefault && (
                      <span className="badge bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Domyślny
                      </span>
                    )}
                    {!status.isActive && (
                      <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        Nieaktywny
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {status._count.projects} projektów
                  </p>
                </div>
                {/* Notification indicator */}
                <div className="flex items-center" title={(status as any).notifyOnChange !== false ? 'Powiadomienia włączone' : 'Powiadomienia wyłączone'}>
                  {(status as any).notifyOnChange !== false ? (
                    <Bell className="w-4 h-4 text-green-500" />
                  ) : (
                    <BellOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
