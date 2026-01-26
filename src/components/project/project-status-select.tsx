'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2 } from 'lucide-react'
import { updateProjectStatusAction } from '@/components/forms/project-actions'

interface ProjectStatus {
  id: string
  name: string
  slug: string
  color: string
  order: number
}

interface ProjectStatusSelectProps {
  projectId: string
  currentStatusId: string
  statuses: ProjectStatus[]
}

export function ProjectStatusSelect({
  projectId,
  currentStatusId,
  statuses,
}: ProjectStatusSelectProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const currentStatus = statuses.find((s) => s.id === currentStatusId)

  async function handleStatusChange(statusId: string) {
    setIsOpen(false)

    startTransition(async () => {
      await updateProjectStatusAction(projectId, statusId)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="btn-secondary"
        style={{
          backgroundColor: currentStatus ? `${currentStatus.color}10` : undefined,
          borderColor: currentStatus?.color,
          color: currentStatus?.color,
        }}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <div
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: currentStatus?.color }}
          />
        )}
        {currentStatus?.name || 'Status'}
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => handleStatusChange(status.id)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                  status.id === currentStatusId ? 'bg-gray-50' : ''
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                {status.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
