'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  MessageSquare,
  FileText,
  GripVertical,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  ExternalLink,
  User,
  X,
  Plus,
  Trash2
} from 'lucide-react'
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
  updatedAt: Date
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

// Check if deadline is soon (within 3 days)
function isDeadlineSoon(deadline: Date | null): boolean {
  if (!deadline) return false
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 3 && diffDays >= 0
}

// Check if deadline is overdue
function isDeadlineOverdue(deadline: Date | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function KanbanBoard({ statuses, projects: initialProjects, clients }: KanbanBoardProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [draggedProject, setDraggedProject] = useState<Project | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [showSuccessAnimation, setShowSuccessAnimation] = useState<string | null>(null)
  const dragCounter = useRef<{ [key: string]: number }>({})

  // Corrections modal state
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<{ projectId: string; oldStatusId: string; newStatusId: string } | null>(null)
  const [corrections, setCorrections] = useState<string[]>([''])
  const [isSubmittingCorrections, setIsSubmittingCorrections] = useState(false)

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

    // Create custom drag image
    const el = document.getElementById(`project-${project.id}`)
    if (el) {
      const clone = el.cloneNode(true) as HTMLElement
      clone.style.transform = 'rotate(3deg)'
      clone.style.opacity = '0.9'
      document.body.appendChild(clone)
      e.dataTransfer.setDragImage(clone, 150, 50)
      setTimeout(() => clone.remove(), 0)
    }
  }

  const handleDragEnd = () => {
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

    // Check if dropping to "Poprawki" status - show corrections modal
    if (newStatus?.slug === 'poprawki' || newStatus?.name.toLowerCase().includes('poprawki')) {
      setPendingDrop({ projectId, oldStatusId, newStatusId })
      setCorrections([''])
      setShowCorrectionsModal(true)
      setDraggedProject(null)
      return
    }

    // Normal status change
    await performStatusChange(projectId, oldStatusId, newStatusId, newStatus!)
    setDraggedProject(null)
  }

  const performStatusChange = async (
    projectId: string,
    oldStatusId: string,
    newStatusId: string,
    newStatus: Status,
    correctionsList?: string[]
  ) => {
    // Optimistic update with animation
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, statusId: newStatusId, status: newStatus }
          : p
      )
    )
    setIsUpdating(projectId)

    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusId: newStatusId,
          corrections: correctionsList,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Show success animation
      setShowSuccessAnimation(projectId)
      setTimeout(() => setShowSuccessAnimation(null), 1500)
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

  const handleCorrectionsSubmit = async () => {
    if (!pendingDrop) return

    const validCorrections = corrections.filter(c => c.trim())
    if (validCorrections.length === 0) {
      // If no corrections entered, still allow the status change
    }

    setIsSubmittingCorrections(true)
    const newStatus = statuses.find((s) => s.id === pendingDrop.newStatusId)!

    await performStatusChange(
      pendingDrop.projectId,
      pendingDrop.oldStatusId,
      pendingDrop.newStatusId,
      newStatus,
      validCorrections
    )

    setIsSubmittingCorrections(false)
    setShowCorrectionsModal(false)
    setPendingDrop(null)
    setCorrections([''])
  }

  const handleCorrectionsCancel = () => {
    setShowCorrectionsModal(false)
    setPendingDrop(null)
    setCorrections([''])
  }

  const addCorrectionField = () => {
    setCorrections([...corrections, ''])
  }

  const removeCorrectionField = (index: number) => {
    if (corrections.length > 1) {
      setCorrections(corrections.filter((_, i) => i !== index))
    }
  }

  const updateCorrection = (index: number, value: string) => {
    const newCorrections = [...corrections]
    newCorrections[index] = value
    setCorrections(newCorrections)
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="input w-auto text-sm dark:bg-gray-700 dark:border-gray-600 rounded-lg"
            >
              <option value="">Wszyscy klienci</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {filteredProjects.length} projektów
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-500 dark:text-gray-400">
              {statuses.length} kolumn
            </span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {statuses.map((status, statusIndex) => {
          const statusProjects = projectsByStatus[status.id] || []
          const isDropTarget = dragOverStatus === status.id && draggedProject?.statusId !== status.id

          return (
            <div
              key={status.id}
              className={`
                flex-shrink-0 w-80 rounded-xl transition-all duration-300 ease-out
                ${isDropTarget
                  ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900 bg-primary-50/50 dark:bg-primary-900/20 scale-[1.02]'
                  : 'bg-gray-50 dark:bg-gray-800/50'
                }
              `}
              onDragEnter={(e) => handleDragEnter(e, status.id)}
              onDragLeave={(e) => handleDragLeave(e, status.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.id)}
              style={{
                animationDelay: `${statusIndex * 50}ms`,
              }}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-800"
                      style={{
                        backgroundColor: status.color,
                        ['--tw-ring-color' as string]: status.color,
                      }}
                    />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {status.name}
                    </h3>
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-full">
                    {statusProjects.length}
                  </span>
                </div>

                {/* Column Progress Bar */}
                <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 ease-out rounded-full"
                    style={{
                      width: `${(statusProjects.length / Math.max(filteredProjects.length, 1)) * 100}%`,
                      backgroundColor: status.color,
                    }}
                  />
                </div>
              </div>

              {/* Cards Container */}
              <div className="p-3 space-y-3 min-h-[300px] max-h-[calc(100vh-300px)] overflow-y-auto">
                {statusProjects.map((project, projectIndex) => {
                  const isDragging = draggedProject?.id === project.id
                  const isBeingUpdated = isUpdating === project.id
                  const showSuccess = showSuccessAnimation === project.id
                  const deadlineSoon = isDeadlineSoon(project.deadline)
                  const deadlineOverdue = isDeadlineOverdue(project.deadline)

                  return (
                    <div
                      key={project.id}
                      id={`project-${project.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, project)}
                      onDragEnd={handleDragEnd}
                      className={`
                        group relative bg-white dark:bg-gray-900 rounded-xl shadow-sm
                        border border-gray-200 dark:border-gray-700
                        transition-all duration-200 ease-out
                        ${isDragging ? 'opacity-40 scale-95 rotate-2' : 'opacity-100'}
                        ${isBeingUpdated ? 'animate-pulse' : ''}
                        ${showSuccess ? 'ring-2 ring-green-500 ring-offset-2' : ''}
                        hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600
                        hover:-translate-y-0.5
                        cursor-grab active:cursor-grabbing
                      `}
                      style={{
                        animationDelay: `${projectIndex * 30}ms`,
                      }}
                    >
                      {/* Success Checkmark Animation */}
                      {showSuccess && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className="bg-green-500 text-white rounded-full p-1 shadow-lg animate-bounce">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                      )}

                      {/* Card Content */}
                      <div className="p-4">
                        {/* Header with drag handle and actions */}
                        <div className="flex items-start gap-2 mb-3">
                          <div className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Project number and client */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-mono font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                                {project.number}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <User className="w-3 h-3" />
                                <span className="truncate max-w-[100px]">{project.clientAccount.name}</span>
                              </div>
                            </div>

                            {/* Title */}
                            <Link
                              href={`/panel/projects/${project.id}`}
                              className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 block line-clamp-2 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {project.title}
                            </Link>
                          </div>
                        </div>

                        {/* Tags */}
                        {project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {project.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-transform hover:scale-105"
                                style={{
                                  backgroundColor: `${tag.color}15`,
                                  color: tag.color,
                                  border: `1px solid ${tag.color}30`,
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                            {project.tags.length > 3 && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 px-1">
                                +{project.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                          {/* Stats */}
                          <div className="flex items-center gap-3">
                            {project._count.tickets > 0 && (
                              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{project._count.tickets}</span>
                              </span>
                            )}
                            {project._count.files > 0 && (
                              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                <FileText className="w-3.5 h-3.5" />
                                <span>{project._count.files}</span>
                              </span>
                            )}
                          </div>

                          {/* Deadline */}
                          {project.deadline && (
                            <span
                              className={`
                                flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors
                                ${deadlineOverdue
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                  : deadlineSoon
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }
                              `}
                            >
                              {deadlineOverdue ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : deadlineSoon ? (
                                <Clock className="w-3.5 h-3.5" />
                              ) : (
                                <Calendar className="w-3.5 h-3.5" />
                              )}
                              <span>{formatDate(project.deadline)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Button */}
                      <Link
                        href={`/panel/projects/${project.id}`}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                        title="Otwórz projekt"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </Link>
                    </div>
                  )
                })}

                {/* Empty state */}
                {statusProjects.length === 0 && (
                  <div
                    className={`
                      flex flex-col items-center justify-center py-12 text-center
                      border-2 border-dashed rounded-xl transition-all duration-200
                      ${isDropTarget
                        ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                      }
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors
                      ${isDropTarget
                        ? 'bg-primary-100 dark:bg-primary-900/40'
                        : 'bg-gray-100 dark:bg-gray-800'
                      }
                    `}>
                      <GripVertical className={`w-5 h-5 ${isDropTarget ? 'text-primary-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isDropTarget ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {isDropTarget ? 'Upuść tutaj!' : 'Brak projektów'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {isDropTarget ? '' : 'Przeciągnij projekt do tej kolumny'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Przeciągnij i upuść</span>
        {' '}aby zmienić status projektu
      </div>

      {/* Corrections Modal */}
      {showCorrectionsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={handleCorrectionsCancel}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative w-full max-w-lg transform rounded-xl bg-white dark:bg-gray-900 shadow-2xl animate-fade-in-scale"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Dodaj poprawki
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Wpisz poprawki do wykonania w projekcie
                  </p>
                </div>
                <button
                  onClick={handleCorrectionsCancel}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-3">
                  {corrections.map((correction, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={correction}
                        onChange={(e) => updateCorrection(index, e.target.value)}
                        placeholder={`Poprawka ${index + 1}...`}
                        className="flex-1 input dark:bg-gray-800 dark:border-gray-700"
                        autoFocus={index === corrections.length - 1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && correction.trim()) {
                            e.preventDefault()
                            addCorrectionField()
                          }
                        }}
                      />
                      {corrections.length > 1 && (
                        <button
                          onClick={() => removeCorrectionField(index)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addCorrectionField}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Dodaj kolejną poprawkę
                </button>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button
                  onClick={handleCorrectionsCancel}
                  disabled={isSubmittingCorrections}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleCorrectionsSubmit}
                  disabled={isSubmittingCorrections}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCorrections ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      Zmień na Poprawki
                      {corrections.filter(c => c.trim()).length > 0 && (
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                          {corrections.filter(c => c.trim()).length}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
