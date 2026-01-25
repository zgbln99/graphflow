'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Link2, Lock, DollarSign, Calendar, FileText, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { createClientProjectAction } from './project-actions'

export function ClientProjectForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createClientProjectAction(formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/panel/projects/${result.projectId}`)
        router.refresh()
      }
    } catch (e) {
      setError('Wystąpił błąd podczas zapisywania')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="card dark:bg-gray-800 dark:border-gray-700 p-6 space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Jak to działa?</p>
            <p>Po wysłaniu zgłoszenia, Twój projekt trafi do weryfikacji.
            Po akceptacji otrzymasz powiadomienie email, a status projektu zmieni się na &quot;W trakcie&quot;.</p>
          </div>
        </div>
      </div>

      {/* Tytuł */}
      <div>
        <label htmlFor="title" className="label dark:text-gray-300">
          <FileText className="w-4 h-4 inline mr-1" />
          Nazwa projektu <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="np. Logo dla nowej firmy, Plakat A2 na wydarzenie..."
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Krótka, opisowa nazwa projektu
        </p>
      </div>

      {/* Opis */}
      <div>
        <label htmlFor="description" className="label dark:text-gray-300">
          Szczegółowy opis <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          required
          className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Opisz dokładnie czego potrzebujesz:
- Jaki to rodzaj projektu (logo, ulotka, strona www, itp.)
- Jaki jest cel projektu
- Dla kogo jest przeznaczony
- Jakie są główne wymagania i oczekiwania
- Czy masz jakieś konkretne wytyczne kolorystyczne lub stylistyczne"
        />
      </div>

      {/* Linki do przykładów */}
      <div>
        <label htmlFor="exampleLinks" className="label dark:text-gray-300">
          <Link2 className="w-4 h-4 inline mr-1" />
          Linki do przykładów / inspiracji
        </label>
        <textarea
          id="exampleLinks"
          name="exampleLinks"
          rows={3}
          className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Wklej linki do projektów, które Ci się podobają:
https://dribbble.com/...
https://behance.net/..."
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pokaż mi przykłady projektów, które Ci się podobają - to pomoże mi lepiej zrozumieć Twoje oczekiwania
        </p>
      </div>

      {/* Hasła i dostępy */}
      <div>
        <label htmlFor="credentials" className="label dark:text-gray-300">
          <Lock className="w-4 h-4 inline mr-1" />
          Hasła i dostępy
        </label>
        <textarea
          id="credentials"
          name="credentials"
          rows={3}
          className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
          placeholder="Jeśli potrzebuję dostępu do jakichś materiałów, wpisz tutaj:
Dropbox: login / hasło
FTP: host / login / hasło"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Te dane są widoczne tylko dla mnie. Wpisz hasła do materiałów, plików lub kont, do których potrzebuję dostępu.
        </p>
      </div>

      {/* Budżet */}
      <div>
        <label htmlFor="budget" className="label dark:text-gray-300">
          <DollarSign className="w-4 h-4 inline mr-1" />
          Budżet / Zakres cenowy
        </label>
        <input
          id="budget"
          name="budget"
          type="text"
          className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="np. do 500 zł, 1000-2000 zł, do ustalenia"
        />
      </div>

      {/* Preferowany termin */}
      <div>
        <label htmlFor="preferredDeadline" className="label dark:text-gray-300">
          <Calendar className="w-4 h-4 inline mr-1" />
          Preferowany termin realizacji
        </label>
        <input
          id="preferredDeadline"
          name="preferredDeadline"
          type="date"
          className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          min={new Date().toISOString().split('T')[0]}
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kiedy potrzebujesz gotowego projektu? Ostateczny termin zostanie ustalony po akceptacji.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link href="/panel/projects" className="btn-ghost dark:text-gray-300 dark:hover:bg-gray-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anuluj
        </Link>
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Wysyłanie...
            </>
          ) : (
            'Wyślij zgłoszenie'
          )}
        </button>
      </div>
    </form>
  )
}
