'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link as LinkIcon, Loader2 } from 'lucide-react'
import { matchEmailToTicketAction } from './inbox-actions'

interface MatchEmailFormProps {
  emailId: string
  tickets: { id: string; number: string; title: string }[]
}

export function MatchEmailForm({ emailId, tickets }: MatchEmailFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedTicket, setSelectedTicket] = useState('')

  async function handleMatch() {
    if (!selectedTicket) return

    startTransition(async () => {
      await matchEmailToTicketAction(emailId, selectedTicket)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedTicket}
        onChange={(e) => setSelectedTicket(e.target.value)}
        className="input py-1 text-sm w-48"
        disabled={isPending}
      >
        <option value="">Przypisz do ticketa...</option>
        {tickets.map((ticket) => (
          <option key={ticket.id} value={ticket.id}>
            {ticket.number} - {ticket.title.slice(0, 30)}
          </option>
        ))}
      </select>
      <button
        onClick={handleMatch}
        disabled={!selectedTicket || isPending}
        className="btn-primary btn-sm"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <LinkIcon className="w-4 h-4 mr-1" />
            Przypisz
          </>
        )}
      </button>
    </div>
  )
}
