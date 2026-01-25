import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft, Plus } from 'lucide-react'

export default async function TagsSettingsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const tags = await prisma.projectTag.findMany({
    orderBy: { name: 'asc' },
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
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Ustawienia
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tagi projektów</h1>
          <p className="text-gray-600 mt-1">
            Zarządzaj tagami do kategoryzacji projektów
          </p>
        </div>
        <Link href="/panel/settings/tags/new" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nowy tag
        </Link>
      </div>

      <div className="card">
        {tags.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Brak zdefiniowanych tagów
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/panel/settings/tags/${tag.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{tag.name}</span>
                  <p className="text-sm text-gray-500">
                    {tag._count.projects} projektów
                  </p>
                </div>
                <span
                  className="badge"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
