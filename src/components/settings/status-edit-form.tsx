'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2, Bell, BellOff, Star, Eye, EyeOff } from 'lucide-react'

interface StatusData {
  id: string
  name: string
  slug: string
  color: string
  order: number
  isDefault: boolean
  isActive: boolean
  notifyOnChange: boolean
}

interface StatusEditFormProps {
  status: StatusData
  projectCount: number
}

export function StatusEditForm({ status, projectCount }: StatusEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: status.name,
    color: status.color,
    isDefault: status.isDefault,
    isActive: status.isActive,
    notifyOnChange: status.notifyOnChange,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/settings/statuses/${status.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Nie udało się zapisać zmian')
      }

      router.push('/panel/settings/statuses')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (projectCount > 0) {
      setError(`Nie można usunąć statusu - jest używany przez ${projectCount} projektów`)
      return
    }

    if (!confirm('Czy na pewno chcesz usunąć ten status?')) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/settings/statuses/${status.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Nie udało się usunąć statusu')
      }

      router.push('/panel/settings/statuses')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="card dark:bg-gray-800 dark:border-gray-700 p-6 space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nazwa statusu
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            required
          />
        </div>

        {/* Color */}
        <div>
          <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Kolor
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="input flex-1"
              pattern="^#[0-9A-Fa-f]{6}$"
              placeholder="#6366f1"
            />
            <div
              className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow"
              style={{ backgroundColor: formData.color }}
            />
          </div>
        </div>

        {/* Slug (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slug (identyfikator)
          </label>
          <input
            type="text"
            value={status.slug}
            disabled
            className="input bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Slug jest generowany automatycznie i nie może być zmieniony
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Ustawienia</h3>

        <div className="space-y-4">
          {/* Notify on change */}
          <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
            <div className="flex items-center gap-3">
              {formData.notifyOnChange ? (
                <Bell className="w-5 h-5 text-green-500" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Powiadomienia email
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Wysyłaj email przy zmianie na ten status
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.notifyOnChange}
              onChange={(e) => setFormData({ ...formData, notifyOnChange: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>

          {/* Is default */}
          <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
            <div className="flex items-center gap-3">
              <Star className={`w-5 h-5 ${formData.isDefault ? 'text-yellow-500' : 'text-gray-400'}`} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Status domyślny
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nowe projekty otrzymają ten status automatycznie
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>

          {/* Is active */}
          <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
            <div className="flex items-center gap-3">
              {formData.isActive ? (
                <Eye className="w-5 h-5 text-green-500" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Status aktywny
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nieaktywne statusy nie są widoczne w wybierakach
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || projectCount > 0}
          className="btn-danger flex items-center gap-2"
          title={projectCount > 0 ? `Używany przez ${projectCount} projektów` : undefined}
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? 'Usuwanie...' : 'Usuń status'}
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/panel/settings/statuses')}
            className="btn-secondary"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </div>
      </div>

      {/* Info */}
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Ten status jest używany przez <strong>{projectCount}</strong> projektów
      </p>
    </form>
  )
}
