import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyDropboxToken, isDropboxConfigured } from '@/lib/dropbox'

// GET /api/settings/dropbox - get Dropbox status
export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  const configured = await isDropboxConfigured()

  let email: string | null = null
  if (configured) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'dropbox_access_token' },
    })
    if (setting?.value) {
      const verification = await verifyDropboxToken(setting.value)
      if (verification.valid) {
        email = verification.email || null
      }
    }
  }

  return NextResponse.json({
    configured,
    email,
  })
}

// POST /api/settings/dropbox - save Dropbox token
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: 'Brak tokenu' }, { status: 400 })
    }

    // Verify the token
    const verification = await verifyDropboxToken(accessToken)
    if (!verification.valid) {
      console.error('Dropbox verification failed:', verification.error)
      return NextResponse.json({
        error: `Nieprawidłowy token Dropbox: ${verification.error || 'nieznany błąd'}`
      }, { status: 400 })
    }

    // Save to database
    await prisma.systemSetting.upsert({
      where: { key: 'dropbox_access_token' },
      update: { value: accessToken },
      create: { key: 'dropbox_access_token', value: accessToken },
    })

    return NextResponse.json({
      success: true,
      email: verification.email,
    })
  } catch (error) {
    console.error('Error saving Dropbox token:', error)
    return NextResponse.json({ error: 'Błąd podczas zapisywania' }, { status: 500 })
  }
}

// DELETE /api/settings/dropbox - disconnect Dropbox
export async function DELETE() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  try {
    await prisma.systemSetting.delete({
      where: { key: 'dropbox_access_token' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Setting might not exist
    return NextResponse.json({ success: true })
  }
}
