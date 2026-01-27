'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, User, Lock, Mail, Building2 } from 'lucide-react'
import { updateProfileAction, changePasswordAction } from './profile-actions'
import { AvatarUpload } from '@/components/ui/avatar-upload'

interface UserType {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'CLIENT_USER'
  isActive: boolean
  avatarUrl?: string | null
}

interface ClientAccountType {
  id: string
  name: string
}

interface ProfileFormProps {
  user: UserType & { clientAccount: ClientAccountType | null }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleAvatarUpload(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)

    const res = await fetch('/api/users/avatar', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Błąd podczas przesyłania')
    }

    router.refresh()
  }

  async function handleAvatarRemove() {
    const res = await fetch('/api/users/avatar', {
      method: 'DELETE',
    })

    if (!res.ok) {
      throw new Error('Błąd podczas usuwania avatara')
    }

    router.refresh()
  }

  async function handleProfileSubmit(formData: FormData) {
    setIsLoading(true)
    setMessage(null)

    try {
      const result = await updateProfileAction(formData)

      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Profil został zaktualizowany' })
        router.refresh()
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Wystąpił błąd' })
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordSubmit(formData: FormData) {
    setIsChangingPassword(true)
    setMessage(null)

    try {
      const result = await changePasswordAction(formData)

      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Hasło zostało zmienione' })
        // Reset formularza
        const form = document.getElementById('password-form') as HTMLFormElement
        form?.reset()
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Wystąpił błąd' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Info o koncie */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-4">
          <AvatarUpload
            currentAvatar={user.avatarUrl}
            name={user.name}
            onUpload={handleAvatarUpload}
            onRemove={handleAvatarRemove}
            size="lg"
            editable={true}
          />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{user.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.role === 'ADMIN' ? 'Administrator' : 'Klient'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Kliknij na avatar, aby zmienić
            </p>
          </div>
        </div>

        <div className="grid gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Mail className="w-4 h-4" />
            {user.email}
          </div>
          {user.clientAccount && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Building2 className="w-4 h-4" />
              {user.clientAccount.name}
            </div>
          )}
        </div>
      </div>

      {/* Edycja profilu */}
      <form action={handleProfileSubmit} className="card dark:bg-gray-800 dark:border-gray-700 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Dane profilu</h3>

        <div>
          <label htmlFor="name" className="label">
            Imię i nazwisko
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={user.name}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Adres email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={user.email}
            className="input"
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">
            Aby zmienić email, skontaktuj się z administratorem
          </p>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Zapisywanie...
            </>
          ) : (
            'Zapisz zmiany'
          )}
        </button>
      </form>

      {/* Zmiana hasła */}
      <form id="password-form" action={handlePasswordSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Zmiana hasła</h3>
        </div>

        <div>
          <label htmlFor="currentPassword" className="label">
            Aktualne hasło
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            className="input"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="label">
            Nowe hasło
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            className="input"
            placeholder="Minimum 8 znaków"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Potwierdź nowe hasło
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="input"
          />
        </div>

        <button type="submit" disabled={isChangingPassword} className="btn-primary">
          {isChangingPassword ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Zmienianie...
            </>
          ) : (
            'Zmień hasło'
          )}
        </button>
      </form>
    </div>
  )
}
