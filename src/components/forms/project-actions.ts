'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { createProjectSchema, updateProjectSchema, clientProjectSchema } from '@/lib/validators'
import { generateNumber, slugify } from '@/lib/utils'
import { notifyProjectStatusChanged, notifyNewProjectRequest } from '@/lib/email/notifications'
import { notifyUsers } from '@/lib/realtime'

// Tworzenie projektu przez admina
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
        createdById: session.user.id,
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

// Tworzenie projektu przez klienta (zgłoszenie do akceptacji)
export async function createClientProjectAction(formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Musisz być zalogowany' }
  }

  // Klient musi mieć przypisane clientAccountId
  if (!session.user.clientAccountId) {
    return { error: 'Brak przypisanego konta klienta' }
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || '',
    exampleLinks: formData.get('exampleLinks') || '',
    credentials: formData.get('credentials') || '',
    budget: formData.get('budget') || '',
    preferredDeadline: formData.get('preferredDeadline') || undefined,
  }

  const validationResult = clientProjectSchema.safeParse(rawData)

  if (!validationResult.success) {
    return { error: validationResult.error.errors[0].message }
  }

  const data = validationResult.data

  try {
    // Generuj numer projektu
    const projectNumber = await generateNumber('PRJ', prisma)

    // Znajdź status "Oczekuje na akceptację" lub utwórz
    let pendingStatus = await prisma.projectStatus.findFirst({
      where: { slug: 'oczekuje-na-akceptacje' },
    })

    if (!pendingStatus) {
      // Znajdź najwyższy order
      const maxOrder = await prisma.projectStatus.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      pendingStatus = await prisma.projectStatus.create({
        data: {
          name: 'Oczekuje na akceptację',
          slug: 'oczekuje-na-akceptacje',
          color: '#f59e0b', // amber
          order: (maxOrder?.order || 0) + 1,
          isActive: true,
        },
      })
    }

    // Utwórz projekt
    const project = await prisma.project.create({
      data: {
        number: projectNumber,
        title: data.title,
        description: data.description || null,
        clientAccountId: session.user.clientAccountId,
        statusId: pendingStatus.id,
        exampleLinks: data.exampleLinks || null,
        credentials: data.credentials || null,
        budget: data.budget || null,
        preferredDeadline: data.preferredDeadline || null,
        createdById: session.user.id,
        statusHistory: {
          create: {
            toStatus: pendingStatus.name,
            changedBy: session.user.id,
          },
        },
      },
      include: {
        clientAccount: true,
        createdBy: true,
      },
    })

    // Wyślij powiadomienie do adminów o nowym projekcie
    await notifyNewProjectRequest(project)

    // Utwórz powiadomienie dla wszystkich adminów
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    })

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          type: 'PROJECT_CREATED',
          title: 'Nowy projekt do akceptacji',
          message: `${project.clientAccount.name} zgłosił nowy projekt: ${project.title}`,
          link: `/panel/projects/${project.id}`,
          userId: admin.id,
          projectId: project.id,
        })),
      })

      // Send real-time notification to admins
      notifyUsers(
        admins.map(a => a.id),
        {
          type: 'PROJECT_CREATED',
          title: 'Nowy projekt do akceptacji',
          message: `${project.clientAccount.name} zgłosił nowy projekt: ${project.title}`,
        }
      )
    }

    return { success: true, projectId: project.id }
  } catch (error) {
    console.error('Error creating client project:', error)
    return { error: 'Nie udało się utworzyć projektu' }
  }
}

// Akceptacja projektu przez admina
export async function acceptProjectAction(projectId: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return { error: 'Brak uprawnień' }
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        status: true,
        clientAccount: { include: { users: { where: { isActive: true } } } },
        createdBy: true,
      },
    })

    if (!project) {
      return { error: 'Projekt nie istnieje' }
    }

    // Znajdź lub utwórz status "W trakcie"
    let inProgressStatus = await prisma.projectStatus.findFirst({
      where: { slug: 'w-trakcie' },
    })

    if (!inProgressStatus) {
      const maxOrder = await prisma.projectStatus.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      inProgressStatus = await prisma.projectStatus.create({
        data: {
          name: 'W trakcie',
          slug: 'w-trakcie',
          color: '#3b82f6', // blue
          order: (maxOrder?.order || 0) + 1,
          isActive: true,
        },
      })
    }

    // Zaktualizuj status projektu
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        statusId: inProgressStatus.id,
        statusHistory: {
          create: {
            fromStatus: project.status.name,
            toStatus: inProgressStatus.name,
            changedBy: session.user.id,
          },
        },
      },
      include: { status: true, clientAccount: true },
    })

    // Wyślij powiadomienie email do klienta
    await notifyProjectStatusChanged(updatedProject, project.status.name)

    // Utwórz powiadomienie w aplikacji dla klienta
    if (project.createdById) {
      await prisma.notification.create({
        data: {
          type: 'PROJECT_ACCEPTED',
          title: 'Projekt zaakceptowany',
          message: `Twój projekt "${project.title}" został zaakceptowany i jest teraz w realizacji.`,
          link: `/panel/projects/${project.id}`,
          userId: project.createdById,
          projectId: project.id,
        },
      })

      // Send real-time notification to client
      notifyUsers([project.createdById], {
        type: 'PROJECT_ACCEPTED',
        title: 'Projekt zaakceptowany',
        message: `Twój projekt "${project.title}" został zaakceptowany`,
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error accepting project:', error)
    return { error: 'Nie udało się zaakceptować projektu' }
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
