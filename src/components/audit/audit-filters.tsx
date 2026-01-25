'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function AuditFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const entityType = searchParams.get('type') || ''
  const action = searchParams.get('action') || ''

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/panel/audit?${params.toString()}`)
  }

  return (
    <div className="card dark:bg-gray-800 dark:border-gray-700 p-4">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="label dark:text-gray-300">Typ obiektu</label>
          <select
            value={entityType}
            className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[150px]"
            onChange={(e) => updateParam('type', e.target.value)}
          >
            <option value="">Wszystkie</option>
            <option value="project">Projekty</option>
            <option value="ticket">Tickety</option>
            <option value="client">Klienci</option>
            <option value="user">Użytkownicy</option>
            <option value="comment">Komentarze</option>
          </select>
        </div>
        <div>
          <label className="label dark:text-gray-300">Akcja</label>
          <select
            value={action}
            className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[150px]"
            onChange={(e) => updateParam('action', e.target.value)}
          >
            <option value="">Wszystkie</option>
            <option value="CREATE">Utworzenie</option>
            <option value="UPDATE">Edycja</option>
            <option value="DELETE">Usunięcie</option>
            <option value="STATUS_CHANGE">Zmiana statusu</option>
            <option value="COMMENT_ADD">Komentarz</option>
          </select>
        </div>
      </div>
    </div>
  )
}
