'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export function ExportForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [type, setType] = useState('projects')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function handleExport(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const params = new URLSearchParams()
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    window.location.href = `/api/export/${type}?${params.toString()}`

    setTimeout(() => setIsLoading(false), 1000)
  }

  return (
    <form onSubmit={handleExport} className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Typ danych</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input w-full"
          >
            <option value="projects">Projekty</option>
            <option value="tickets">Tickety</option>
            <option value="timeline">Timeline</option>
            <option value="full">Pełny raport</option>
          </select>
        </div>

        <div>
          <label className="label">Data od</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label className="label">Data do</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Eksportuj CSV
        </button>
      </div>
    </form>
  )
}
