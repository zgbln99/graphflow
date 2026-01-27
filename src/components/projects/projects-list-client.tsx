'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProjectQuickPreview } from '@/components/ui/quick-preview'
import { SwipeableListItem } from '@/components/ui/swipe-actions'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { formatDate } from '@/lib/utils'

interface Project {
  id: string
  number: string
  title: string
  description?: string | null
  deadline?: Date | null
  updatedAt: Date
  status: { id: string; name: string; color: string }
  clientAccount: { id: string; name: string }
  tags: Array<{ id: string; name: string; color: string }>
  createdBy?: { id: string; name: string } | null
  _count: { tickets: number }
}

interface ProjectsListClientProps {
  projects: Project[]
  isAdmin: boolean
}

export function ProjectsListClient({ projects, isAdmin }: ProjectsListClientProps) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleRefresh = async () => {
    router.refresh()
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Mobile card view with swipe actions
  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="min-h-[50vh]">
        <div className="space-y-3">
          {projects.map((project) => (
            <SwipeableListItem
              key={project.id}
              onEdit={isAdmin ? () => router.push(`/panel/projects/${project.id}/edit`) : undefined}
            >
              <Link
                href={`/panel/projects/${project.id}`}
                className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {project.number}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${project.status.color}20`,
                      color: project.status.color,
                    }}
                  >
                    {project.status.name}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  {project.title}
                </h3>
                {isAdmin && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {project.clientAccount.name}
                  </p>
                )}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${tag.color}15`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>{project._count.tickets} ticketów</span>
                  {project.deadline && (
                    <span>Deadline: {formatDate(project.deadline)}</span>
                  )}
                </div>
              </Link>
            </SwipeableListItem>
          ))}
        </div>
      </PullToRefresh>
    )
  }

  // Desktop table view with quick preview on title
  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-[50vh]">
      <div className="card dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="table-header">Numer</th>
                <th className="table-header">Tytuł</th>
                {isAdmin && <th className="table-header">Klient</th>}
                <th className="table-header">Zlecił</th>
                <th className="table-header">Status</th>
                <th className="table-header hidden sm:table-cell">Tickety</th>
                <th className="table-header hidden md:table-cell">Deadline</th>
                <th className="table-header hidden lg:table-cell">Aktualizacja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="table-cell">
                    <Link
                      href={`/panel/projects/${project.id}`}
                      className="font-mono text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700"
                    >
                      {project.number}
                    </Link>
                  </td>
                  <td className="table-cell">
                    <ProjectQuickPreview
                      project={{
                        number: project.number,
                        title: project.title,
                        description: project.description,
                        status: project.status,
                        clientName: isAdmin ? project.clientAccount.name : undefined,
                        deadline: project.deadline,
                        updatedAt: project.updatedAt,
                        ticketsCount: project._count.tickets,
                        tags: project.tags,
                      }}
                    >
                      <Link
                        href={`/panel/projects/${project.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-primary-600"
                      >
                        {project.title}
                      </Link>
                    </ProjectQuickPreview>
                    {project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="table-cell text-gray-600 dark:text-gray-400">
                      {project.clientAccount.name}
                    </td>
                  )}
                  <td className="table-cell text-gray-600 dark:text-gray-400">
                    {project.createdBy?.name || '-'}
                  </td>
                  <td className="table-cell">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${project.status.color}20`,
                        color: project.status.color,
                      }}
                    >
                      {project.status.name}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {project._count.tickets}
                  </td>
                  <td className="table-cell text-gray-600 dark:text-gray-400 hidden md:table-cell">
                    {formatDate(project.deadline)}
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400 text-sm hidden lg:table-cell">
                    {formatDate(project.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PullToRefresh>
  )
}
