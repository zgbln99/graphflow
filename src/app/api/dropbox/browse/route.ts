import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDropboxClient } from '@/lib/dropbox'

// GET /api/dropbox/browse?path=/folder
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  const dbx = await getDropboxClient()
  if (!dbx) {
    return NextResponse.json({ error: 'Dropbox nie jest skonfigurowany' }, { status: 400 })
  }

  const path = request.nextUrl.searchParams.get('path') || ''

  try {
    const response = await dbx.filesListFolder({
      path: path || '',
      include_media_info: true,
    })

    const entries = response.result.entries
      .filter((entry) => entry['.tag'] !== 'deleted')
      .map((entry: any) => ({
        id: entry.id || entry.path_display,
        name: entry.name,
        path: entry.path_display,
        type: entry['.tag'], // 'file' or 'folder'
        size: entry['.tag'] === 'file' ? entry.size : null,
        modified: entry['.tag'] === 'file' ? entry.client_modified : null,
      }))

    // Sort: folders first, then files
    entries.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      path,
      entries,
      hasMore: response.result.has_more,
    })
  } catch (error: any) {
    console.error('Dropbox browse error:', error)
    return NextResponse.json({
      error: error?.error?.error_summary || 'Błąd przeglądania Dropbox'
    }, { status: 500 })
  }
}
