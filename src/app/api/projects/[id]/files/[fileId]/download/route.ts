import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getDropboxClient } from '@/lib/dropbox'
import fs from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 })
  }

  const { id: projectId, fileId } = await params

  try {
    // Find the file and project
    const file = await prisma.projectFile.findFirst({
      where: {
        id: fileId,
        projectId,
      },
      include: {
        project: {
          select: { clientAccountId: true },
        },
      },
    })

    // Check access - admin or client assigned to project
    if (file && session.user.role !== 'ADMIN' && file.project.clientAccountId !== session.user.clientAccountId) {
      return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
    }

    if (!file) {
      return NextResponse.json({ error: 'Plik nie został znaleziony' }, { status: 404 })
    }

    let fileBuffer: Buffer
    let contentType = file.mimeType

    if (file.storageType === 'dropbox' && file.dropboxPath) {
      // Download from Dropbox
      const dbx = await getDropboxClient()
      if (!dbx) {
        return NextResponse.json({ error: 'Dropbox nie jest skonfigurowany' }, { status: 500 })
      }

      try {
        const response = await dbx.filesDownload({ path: file.dropboxPath })
        // The fileBinary is in the result as a Buffer
        const result = response.result as any
        if (result.fileBinary) {
          fileBuffer = Buffer.from(result.fileBinary)
        } else {
          return NextResponse.json({ error: 'Nie udało się pobrać pliku z Dropbox' }, { status: 500 })
        }
      } catch (error) {
        console.error('Dropbox download error:', error)
        return NextResponse.json({ error: 'Błąd pobierania z Dropbox' }, { status: 500 })
      }
    } else {
      // Read from local storage
      const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
      const filePath = path.join(UPLOAD_DIR, projectId, file.storedName)

      try {
        fileBuffer = await fs.readFile(filePath)
      } catch (error) {
        console.error('Local file read error:', error)
        return NextResponse.json({ error: 'Plik nie istnieje na serwerze' }, { status: 404 })
      }
    }

    // Check if this is an image - use inline for preview, attachment for download
    const isImage = contentType.startsWith('image/')
    const disposition = isImage ? 'inline' : 'attachment'

    // Return the file with proper headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(file.filename)}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json({ error: 'Błąd pobierania pliku' }, { status: 500 })
  }
}
