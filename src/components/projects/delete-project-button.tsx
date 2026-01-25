'use client'

import { DeleteButton } from '@/components/ui/delete-button'
import { deleteProjectAction } from '@/components/forms/project-actions'

interface DeleteProjectButtonProps {
  projectId: string
  projectTitle: string
}

export function DeleteProjectButton({ projectId, projectTitle }: DeleteProjectButtonProps) {
  return (
    <DeleteButton
      onDelete={() => deleteProjectAction(projectId)}
      itemName={projectTitle}
      redirectTo="/panel/projects"
      className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
    />
  )
}
