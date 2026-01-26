import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDropboxClient } from '@/lib/dropbox'

// POST /api/dropbox/delete - delete file or folder from Dropbox
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
    const { path } = await request.json()

    if (!path) {
      return NextResponse.json({ error: 'Brak ścieżki' }, { status: 400 })
    }

    await dbx.filesDeleteV2({ path })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Dropbox delete error:', error)
    return NextResponse.json({
      error: error?.error?.error_summary || 'Błąd usuwania'
    }, { status: 500 })
  }
}
