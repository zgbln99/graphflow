'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, UserCheck, UserX, Key, Loader2 } from 'lucide-react'
import { toggleUserActiveAction, resetUserPasswordAction } from '@/components/forms/user-actions'

interface UserActionsProps {
  userId: string
  isActive: boolean
}

export function UserActions({ userId, isActive }: UserActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  async function handleToggleActive() {
    setIsOpen(false)

    if (!confirm(isActive ? 'Czy na pewno chcesz dezaktywować użytkownika?' : 'Czy na pewno chcesz aktywować użytkownika?')) {
      return
    }

    startTransition(async () => {
      await toggleUserActiveAction(userId)
      router.refresh()
    })
  }

  async function handleResetPassword() {
    setIsOpen(false)

    if (!confirm('Czy na pewno chcesz zresetować hasło? Nowe hasło zostanie wysłane na email użytkownika.')) {
      return
    }

    startTransition(async () => {
      const result = await resetUserPasswordAction(userId)
      if (result.success) {
        alert('Hasło zostało zresetowane i wysłane na email użytkownika.')
      } else {
        alert(result.error || 'Wystąpił błąd')
      }
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        ) : (
          <MoreVertical className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={handleToggleActive}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50"
            >
              {isActive ? (
                <>
                  <UserX className="w-4 h-4 text-red-500" />
                  <span>Dezaktywuj</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-green-500" />
                  <span>Aktywuj</span>
                </>
              )}
            </button>
            <button
              onClick={handleResetPassword}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50"
            >
              <Key className="w-4 h-4 text-gray-400" />
              <span>Resetuj hasło</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
