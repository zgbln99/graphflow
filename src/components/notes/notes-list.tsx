'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { addNoteAction, deleteNoteAction } from './note-actions'
interface Note {
  id: string
  content: string
  createdAt: Date | string
  ticketId?: string | null
  projectId?: string | null
}

interface NotesListProps {
  notes: Note[]
  ticketId?: string
  projectId?: string
}

export function NotesList({ notes, ticketId, projectId }: NotesListProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('content', content)
      if (ticketId) formData.append('ticketId', ticketId)
      if (projectId) formData.append('projectId', projectId)

      await addNoteAction(formData)
      setContent('')
      setIsAdding(false)
      router.refresh()
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(noteId: string) {
    if (!confirm('Czy na pewno chcesz usunąć tę notatkę?')) return

    await deleteNoteAction(noteId)
    router.refresh()
  }

  return (
    <div>
      {/* Notes list */}
      {notes.length === 0 && !isAdding ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          Brak notatek
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {notes.map((note) => (
            <div key={note.id} className="p-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatRelativeTime(note.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add note form */}
      {isAdding ? (
        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Treść notatki..."
            rows={3}
            className="input mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="btn-primary btn-sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Zapisz'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setContent('')
              }}
              className="btn-ghost btn-sm"
            >
              Anuluj
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full p-3 text-sm text-primary-600 hover:bg-gray-50 flex items-center justify-center gap-1 border-t border-gray-100"
        >
          <Plus className="w-4 h-4" />
          Dodaj notatkę
        </button>
      )}
    </div>
  )
}
