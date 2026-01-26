'use client'

import { CheckCircle, Circle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
interface TimelineStage {
  id: string
  name: string
  order: number
  plannedDate?: Date | null
  actualDate?: Date | null
  isCurrent: boolean
  isCompleted: boolean
  description?: string | null
}

interface TimelineProps {
  stages: TimelineStage[]
  isAdmin?: boolean
}

export function Timeline({ stages, isAdmin }: TimelineProps) {
  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>Brak zdefiniowanych etapów</p>
        {isAdmin && (
          <p className="text-sm mt-1">Edytuj timeline, aby dodać etapy projektu</p>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1

        return (
          <div key={stage.id} className="relative pl-8 pb-8">
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[11px] top-6 w-0.5 h-full',
                  stage.isCompleted ? 'bg-green-300' : 'bg-gray-200'
                )}
              />
            )}

            {/* Dot */}
            <div
              className={cn(
                'absolute left-0 w-6 h-6 rounded-full flex items-center justify-center',
                stage.isCompleted
                  ? 'bg-green-500 text-white'
                  : stage.isCurrent
                  ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                  : 'bg-gray-200 text-gray-400'
              )}
            >
              {stage.isCompleted ? (
                <CheckCircle className="w-4 h-4" />
              ) : stage.isCurrent ? (
                <div className="w-2 h-2 bg-white rounded-full" />
              ) : (
                <Circle className="w-3 h-3" />
              )}
            </div>

            {/* Content */}
            <div className="ml-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={cn(
                    'font-medium',
                    stage.isCompleted
                      ? 'text-green-700'
                      : stage.isCurrent
                      ? 'text-primary-700'
                      : 'text-gray-600'
                  )}
                >
                  {stage.name}
                </h3>
                {stage.isCurrent && (
                  <span className="badge bg-primary-100 text-primary-700">
                    Aktualny
                  </span>
                )}
              </div>

              {/* Dates */}
              <div className="flex flex-wrap gap-4 mt-1 text-sm">
                {stage.plannedDate && (
                  <span className="text-gray-500">
                    Plan: {formatDate(stage.plannedDate)}
                  </span>
                )}
                {stage.actualDate && (
                  <span className="text-green-600">
                    Realizacja: {formatDate(stage.actualDate)}
                  </span>
                )}
              </div>

              {/* Description */}
              {stage.description && (
                <p className="mt-2 text-sm text-gray-600">{stage.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
