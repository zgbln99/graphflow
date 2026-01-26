'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const tagSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(50, 'Nazwa może mieć maksymalnie 50 znaków'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Nieprawidłowy format koloru'),
})

export async function createTagAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    name: formData.get('name'),
    color: formData.get('color') || '#6366f1',
  }

  const validationResult = tagSchema.safeParse(rawData)
  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    // Check if tag with this name already exists
    const existing = await prisma.projectTag.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return { error: 'Tag o tej nazwie już istnieje' }
    }

    const tag = await prisma.projectTag.create({
      data: {
        name: data.name,
        color: data.color,
      },
    })

    revalidatePath('/panel/settings/tags')
    return { success: true, tagId: tag.id }
  } catch (error) {
    console.error('Error creating tag:', error)
    return { error: 'Nie udało się utworzyć tagu' }
  }
}

export async function updateTagAction(tagId: string, formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    name: formData.get('name'),
    color: formData.get('color') || '#6366f1',
  }

  const validationResult = tagSchema.safeParse(rawData)
  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    // Check if another tag with this name exists
    const existing = await prisma.projectTag.findFirst({
      where: {
        name: data.name,
        id: { not: tagId },
      },
    })

    if (existing) {
      return { error: 'Tag o tej nazwie już istnieje' }
    }

    await prisma.projectTag.update({
      where: { id: tagId },
      data: {
        name: data.name,
        color: data.color,
      },
    })

    revalidatePath('/panel/settings/tags')
    revalidatePath(`/panel/settings/tags/${tagId}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating tag:', error)
    return { error: 'Nie udało się zaktualizować tagu' }
  }
}

export async function deleteTagAction(tagId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    // Check if tag is used by any projects
    const tag = await prisma.projectTag.findUnique({
      where: { id: tagId },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    if (!tag) {
      return { error: 'Tag nie istnieje' }
    }

    if (tag._count.projects > 0) {
      return { error: `Tag jest używany przez ${tag._count.projects} projektów. Usuń tag z projektów przed usunięciem.` }
    }

    await prisma.projectTag.delete({
      where: { id: tagId },
    })

    revalidatePath('/panel/settings/tags')
    return { success: true }
  } catch (error) {
    console.error('Error deleting tag:', error)
    return { error: 'Nie udało się usunąć tagu' }
  }
}
