import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ArrowLeft } from 'lucide-react'
import { StatusEditForm } from '@/components/settings/status-edit-form'

export default async function StatusEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/panel')
  }

  const { id } = await params

  const status = await prisma.projectStatus.findUnique({
    where: { id },
    include: {
      _count: {
        select: { projects: true },
      },
    },
  })

  if (!status) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/panel/settings/statuses"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Statusy
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edytuj status</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Zmień ustawienia statusu &ldquo;{status.name}&rdquo;
        </p>
      </div>

      <StatusEditForm
        status={{
          id: status.id,
          name: status.name,
          slug: status.slug,
          color: status.color,
          order: status.order,
          isDefault: status.isDefault,
          isActive: status.isActive,
          notifyOnChange: (status as any).notifyOnChange ?? true,
        }}
        projectCount={status._count.projects}
      />
    </div>
  )
}
