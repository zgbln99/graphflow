'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ClientAccount, ProjectStatus, ProjectTag, TimelineTemplate } from '@prisma/client'
import { createProjectAction, updateProjectAction } from './project-actions'

interface ProjectFormProps {
  clients: ClientAccount[]
  statuses: ProjectStatus[]
  tags: ProjectTag[]
  templates: (TimelineTemplate & { stages: { name: string; order: number }[] })[]
  defaultStatusId?: string
  project?: {
    id: string
    title: string
    description: string | null
    clientAccountId: string
    statusId: string
    deadline: Date | null
    localPath: string | null
    dropboxPath: string | null
    dropboxLink: string | null
    tags: { id: string }[]
  }
}

export function ProjectForm({
  clients,
  statuses,
  tags,
  templates,
  defaultStatusId,
  project,
}: ProjectFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>(
    project?.tags.map((t) => t.id) || []
  )
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const isEditing = !!project

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    // Dodaj wybrane tagi
    selectedTags.forEach((tagId) => {
      formData.append('tagIds', tagId)
    })

    // Dodaj szablon timeline
    if (selectedTemplate) {
      formData.append('templateId', selectedTemplate)
    }

    try {
      const result = isEditing
        ? await updateProjectAction(project.id, formData)
        : await createProjectAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/panel/projects/${result.projectId}`)
        router.refresh()
      }
    } catch (e) {
      setError('Wystąpił błąd podczas zapisywania')
    } finally {
      setIsLoading(false)
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <form action={handleSubmit} className="card p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Klient */}
      <div>
        <label htmlFor="clientAccountId" className="label">
          Klient <span className="text-red-500">*</span>
        </label>
        <select
          id="clientAccountId"
          name="clientAccountId"
          required
          defaultValue={project?.clientAccountId || ''}
          className="input"
          disabled={isEditing}
        >
          <option value="">Wybierz klienta</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tytuł */}
      <div>
        <label htmlFor="title" className="label">
          Tytuł projektu <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={project?.title || ''}
          className="input"
          placeholder="np. Redesign strony głównej"
        />
      </div>

      {/* Opis */}
      <div>
        <label htmlFor="description" className="label">
          Opis
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={project?.description || ''}
          className="input"
          placeholder="Szczegółowy opis projektu..."
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="statusId" className="label">
          Status
        </label>
        <select
          id="statusId"
          name="statusId"
          defaultValue={project?.statusId || defaultStatusId || ''}
          className="input"
        >
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="deadline" className="label">
          Deadline
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          defaultValue={
            project?.deadline
              ? new Date(project.deadline).toISOString().split('T')[0]
              : ''
          }
          className="input"
        />
      </div>

      {/* Tagi */}
      {tags.length > 0 && (
        <div>
          <label className="label">Tagi</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`badge cursor-pointer transition-colors ${
                  selectedTags.includes(tag.id)
                    ? ''
                    : 'opacity-50 hover:opacity-75'
                }`}
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                  borderWidth: selectedTags.includes(tag.id) ? '2px' : '1px',
                  borderColor: selectedTags.includes(tag.id)
                    ? tag.color
                    : 'transparent',
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Szablon timeline (tylko przy tworzeniu) */}
      {!isEditing && templates.length > 0 && (
        <div>
          <label htmlFor="template" className="label">
            Szablon timeline
          </label>
          <select
            id="template"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="input"
          >
            <option value="">Bez szablonu</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.stages.length} etapów)
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <p className="text-sm text-gray-500 mt-1">
              Etapy:{' '}
              {templates
                .find((t) => t.id === selectedTemplate)
                ?.stages.map((s) => s.name)
                .join(' → ')}
            </p>
          )}
        </div>
      )}

      {/* Lokalizacje plików */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-medium text-gray-900 mb-4">Lokalizacje plików</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="localPath" className="label">
              Ścieżka lokalna
            </label>
            <input
              id="localPath"
              name="localPath"
              type="text"
              defaultValue={project?.localPath || ''}
              className="input"
              placeholder="/Projekty/KlientX/ProjektY"
            />
          </div>

          <div>
            <label htmlFor="dropboxPath" className="label">
              Ścieżka Dropbox
            </label>
            <input
              id="dropboxPath"
              name="dropboxPath"
              type="text"
              defaultValue={project?.dropboxPath || ''}
              className="input"
              placeholder="/Dropbox/Projekty/KlientX"
            />
          </div>

          <div>
            <label htmlFor="dropboxLink" className="label">
              Link Dropbox (do udostępnienia)
            </label>
            <input
              id="dropboxLink"
              name="dropboxLink"
              type="url"
              defaultValue={project?.dropboxLink || ''}
              className="input"
              placeholder="https://www.dropbox.com/..."
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Link href="/panel/projects" className="btn-ghost">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anuluj
        </Link>
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Zapisywanie...
            </>
          ) : isEditing ? (
            'Zapisz zmiany'
          ) : (
            'Utwórz projekt'
          )}
        </button>
      </div>
    </form>
  )
}
