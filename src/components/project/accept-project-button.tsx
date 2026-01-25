'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { acceptProjectAction } from '@/components/forms/project-actions'

interface AcceptProjectButtonProps {
  projectId: string
}

export function AcceptProjectButton({ projectId }: AcceptProjectButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    if (!confirm('Czy na pewno chcesz zaakceptować ten projekt? Klient otrzyma powiadomienie email.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await acceptProjectAction(projectId)

      if (result.error) {
        setError(result.error)
        alert(result.error)
      } else {
        router.refresh()
      }
    } catch (e) {
      setError('Wystąpił błąd')
      alert('Wystąpił błąd podczas akceptacji projektu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleAccept}
      disabled={isLoading}
      className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Akceptowanie...
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4 mr-2" />
          Akceptuj projekt
        </>
      )}
    </button>
  )
}
