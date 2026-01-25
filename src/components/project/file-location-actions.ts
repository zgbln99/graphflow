'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createFileLocationSchema } from '@/lib/validators'

export async function addFileLocationAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    projectId: formData.get('projectId'),
    type: formData.get('type'),
    path: formData.get('path'),
    label: formData.get('label') || undefined,
  }

  const validationResult = createFileLocationSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    await prisma.fileLocation.create({
      data: {
        projectId: data.projectId,
        type: data.type,
        path: data.path,
        label: data.label,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error adding file location:', error)
    return { error: 'Nie udało się dodać lokalizacji' }
  }
}

export async function deleteFileLocationAction(locationId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    await prisma.fileLocation.delete({
      where: { id: locationId },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting file location:', error)
    return { error: 'Nie udało się usunąć lokalizacji' }
  }
}
