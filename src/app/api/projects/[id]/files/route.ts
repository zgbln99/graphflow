import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

    // Utwórz folder dla projektu jeśli nie istnieje
    const projectDir = path.join(UPLOAD_DIR, projectId)
    await mkdir(projectDir, { recursive: true })

    // Generuj unikalną nazwę pliku
    const ext = path.extname(file.name)
    const storedName = `${randomUUID()}${ext}`
    const filePath = path.join(projectDir, storedName)

    // Zapisz plik
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Jeśli to preview, usuń poprzedni preview
    if (isPreview) {
      const existingPreview = await prisma.projectFile.findFirst({
        where: { projectId, isPreview: true },
      })

      if (existingPreview) {
        // Usuń plik z dysku
        try {
          await unlink(path.join(UPLOAD_DIR, projectId, existingPreview.storedName))
        } catch (e) {
          // Plik mógł już nie istnieć
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
      },
      include: {
        uploadedBy: {
          select: { name: true },
        },
      },
    })

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

  // Usuń plik z dysku
  try {
    await unlink(path.join(UPLOAD_DIR, projectId, file.storedName))
  } catch (e) {
    // Plik mógł już nie istnieć
  }

  // Usuń z bazy
  await prisma.projectFile.delete({
    where: { id: fileId },
  })

  return NextResponse.json({ success: true })
}
