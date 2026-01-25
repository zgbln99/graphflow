'use client'

import { DeleteButton } from '@/components/ui/delete-button'
import { deleteClientAction } from '@/components/forms/client-actions'

interface DeleteClientButtonProps {
  clientId: string
  clientName: string
}

export function DeleteClientButton({ clientId, clientName }: DeleteClientButtonProps) {
  return (
    <DeleteButton
      onDelete={() => deleteClientAction(clientId)}
      itemName={clientName}
      redirectTo="/panel/clients"
      className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
    />
  )
}
