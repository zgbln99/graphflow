'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { createUserAction, updateUserAction } from './user-actions'

interface UserFormProps {
  clientAccountId: string
  user?: {
    id: string
    email: string
    name: string
  }
}

export function UserForm({ clientAccountId, user }: UserFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const isEdit = !!user

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setGeneratedPassword(password)
  }

  async function handleSubmit(formData: FormData) {
    setError(null)

    startTransition(async () => {
      const result = isEdit
        ? await updateUserAction(user.id, formData)
        : await createUserAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/panel/clients/${clientAccountId}/users`)
        router.refresh()
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="clientAccountId" value={clientAccountId} />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="label">
          Imię i nazwisko *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={user?.name}
          required
          className="input w-full"
          placeholder="Jan Kowalski"
        />
      </div>

      <div>
        <label htmlFor="email" className="label">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          defaultValue={user?.email}
          required
          className="input w-full"
          placeholder="jan@firma.pl"
        />
      </div>

      {!isEdit && (
        <div>
          <label htmlFor="password" className="label">
            Hasło *
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                required
                minLength={8}
                className="input w-full pr-10"
                placeholder="Minimum 8 znaków"
                value={generatedPassword || ''}
                onChange={(e) => setGeneratedPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="btn-secondary whitespace-nowrap"
            >
              Generuj
            </button>
          </div>
          {generatedPassword && (
            <p className="text-sm text-gray-500 mt-1">
              Zapisz hasło - zostanie wysłane do użytkownika
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="sendWelcomeEmail"
          name="sendWelcomeEmail"
          defaultChecked={!isEdit}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="sendWelcomeEmail" className="text-sm text-gray-700">
          Wyślij email powitalny z danymi logowania
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={isPending}
        >
          Anuluj
        </button>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Zapisuję...
            </>
          ) : isEdit ? (
            'Zapisz zmiany'
          ) : (
            'Dodaj użytkownika'
          )}
        </button>
      </div>
    </form>
  )
}
