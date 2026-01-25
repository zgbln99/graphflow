'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2 } from 'lucide-react'
import { priorityLabels, priorityColors } from '@/lib/utils'
import { updateTicketPriorityAction } from '@/components/forms/ticket-actions'

interface TicketPrioritySelectProps {
  ticketId: string
  currentPriority: string
}

export function TicketPrioritySelect({
  ticketId,
  currentPriority,
}: TicketPrioritySelectProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  async function handlePriorityChange(priority: string) {
    setIsOpen(false)

    startTransition(async () => {
      await updateTicketPriorityAction(ticketId, priority)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`btn-secondary ${priorityColors[currentPriority]}`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : null}
        {priorityLabels[currentPriority]}
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {Object.entries(priorityLabels).map(([value, label]) => (
              <button
                key={value}
                onClick={() => handlePriorityChange(value)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                  value === currentPriority ? 'bg-gray-50' : ''
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    priorityColors[value]?.split(' ')[0] || 'bg-gray-300'
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
