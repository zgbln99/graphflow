import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// GET /api/uploads/[projectId]/[filename] - pobierz plik
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (params.path.length !== 2) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const [projectId, filename] = params.path

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

  // Sprawdź czy plik istnieje w bazie
  const file = await prisma.projectFile.findFirst({
    where: { projectId, storedName: filename },
  })

  if (!file) {
    return NextResponse.json({ error: 'Plik nie istnieje' }, { status: 404 })
  }

  try {
    const filePath = path.join(UPLOAD_DIR, projectId, filename)
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error reading file:', error)
    return NextResponse.json({ error: 'Nie można odczytać pliku' }, { status: 500 })
  }
}
