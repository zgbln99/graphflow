import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft, Plus, Star, FolderKanban } from 'lucide-react'

export default async function TemplatesSettingsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const templates = await prisma.timelineTemplate.findMany({
    orderBy: { name: 'asc' },
    include: {
      stages: {
        orderBy: { order: 'asc' },
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Szablony timeline</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Definiuj szablony etapów dla nowych projektów
          </p>
        </div>
        <Link href="/panel/settings/templates/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nowy szablon
        </Link>
      </div>

      <div className="card dark:bg-gray-800 dark:border-gray-700">
        {templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Brak zdefiniowanych szablonów
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {templates.map((template: typeof templates[number]) => (
              <Link
                key={template.id}
                href={`/panel/settings/templates/${template.id}`}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FolderKanban className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{template.name}</span>
                  {template.isDefault && (
                    <span className="badge bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Domyślny
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 ml-8">
                  {template.stages.map((stage: typeof template.stages[number], index: number) => (
                    <span key={stage.id} className="text-sm text-gray-500 dark:text-gray-400">
                      {stage.name}
                      {index < template.stages.length - 1 && (
                        <span className="mx-1">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
