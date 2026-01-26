'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { createTagAction } from '../actions'

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

export default function NewTagPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('color', color)

    const result = await createTagAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/panel/settings/tags')
    }
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nowy tag</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Utwórz nowy tag do kategoryzacji projektów
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

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link
            href="/panel/settings/tags"
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Anuluj
          </Link>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Utwórz tag
          </button>
        </div>
      </form>
    </div>
  )
}
