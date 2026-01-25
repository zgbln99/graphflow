'use client'

import { DeleteButton } from '@/components/ui/delete-button'
import { deleteTicketAction } from '@/components/forms/ticket-actions'

interface DeleteTicketButtonProps {
  ticketId: string
  ticketTitle: string
}

export function DeleteTicketButton({ ticketId, ticketTitle }: DeleteTicketButtonProps) {
  return (
    <DeleteButton
      onDelete={() => deleteTicketAction(ticketId)}
      itemName={ticketTitle}
      redirectTo="/panel/tickets"
      className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
    />
  )
}
