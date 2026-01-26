import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDropboxClient } from '@/lib/dropbox'

// POST /api/dropbox/folder - create folder in Dropbox
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
    const { path, name } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Brak nazwy folderu' }, { status: 400 })
    }

    const fullPath = path ? `${path}/${name}` : `/${name}`

    const response = await dbx.filesCreateFolderV2({
      path: fullPath,
      autorename: false,
    })

    return NextResponse.json({
      success: true,
      entry: {
        id: response.result.metadata.id,
        name: response.result.metadata.name,
        path: response.result.metadata.path_display,
        type: 'folder',
        size: null,
        modified: null,
      },
    })
  } catch (error: any) {
    console.error('Dropbox create folder error:', error)

    // Check if folder already exists
    if (error?.error?.error?.['.tag'] === 'path' &&
        error?.error?.error?.path?.['.tag'] === 'conflict') {
      return NextResponse.json({
        error: 'Folder o tej nazwie już istnieje'
      }, { status: 400 })
    }

    return NextResponse.json({
      error: error?.error?.error_summary || 'Błąd tworzenia folderu'
    }, { status: 500 })
  }
}
