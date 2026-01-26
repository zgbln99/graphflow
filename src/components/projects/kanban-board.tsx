'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Calendar, MessageSquare, FileText, GripVertical, Filter } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Status {
  id: string
  name: string
  color: string
  slug: string | null
}

interface Project {
  id: string
  number: string
  title: string
  statusId: string
  deadline: Date | null
  status: Status
  clientAccount: { id: string; name: string }
  tags: { id: string; name: string; color: string }[]
  _count: { tickets: number; files: number }
}

interface Client {
  id: string
  name: string
}

interface KanbanBoardProps {
  statuses: Status[]
  projects: Project[]
  clients: Client[]
}

export function KanbanBoard({ statuses, projects: initialProjects, clients }: KanbanBoardProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [draggedProject, setDraggedProject] = useState<Project | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const dragCounter = useRef<{ [key: string]: number }>({})

  // Filter projects by client
  const filteredProjects = selectedClient
    ? projects.filter((p) => p.clientAccount.id === selectedClient)
    : projects

  // Group projects by status
  const projectsByStatus = statuses.reduce(
    (acc, status) => {
      acc[status.id] = filteredProjects.filter((p) => p.statusId === status.id)
      return acc
    },
    {} as Record<string, Project[]>
  )

  const handleDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedProject(project)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', project.id)
    // Add dragging class after a small delay
    setTimeout(() => {
      const el = document.getElementById(`project-${project.id}`)
      if (el) el.classList.add('opacity-50')
    }, 0)
  }

  const handleDragEnd = () => {
    if (draggedProject) {
      const el = document.getElementById(`project-${draggedProject.id}`)
      if (el) el.classList.remove('opacity-50')
    }
    setDraggedProject(null)
    setDragOverStatus(null)
    dragCounter.current = {}
  }

  const handleDragEnter = (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    dragCounter.current[statusId] = (dragCounter.current[statusId] || 0) + 1
    setDragOverStatus(statusId)
  }

  const handleDragLeave = (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    dragCounter.current[statusId] = (dragCounter.current[statusId] || 0) - 1
    if (dragCounter.current[statusId] <= 0) {
      dragCounter.current[statusId] = 0
      if (dragOverStatus === statusId) {
        setDragOverStatus(null)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newStatusId: string) => {
    e.preventDefault()
    dragCounter.current = {}
    setDragOverStatus(null)

    if (!draggedProject || draggedProject.statusId === newStatusId) {
      setDraggedProject(null)
      return
    }

    const projectId = draggedProject.id
    const oldStatusId = draggedProject.statusId
    const newStatus = statuses.find((s) => s.id === newStatusId)

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, statusId: newStatusId, status: newStatus! }
          : p
      )
    )
    setDraggedProject(null)
    setIsUpdating(projectId)

    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusId: newStatusId }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating project status:', error)
      // Revert on error
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, statusId: oldStatusId, status: statuses.find((s) => s.id === oldStatusId)! }
            : p
        )
      )
    } finally {
      setIsUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="input w-auto text-sm dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Wszyscy klienci</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filteredProjects.length} projektów
        </span>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => (
          <div
            key={status.id}
            className={`flex-shrink-0 w-80 rounded-lg transition-colors ${
              dragOverStatus === status.id
                ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
            onDragEnter={(e) => handleDragEnter(e, status.id)}
            onDragLeave={(e) => handleDragLeave(e, status.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {status.name}
                  </h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {projectsByStatus[status.id]?.length || 0}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[200px]">
              {projectsByStatus[status.id]?.map((project) => (
                <div
                  key={project.id}
                  id={`project-${project.id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                    isUpdating === project.id ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {/* Project number and client */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono text-primary-600 dark:text-primary-400">
                          {project.number}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {project.clientAccount.name}
                        </span>
                      </div>

                      {/* Title */}
                      <Link
                        href={`/panel/projects/${project.id}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 block truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.title}
                      </Link>

                      {/* Tags */}
                      {project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{project.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {project._count.tickets > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {project._count.tickets}
                            </span>
                          )}
                          {project._count.files > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {project._count.files}
                            </span>
                          )}
                        </div>
                        {project.deadline && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {formatDate(project.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {(!projectsByStatus[status.id] || projectsByStatus[status.id].length === 0) && (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  Przeciągnij projekt tutaj
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
