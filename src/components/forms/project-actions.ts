'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createProjectSchema, updateProjectSchema } from '@/lib/validators'
import { generateNumber, slugify } from '@/lib/utils'
import { notifyProjectStatusChanged } from '@/lib/email/notifications'

export async function createProjectAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || '',
    clientAccountId: formData.get('clientAccountId'),
    statusId: formData.get('statusId'),
    deadline: formData.get('deadline') || undefined,
    localPath: formData.get('localPath') || '',
    dropboxPath: formData.get('dropboxPath') || '',
    dropboxLink: formData.get('dropboxLink') || '',
    tagIds: formData.getAll('tagIds') as string[],
  }

  const validationResult = createProjectSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    // Generuj numer projektu
    const projectNumber = await generateNumber('PRJ', prisma)

    // Pobierz nazwę statusu dla historii
    const status = await prisma.projectStatus.findUnique({
      where: { id: data.statusId },
    })

    // Utwórz projekt
    const project = await prisma.project.create({
      data: {
        number: projectNumber,
        title: data.title,
        description: data.description || null,
        clientAccountId: data.clientAccountId,
        statusId: data.statusId!,
        deadline: data.deadline || null,
        localPath: data.localPath || null,
        dropboxPath: data.dropboxPath || null,
        dropboxLink: data.dropboxLink || null,
        tags: data.tagIds?.length
          ? { connect: data.tagIds.map((id) => ({ id })) }
          : undefined,
        statusHistory: {
          create: {
            toStatus: status?.name || 'Nowy',
            changedBy: session.user.id,
          },
        },
      },
    })

    // Dodaj etapy z szablonu jeśli wybrano
    const templateId = formData.get('templateId') as string
    if (templateId) {
      const template = await prisma.timelineTemplate.findUnique({
        where: { id: templateId },
        include: { stages: { orderBy: { order: 'asc' } } },
      })

      if (template) {
        await prisma.timelineStage.createMany({
          data: template.stages.map((stage, index) => ({
            projectId: project.id,
            name: stage.name,
            order: index,
            isCurrent: index === 0,
          })),
        })
      }
    }

    return { success: true, projectId: project.id }
  } catch (error) {
    console.error('Error creating project:', error)
    return { error: 'Nie udało się utworzyć projektu' }
  }
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || '',
    statusId: formData.get('statusId'),
    deadline: formData.get('deadline') || undefined,
    localPath: formData.get('localPath') || '',
    dropboxPath: formData.get('dropboxPath') || '',
    dropboxLink: formData.get('dropboxLink') || '',
    tagIds: formData.getAll('tagIds') as string[],
  }

  const validationResult = updateProjectSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    // Pobierz aktualny projekt
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { status: true },
    })

    if (!currentProject) {
      return { error: 'Projekt nie istnieje' }
    }

    // Sprawdź czy zmienił się status
    const statusChanged = data.statusId && data.statusId !== currentProject.statusId
    let newStatus = null

    if (statusChanged) {
      newStatus = await prisma.projectStatus.findUnique({
        where: { id: data.statusId },
      })
    }

    // Aktualizuj projekt
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        title: data.title,
        description: data.description || null,
        statusId: data.statusId,
        deadline: data.deadline || null,
        localPath: data.localPath || null,
        dropboxPath: data.dropboxPath || null,
        dropboxLink: data.dropboxLink || null,
        tags: {
          set: data.tagIds?.map((id) => ({ id })) || [],
        },
        ...(statusChanged && newStatus
          ? {
              statusHistory: {
                create: {
                  fromStatus: currentProject.status.name,
                  toStatus: newStatus.name,
                  changedBy: session.user.id,
                },
              },
            }
          : {}),
      },
      include: { status: true },
    })

    // Wyślij powiadomienie o zmianie statusu
    if (statusChanged && newStatus) {
      await notifyProjectStatusChanged(project, currentProject.status.name)
    }

    return { success: true, projectId: project.id }
  } catch (error) {
    console.error('Error updating project:', error)
    return { error: 'Nie udało się zaktualizować projektu' }
  }
}

export async function updateProjectStatusAction(projectId: string, statusId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { status: true },
    })

    if (!currentProject) {
      return { error: 'Projekt nie istnieje' }
    }

    const newStatus = await prisma.projectStatus.findUnique({
      where: { id: statusId },
    })

    if (!newStatus) {
      return { error: 'Status nie istnieje' }
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        statusId,
        statusHistory: {
          create: {
            fromStatus: currentProject.status.name,
            toStatus: newStatus.name,
            changedBy: session.user.id,
          },
        },
      },
      include: { status: true },
    })

    await notifyProjectStatusChanged(project, currentProject.status.name)

    return { success: true }
  } catch (error) {
    console.error('Error updating project status:', error)
    return { error: 'Nie udało się zmienić statusu' }
  }
}
