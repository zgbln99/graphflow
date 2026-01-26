import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDropboxClient } from '@/lib/dropbox'

// POST /api/dropbox/upload - upload file to Dropbox
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  const dbx = await getDropboxClient()
  if (!dbx) {
    return NextResponse.json({ error: 'Dropbox nie jest skonfigurowany' }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const path = formData.get('path') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 })
    }

    // Max 150MB (Dropbox limit for simple upload)
    const maxSize = 150 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Maksymalny rozmiar pliku to 150MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Build full path
    const fullPath = path ? `${path}/${file.name}` : `/${file.name}`

    // Upload to Dropbox
    const uploadResponse = await dbx.filesUpload({
      path: fullPath,
      contents: buffer,
      mode: { '.tag': 'add' },
      autorename: true,
    })

    return NextResponse.json({
      success: true,
      entry: {
        id: uploadResponse.result.id,
        name: uploadResponse.result.name,
        path: uploadResponse.result.path_display,
        type: 'file',
        size: uploadResponse.result.size,
        modified: uploadResponse.result.client_modified,
      },
    })
  } catch (error: any) {
    console.error('Dropbox upload error:', error)
    return NextResponse.json({
      error: error?.error?.error_summary || 'Błąd uploadu pliku'
    }, { status: 500 })
  }
}
