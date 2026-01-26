import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUsers } from '@/lib/realtime'
import { uploadToDropbox, deleteFromDropbox, isDropboxConfigured } from '@/lib/dropbox'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// GET /api/projects/[id]/files - pobierz pliki projektu
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = params.id

  // Sprawdź dostęp do projektu
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientAccountId: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nie istnieje' }, { status: 404 })
  }

  if (session.user.role !== 'ADMIN' && project.clientAccountId !== session.user.clientAccountId) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const files = await prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: {
        select: { name: true },
      },
    },
  })

  return NextResponse.json({ files })
}

// POST /api/projects/[id]/files - upload pliku
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = params.id

  // Sprawdź dostęp do projektu
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientAccountId: true, number: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Projekt nie istnieje' }, { status: 404 })
  }

  if (session.user.role !== 'ADMIN' && project.clientAccountId !== session.user.clientAccountId) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const isPreview = formData.get('isPreview') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 })
    }

    // Sprawdź typ pliku (tylko obrazy)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Dozwolone są tylko pliki graficzne (JPEG, PNG, GIF, WebP)' },
        { status: 400 }
      )
    }

    // Max 10MB
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Maksymalny rozmiar pliku to 10MB' },
        { status: 400 }
      )
    }

    // Pobierz zawartość pliku
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generuj unikalną nazwę pliku
    const ext = path.extname(file.name)
    const storedName = `${randomUUID()}${ext}`

    // Sprawdź czy Dropbox jest skonfigurowany
    const useDropbox = await isDropboxConfigured()
    console.log('Dropbox configured:', useDropbox)

    let storageType = 'local'
    let externalUrl: string | null = null
    let dropboxPath: string | null = null

    if (useDropbox) {
      // Upload do Dropbox
      console.log('Attempting Dropbox upload for:', project.number, storedName)
      const dropboxResult = await uploadToDropbox(buffer, project.number, storedName)
      console.log('Dropbox upload result:', dropboxResult)
      if (dropboxResult) {
        storageType = 'dropbox'
        externalUrl = dropboxResult.url
        dropboxPath = dropboxResult.path
        console.log('File uploaded to Dropbox:', dropboxPath)
      } else {
        // Fallback do lokalnego storage jeśli Dropbox nie działa
        console.warn('Dropbox upload failed, falling back to local storage')
        const projectDir = path.join(UPLOAD_DIR, projectId)
        await mkdir(projectDir, { recursive: true })
        await writeFile(path.join(projectDir, storedName), buffer)
      }
    } else {
      // Zapisz lokalnie
      console.log('Dropbox not configured, saving locally')
      const projectDir = path.join(UPLOAD_DIR, projectId)
      await mkdir(projectDir, { recursive: true })
      await writeFile(path.join(projectDir, storedName), buffer)
    }

    // Jeśli to preview, usuń poprzedni preview
    if (isPreview) {
      const existingPreview = await prisma.projectFile.findFirst({
        where: { projectId, isPreview: true },
      })

      if (existingPreview) {
        // Usuń plik ze storage
        if (existingPreview.storageType === 'dropbox' && existingPreview.dropboxPath) {
          await deleteFromDropbox(existingPreview.dropboxPath)
        } else {
          try {
            await unlink(path.join(UPLOAD_DIR, projectId, existingPreview.storedName))
          } catch (e) {
            // Plik mógł już nie istnieć
          }
        }

        // Usuń z bazy
        await prisma.projectFile.delete({
          where: { id: existingPreview.id },
        })
      }
    }

    // Zapisz do bazy
    const projectFile = await prisma.projectFile.create({
      data: {
        projectId,
        filename: file.name,
        storedName,
        mimeType: file.type,
        size: file.size,
        isPreview,
        uploadedById: session.user.id,
        storageType,
        externalUrl,
        dropboxPath,
      },
      include: {
        uploadedBy: {
          select: { name: true },
        },
      },
    })

    // Wyślij powiadomienie real-time o nowym pliku
    const clientAccount = await prisma.clientAccount.findFirst({
      where: { projects: { some: { id: projectId } } },
      include: { users: { where: { isActive: true }, select: { id: true } } },
    })

    if (clientAccount && clientAccount.users.length > 0) {
      const clientUserIds = clientAccount.users.map(u => u.id)
      notifyUsers(clientUserIds, {
        type: 'FILES_UPDATED',
        projectId,
        projectNumber: project.number,
      })
    }

    return NextResponse.json({ file: projectFile })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Błąd podczas uploadu' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/files?fileId=xxx - usuń plik
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  const projectId = params.id
  const fileId = request.nextUrl.searchParams.get('fileId')

  if (!fileId) {
    return NextResponse.json({ error: 'Brak ID pliku' }, { status: 400 })
  }

  const file = await prisma.projectFile.findFirst({
    where: { id: fileId, projectId },
  })

  if (!file) {
    return NextResponse.json({ error: 'Plik nie istnieje' }, { status: 404 })
  }

  // Usuń plik ze storage
  if (file.storageType === 'dropbox' && file.dropboxPath) {
    await deleteFromDropbox(file.dropboxPath)
  } else {
    try {
      await unlink(path.join(UPLOAD_DIR, projectId, file.storedName))
    } catch (e) {
      // Plik mógł już nie istnieć
    }
  }

  // Usuń z bazy
  await prisma.projectFile.delete({
    where: { id: fileId },
  })

  // Wyślij powiadomienie real-time o usunięciu pliku
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { number: true, clientAccountId: true },
  })

  if (project) {
    const clientAccount = await prisma.clientAccount.findUnique({
      where: { id: project.clientAccountId },
      include: { users: { where: { isActive: true }, select: { id: true } } },
    })

    if (clientAccount && clientAccount.users.length > 0) {
      const clientUserIds = clientAccount.users.map(u => u.id)
      notifyUsers(clientUserIds, {
        type: 'FILES_UPDATED',
        projectId,
        projectNumber: project.number,
      })
    }
  }

  return NextResponse.json({ success: true })
}
