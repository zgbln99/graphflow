'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react'
import { updateTagAction, deleteTagAction } from '../actions'

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#6b7280', // gray
]

interface Tag {
  id: string
  name: string
  color: string
  _count: {
    projects: number
  }
}

export default function EditTagPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [tagId, setTagId] = useState<string | null>(null)
  const [tag, setTag] = useState<Tag | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    params.then(p => setTagId(p.id))
  }, [params])

  useEffect(() => {
    if (!tagId) return

    async function fetchTag() {
      try {
        const res = await fetch(`/api/settings/tags/${tagId}`)
        if (!res.ok) throw new Error('Tag nie został znaleziony')
        const data = await res.json()
        setTag(data)
        setName(data.name)
        setColor(data.color)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd ładowania')
      } finally {
        setLoading(false)
      }
    }

    fetchTag()
  }, [tagId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tagId) return

    setSaving(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('color', color)

    const result = await updateTagAction(tagId, formData)

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      router.push('/panel/settings/tags')
    }
  }

  async function handleDelete() {
    if (!tagId) return

    setDeleting(true)
    setError(null)

    const result = await deleteTagAction(tagId)

    if (result.error) {
      setError(result.error)
      setDeleting(false)
      setShowDeleteConfirm(false)
    } else {
      router.push('/panel/settings/tags')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!tag) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card dark:bg-gray-800 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">Tag nie został znaleziony</p>
          <Link href="/panel/settings/tags" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            Wróć do listy tagów
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/panel/settings/tags"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Tagi
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edytuj tag</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Edytuj ustawienia tagu
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card dark:bg-gray-800 dark:border-gray-700 p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nazwa tagu *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="np. Priorytet, Branding, Social Media..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Kolor
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                onClick={() => setColor(presetColor)}
                className={`w-8 h-8 rounded-full transition-transform ${
                  color === presetColor ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: presetColor }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600"
              style={{ backgroundColor: color }}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="input w-32"
              pattern="^#[0-9A-Fa-f]{6}$"
              placeholder="#6366f1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Podgląd
          </label>
          <span
            className="inline-block px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${color}20`,
              color: color,
            }}
          >
            {name || 'Nazwa tagu'}
          </span>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Ten tag jest przypisany do <strong>{tag._count.projects}</strong> projektów.
          </p>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2 inline" />
            Usuń tag
          </button>
          <div className="flex gap-3">
            <Link
              href="/panel/settings/tags"
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Anuluj
            </Link>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn-primary"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Zapisz zmiany
            </button>
          </div>
        </div>
      </form>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Potwierdź usunięcie
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Czy na pewno chcesz usunąć tag <strong>{tag.name}</strong>?
              {tag._count.projects > 0 && (
                <span className="block mt-2 text-sm text-red-600 dark:text-red-400">
                  Uwaga: Tag jest przypisany do {tag._count.projects} projektów. Musisz najpierw usunąć tag z projektów.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2 inline" />
                )}
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
