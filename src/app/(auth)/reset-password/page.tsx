'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { resetPasswordAction } from './actions'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Nieprawidłowy link</h1>
        <p className="text-gray-600 mb-6">
          Link do resetu hasła jest nieprawidłowy lub wygasł.
        </p>
        <Link href="/forgot-password" className="btn-primary">
          Poproś o nowy link
        </Link>
      </div>
    )
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      formData.append('token', token!)
      const result = await resetPasswordAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    } catch (e) {
      setError('Wystąpił błąd podczas resetu hasła')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hasło zmienione</h1>
        <p className="text-gray-600 mb-6">
          Twoje hasło zostało pomyślnie zmienione. Możesz teraz się zalogować.
        </p>
        <Link href="/login" className="btn-primary">
          Przejdź do logowania
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ustaw nowe hasło</h1>
        <p className="text-gray-600 mt-2">
          Wprowadź nowe hasło dla swojego konta.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="label">
            Nowe hasło
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              className="input pr-10"
              placeholder="Minimum 8 znaków"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Potwierdź hasło
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            className="input"
            placeholder="Powtórz hasło"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Zapisywanie...
            </>
          ) : (
            'Ustaw nowe hasło'
          )}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="card p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
