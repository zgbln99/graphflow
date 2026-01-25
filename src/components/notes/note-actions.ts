'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createNoteSchema } from '@/lib/validators'

export async function addNoteAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    content: formData.get('content'),
    ticketId: formData.get('ticketId') || undefined,
    projectId: formData.get('projectId') || undefined,
  }

  const validationResult = createNoteSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    const note = await prisma.note.create({
      data: {
        content: data.content,
        ticketId: data.ticketId || null,
        projectId: data.projectId || null,
      },
    })

    return { success: true, noteId: note.id }
  } catch (error) {
    console.error('Error adding note:', error)
    return { error: 'Nie udało się dodać notatki' }
  }
}

export async function deleteNoteAction(noteId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    await prisma.note.delete({
      where: { id: noteId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting note:', error)
    return { error: 'Nie udało się usunąć notatki' }
  }
}
