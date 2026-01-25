'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ClientAccount, Project } from '@prisma/client'
import { createTicketAction, updateTicketAction } from './ticket-actions'
import { priorityLabels } from '@/lib/utils'

interface TicketFormProps {
  clients: ClientAccount[]
  projects: { id: string; number: string; title: string; clientAccountId: string }[]
  defaultProjectId?: string
  userClientAccountId: string | null
  isAdmin: boolean
  ticket?: {
    id: string
    title: string
    description: string | null
    priority: string
    deadline: Date | null
    projectId: string | null
    clientAccountId: string
  }
}

export function TicketForm({
  clients,
  projects,
  defaultProjectId,
  userClientAccountId,
  isAdmin,
  ticket,
}: TicketFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string>(
    ticket?.clientAccountId || ''
  )

  const isEditing = !!ticket

  // Filtruj projekty dla wybranego klienta
  const filteredProjects = isAdmin && selectedClient
    ? projects.filter((p) => p.clientAccountId === selectedClient)
    : projects

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = isEditing
        ? await updateTicketAction(ticket.id, formData)
        : await createTicketAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/panel/tickets/${result.ticketId}`)
        router.refresh()
      }
    } catch (e) {
      setError('Wystąpił błąd podczas zapisywania')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="card p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Klient (tylko admin) */}
      {isAdmin && (
        <div>
          <label htmlFor="clientAccountId" className="label">
            Klient <span className="text-red-500">*</span>
          </label>
          <select
            id="clientAccountId"
            name="clientAccountId"
            required
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
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
      )}

      {/* Tytuł */}
      <div>
        <label htmlFor="title" className="label">
          Tytuł <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={ticket?.title || ''}
          className="input"
          placeholder="Krótki opis problemu lub zadania"
        />
      </div>

      {/* Opis */}
      <div>
        <label htmlFor="description" className="label">
          Szczegółowy opis
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={ticket?.description || ''}
          className="input"
          placeholder="Opisz szczegółowo czego dotyczy zgłoszenie..."
        />
      </div>

      {/* Projekt */}
      {filteredProjects.length > 0 && (
        <div>
          <label htmlFor="projectId" className="label">
            Powiązany projekt
          </label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={ticket?.projectId || defaultProjectId || ''}
            className="input"
          >
            <option value="">Bez powiązania z projektem</option>
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.number} - {project.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Priorytet */}
      <div>
        <label htmlFor="priority" className="label">
          Priorytet
        </label>
        <select
          id="priority"
          name="priority"
          defaultValue={ticket?.priority || 'NORMAL'}
          className="input"
        >
          {Object.entries(priorityLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="deadline" className="label">
          Deadline (opcjonalnie)
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          defaultValue={
            ticket?.deadline
              ? new Date(ticket.deadline).toISOString().split('T')[0]
              : ''
          }
          className="input"
        />
        <p className="text-sm text-gray-500 mt-1">
          Jeśli zgłoszenie ma konkretny termin realizacji
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Link href="/panel/tickets" className="btn-ghost">
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
            'Utwórz zgłoszenie'
          )}
        </button>
      </div>
    </form>
  )
}
