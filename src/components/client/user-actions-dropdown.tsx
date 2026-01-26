'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreVertical, UserCheck, UserX, Key, Loader2, Edit, Trash2 } from 'lucide-react'
import { toggleUserActiveAction, resetUserPasswordAction, deleteUserAction } from '@/components/forms/user-actions'

interface UserActionsProps {
  userId: string
  clientId: string
  isActive: boolean
}

export function UserActions({ userId, clientId, isActive }: UserActionsProps) {
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

  async function handleDelete() {
    setIsOpen(false)

    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika? Ta operacja jest nieodwracalna.')) {
      return
    }

    startTransition(async () => {
      const result = await deleteUserAction(userId)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || 'Wystąpił błąd')
      }
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
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <Link
              href={`/panel/clients/${clientId}/users/${userId}/edit`}
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Edit className="w-4 h-4 text-gray-400" />
              <span>Edytuj</span>
            </Link>
            <button
              onClick={handleToggleActive}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
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
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Key className="w-4 h-4 text-gray-400" />
              <span>Resetuj haslo</span>
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
              <span>Usun</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
