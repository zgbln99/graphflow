'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, CheckCircle } from 'lucide-react'
import { changePasswordAction } from './actions'

export default function ChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const result = await changePasswordAction(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      // Reset form
      const form = document.getElementById('password-form') as HTMLFormElement
      form?.reset()
    }

    setIsLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zmien haslo</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Zaktualizuj swoje haslo dostepu do konta
        </p>
      </div>

      <div className="card p-6">
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300">Haslo zostalo zmienione pomyslnie!</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <form id="password-form" action={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="currentPassword" className="label">
              Aktualne haslo
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                required
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="label">
              Nowe haslo
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                required
                minLength={8}
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Minimum 8 znakow</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Potwierdz nowe haslo
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={8}
              className="input"
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Zapisywanie...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Zmien haslo
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
