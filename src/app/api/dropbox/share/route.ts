import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDropboxClient } from '@/lib/dropbox'

// POST /api/dropbox/share - get shareable link for a file
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
      return NextResponse.json({ error: 'Brak ścieżki pliku' }, { status: 400 })
    }

    // Try to create a new shared link
    let sharedLink: string
    try {
      const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
        path,
        settings: {
          requested_visibility: { '.tag': 'public' },
        },
      })
      sharedLink = linkResponse.result.url
    } catch (linkError: any) {
      // If link already exists, get existing link
      if (linkError?.error?.error?.['.tag'] === 'shared_link_already_exists') {
        const existingLinks = await dbx.sharingListSharedLinks({
          path,
          direct_only: true,
        })
        if (existingLinks.result.links.length > 0) {
          sharedLink = existingLinks.result.links[0].url
        } else {
          throw linkError
        }
      } else {
        throw linkError
      }
    }

    return NextResponse.json({
      url: sharedLink,
      directUrl: sharedLink.replace('?dl=0', '?raw=1'),
    })
  } catch (error: any) {
    console.error('Dropbox share error:', error)
    return NextResponse.json({
      error: error?.error?.error_summary || 'Błąd tworzenia linku'
    }, { status: 500 })
  }
}
