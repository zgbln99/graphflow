'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical, Check, Calendar, Loader2, FileDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  addTimelineStageAction,
  updateTimelineStageAction,
  deleteTimelineStageAction,
  applyTemplateAction,
} from './timeline-actions'

interface TimelineStage {
  id: string
  name: string
  order: number
  plannedDate: Date | null
  actualDate: Date | null
  isCurrent: boolean
  isCompleted: boolean
  description: string | null
}

interface Template {
  id: string
  name: string
  stages: { name: string; order: number }[]
}

interface TimelineEditorProps {
  projectId: string
  stages: TimelineStage[]
  templates: Template[]
}

export function TimelineEditor({ projectId, stages, templates }: TimelineEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingStage, setEditingStage] = useState<string | null>(null)
  const [newStageName, setNewStageName] = useState('')

  async function handleAddStage() {
    if (!newStageName.trim()) return

    startTransition(async () => {
      const result = await addTimelineStageAction(projectId, {
        name: newStageName,
        order: stages.length,
      })
      if (result.success) {
        setNewStageName('')
        router.refresh()
      }
    })
  }

  async function handleUpdateStage(stageId: string, data: Partial<TimelineStage>) {
    startTransition(async () => {
      await updateTimelineStageAction(stageId, data)
      setEditingStage(null)
      router.refresh()
    })
  }

  async function handleDeleteStage(stageId: string) {
    if (!confirm('Czy na pewno chcesz usunąć ten etap?')) return

    startTransition(async () => {
      await deleteTimelineStageAction(stageId)
      router.refresh()
    })
  }

  async function handleSetCurrent(stageId: string) {
    startTransition(async () => {
      // Najpierw usuń current z innych
      for (const stage of stages) {
        if (stage.isCurrent && stage.id !== stageId) {
          await updateTimelineStageAction(stage.id, { isCurrent: false })
        }
      }
      // Ustaw current na wybranym
      await updateTimelineStageAction(stageId, { isCurrent: true })
      router.refresh()
    })
  }

  async function handleToggleCompleted(stageId: string, isCompleted: boolean) {
    startTransition(async () => {
      await updateTimelineStageAction(stageId, {
        isCompleted,
        actualDate: isCompleted ? new Date() : null,
      })
      router.refresh()
    })
  }

  async function handleApplyTemplate(templateId: string) {
    if (stages.length > 0) {
      if (!confirm('To nadpisze istniejące etapy. Kontynuować?')) return
    }

    startTransition(async () => {
      await applyTemplateAction(projectId, templateId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Template selector */}
      {templates.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <FileDown className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">Zastosuj szablon:</span>
          <select
            onChange={(e) => e.target.value && handleApplyTemplate(e.target.value)}
            disabled={isPending}
            className="input py-1 px-2 text-sm"
            defaultValue=""
          >
            <option value="">Wybierz szablon...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.stages.length} etapów)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stages list */}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={`border rounded-lg p-4 transition-all ${
              stage.isCurrent
                ? 'border-primary-500 bg-primary-50'
                : stage.isCompleted
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-2 text-gray-400">
                <GripVertical className="w-5 h-5 cursor-move" />
                <span className="text-sm font-medium">{index + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                {editingStage === stage.id ? (
                  <StageEditForm
                    stage={stage}
                    onSave={(data) => handleUpdateStage(stage.id, data)}
                    onCancel={() => setEditingStage(null)}
                    isPending={isPending}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className="font-medium text-gray-900 cursor-pointer hover:text-primary-600"
                        onClick={() => setEditingStage(stage.id)}
                      >
                        {stage.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {stage.plannedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Plan: {formatDate(stage.plannedDate)}
                          </span>
                        )}
                        {stage.actualDate && (
                          <span className="text-green-600">
                            Wykonano: {formatDate(stage.actualDate)}
                          </span>
                        )}
                      </div>
                      {stage.description && (
                        <p className="text-sm text-gray-600 mt-2">{stage.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!stage.isCurrent && (
                        <button
                          onClick={() => handleSetCurrent(stage.id)}
                          disabled={isPending}
                          className="btn-secondary text-xs py-1 px-2"
                          title="Ustaw jako aktualny"
                        >
                          Aktualny
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleCompleted(stage.id, !stage.isCompleted)}
                        disabled={isPending}
                        className={`p-2 rounded-lg transition-colors ${
                          stage.isCompleted
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                        }`}
                        title={stage.isCompleted ? 'Oznacz jako nieukończony' : 'Oznacz jako ukończony'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        disabled={isPending}
                        className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Usuń etap"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add new stage */}
      <div className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-lg">
        <input
          type="text"
          value={newStageName}
          onChange={(e) => setNewStageName(e.target.value)}
          placeholder="Nazwa nowego etapu..."
          className="input flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
        />
        <button
          onClick={handleAddStage}
          disabled={isPending || !newStageName.trim()}
          className="btn-primary"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span className="ml-2">Dodaj etap</span>
        </button>
      </div>
    </div>
  )
}

function StageEditForm({
  stage,
  onSave,
  onCancel,
  isPending,
}: {
  stage: TimelineStage
  onSave: (data: Partial<TimelineStage>) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [name, setName] = useState(stage.name)
  const [plannedDate, setPlannedDate] = useState(
    stage.plannedDate ? stage.plannedDate.toISOString().split('T')[0] : ''
  )
  const [description, setDescription] = useState(stage.description || '')

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input w-full"
        placeholder="Nazwa etapu"
      />
      <div className="flex gap-3">
        <input
          type="date"
          value={plannedDate}
          onChange={(e) => setPlannedDate(e.target.value)}
          className="input"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input flex-1"
          placeholder="Opis (opcjonalnie)"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary" disabled={isPending}>
          Anuluj
        </button>
        <button
          onClick={() =>
            onSave({
              name,
              plannedDate: plannedDate ? new Date(plannedDate) : null,
              description: description || null,
            })
          }
          className="btn-primary"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zapisz'}
        </button>
      </div>
    </div>
  )
}
