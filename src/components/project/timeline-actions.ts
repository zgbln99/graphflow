'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyUsers } from '@/lib/realtime'

async function notifyTimelineUpdate(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      number: true,
      clientAccount: {
        include: { users: { where: { isActive: true }, select: { id: true } } },
      },
    },
  })

  if (project && project.clientAccount.users.length > 0) {
    const clientUserIds = project.clientAccount.users.map((u: typeof project.clientAccount.users[number]) => u.id)
    notifyUsers(clientUserIds, {
      type: 'TIMELINE_UPDATED',
      projectId,
      projectNumber: project.number,
    })
  }
}

export async function addTimelineStageAction(
  projectId: string,
  data: { name: string; order: number; plannedDate?: Date; description?: string }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const stage = await prisma.timelineStage.create({
      data: {
        projectId,
        name: data.name,
        order: data.order,
        plannedDate: data.plannedDate || null,
        description: data.description || null,
      },
    })

    await notifyTimelineUpdate(projectId)

    return { success: true, stageId: stage.id }
  } catch (error) {
    console.error('Error adding timeline stage:', error)
    return { error: 'Nie udało się dodać etapu' }
  }
}

export async function updateTimelineStageAction(
  stageId: string,
  data: {
    name?: string
    order?: number
    plannedDate?: Date | null
    actualDate?: Date | null
    isCurrent?: boolean
    isCompleted?: boolean
    description?: string | null
  }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const stage = await prisma.timelineStage.update({
      where: { id: stageId },
      data,
    })

    await notifyTimelineUpdate(stage.projectId)

    return { success: true }
  } catch (error) {
    console.error('Error updating timeline stage:', error)
    return { error: 'Nie udało się zaktualizować etapu' }
  }
}

export async function deleteTimelineStageAction(stageId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    // Pobierz projectId przed usunięciem
    const stage = await prisma.timelineStage.findUnique({
      where: { id: stageId },
      select: { projectId: true },
    })

    await prisma.timelineStage.delete({
      where: { id: stageId },
    })

    if (stage) {
      await notifyTimelineUpdate(stage.projectId)
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting timeline stage:', error)
    return { error: 'Nie udało się usunąć etapu' }
  }
}

export async function applyTemplateAction(projectId: string, templateId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const template = await prisma.timelineTemplate.findUnique({
      where: { id: templateId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!template) {
      return { error: 'Szablon nie istnieje' }
    }

    // Usuń istniejące etapy
    await prisma.timelineStage.deleteMany({
      where: { projectId },
    })

    // Utwórz nowe etapy z szablonu
    await prisma.timelineStage.createMany({
      data: template.stages.map((stage: typeof template.stages[number]) => ({
        projectId,
        name: stage.name,
        order: stage.order,
      })),
    })

    await notifyTimelineUpdate(projectId)

    return { success: true }
  } catch (error) {
    console.error('Error applying template:', error)
    return { error: 'Nie udało się zastosować szablonu' }
  }
}
