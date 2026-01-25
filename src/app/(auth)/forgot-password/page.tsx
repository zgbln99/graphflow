'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { requestPasswordResetAction } from './actions'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await requestPasswordResetAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    } catch (e) {
      setError('Wystąpił błąd podczas wysyłania')
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sprawdź swoją skrzynkę</h1>
        <p className="text-gray-600 mb-6">
          Jeśli podany adres email istnieje w systemie, otrzymasz wiadomość z linkiem do resetu hasła.
        </p>
        <Link href="/login" className="btn-primary">
          Wróć do logowania
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Zapomniałeś hasła?</h1>
        <p className="text-gray-600 mt-2">
          Podaj swój adres email, a wyślemy Ci link do resetu hasła.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">
            Adres email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="twoj@email.pl"
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
              Wysyłanie...
            </>
          ) : (
            'Wyślij link do resetu'
          )}
        </button>

        <div className="text-center">
          <Link href="/login" className="text-sm link inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Wróć do logowania
          </Link>
        </div>
      </form>
    </div>
  )
}
