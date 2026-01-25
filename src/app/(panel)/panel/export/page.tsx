import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Download, FileSpreadsheet, Calendar, Ticket, Folder } from 'lucide-react'
import { ExportForm } from '@/components/export/export-form'

export default async function ExportPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Eksport danych</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Eksportuj dane do formatu CSV
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ExportCard
          icon={<Folder className="w-6 h-6" />}
          title="Projekty"
          description="Lista wszystkich projektów ze statusami i datami"
          type="projects"
        />
        <ExportCard
          icon={<Ticket className="w-6 h-6" />}
          title="Tickety"
          description="Lista zgłoszeń z priorytetami i deadline'ami"
          type="tickets"
        />
        <ExportCard
          icon={<Calendar className="w-6 h-6" />}
          title="Timeline"
          description="Etapy projektów z datami planowanymi i rzeczywistymi"
          type="timeline"
        />
        <ExportCard
          icon={<FileSpreadsheet className="w-6 h-6" />}
          title="Raport pełny"
          description="Wszystkie dane w jednym pliku"
          type="full"
        />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Eksport niestandardowy</h2>
        <ExportForm />
      </div>
    </div>
  )
}

function ExportCard({
  icon,
  title,
  description,
  type,
}: {
  icon: React.ReactNode
  title: string
  description: string
  type: string
}) {
  return (
    <form action={`/api/export/${type}`} method="GET">
      <button
        type="submit"
        className="card p-6 w-full text-left hover:border-primary-300 hover:shadow-lg transition-all group"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
          <Download className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </div>
      </button>
    </form>
  )
}
