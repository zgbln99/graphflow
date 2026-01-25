'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2 } from 'lucide-react'
import { ticketStatusLabels, ticketStatusColors } from '@/lib/utils'
import { updateTicketStatusAction } from '@/components/forms/ticket-actions'

interface TicketStatusSelectProps {
  ticketId: string
  currentStatus: string
}

export function TicketStatusSelect({
  ticketId,
  currentStatus,
}: TicketStatusSelectProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  async function handleStatusChange(status: string) {
    setIsOpen(false)

    startTransition(async () => {
      await updateTicketStatusAction(ticketId, status)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`btn-secondary ${ticketStatusColors[currentStatus]}`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : null}
        {ticketStatusLabels[currentStatus]}
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {Object.entries(ticketStatusLabels).map(([value, label]) => (
              <button
                key={value}
                onClick={() => handleStatusChange(value)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                  value === currentStatus ? 'bg-gray-50' : ''
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    ticketStatusColors[value]?.split(' ')[0] || 'bg-gray-300'
                  }`}
                />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
