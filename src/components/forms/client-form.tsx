'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClientAction, updateClientAction } from './client-actions'
import type { ClientAccount } from '@prisma/client'

interface ClientFormProps {
  client?: ClientAccount
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!client

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = isEditing
        ? await updateClientAction(client.id, formData)
        : await createClientAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/panel/clients/${result.clientId}`)
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

      {/* Nazwa firmy */}
      <div>
        <label htmlFor="name" className="label">
          Nazwa firmy <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={client?.name || ''}
          className="input"
          placeholder="np. Acme Corp"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="label">
          Email kontaktowy
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={client?.email || ''}
          className="input"
          placeholder="kontakt@firma.pl"
        />
      </div>

      {/* Telefon */}
      <div>
        <label htmlFor="phone" className="label">
          Telefon
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={client?.phone || ''}
          className="input"
          placeholder="+48 123 456 789"
        />
      </div>

      {/* Adres */}
      <div>
        <label htmlFor="address" className="label">
          Adres
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={client?.address || ''}
          className="input"
          placeholder="ul. Przykładowa 1, 00-000 Warszawa"
        />
      </div>

      {/* Notatki */}
      <div>
        <label htmlFor="notes" className="label">
          Notatki (wewnętrzne)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes || ''}
          className="input"
          placeholder="Dodatkowe informacje o kliencie..."
        />
      </div>

      {/* Email domains */}
      <div>
        <label htmlFor="emailDomains" className="label">
          Dozwolone domeny email
        </label>
        <input
          id="emailDomains"
          name="emailDomains"
          type="text"
          defaultValue={client?.emailDomains || ''}
          className="input"
          placeholder="firma.pl, firma.com"
        />
        <p className="text-sm text-gray-500 mt-1">
          Lista domen rozdzielona przecinkami. Maile z tych domen będą akceptowane
          jako odpowiedzi na tickety.
        </p>
      </div>

      {/* Status */}
      {isEditing && (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={client.isActive}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Klient aktywny</span>
          </label>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Link href="/panel/clients" className="btn-ghost">
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
            'Utwórz klienta'
          )}
        </button>
      </div>
    </form>
  )
}
