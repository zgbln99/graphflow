import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyDropboxToken } from '@/lib/dropbox'
import {
  isDropboxConnected,
  isOAuthConfigured,
  revokeTokens,
  saveTokens,
  DROPBOX_KEYS,
} from '@/lib/dropbox-oauth'

/**
 * GET /api/settings/dropbox - get Dropbox connection status
 */
export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  const status = await isDropboxConnected()
  const oauthConfigured = isOAuthConfigured()

  // Get connection details if connected
  let connectedAt: string | null = null
  if (status.connected) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: DROPBOX_KEYS.CONNECTED_AT },
    })
    connectedAt = setting?.value || null
  }

  return NextResponse.json({
    connected: status.connected,
    email: status.email,
    needsReconnect: status.needsReconnect,
    oauthConfigured,
    connectedAt,
  })
}

/**
 * POST /api/settings/dropbox - save Dropbox token (legacy manual method)
 *
 * This endpoint supports both:
 * 1. Legacy manual token entry (just accessToken)
 * 2. Full OAuth token save (accessToken + refreshToken + expiresAt)
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { accessToken, refreshToken, expiresAt } = body

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

    // Save tokens
    await saveTokens({
      accessToken,
      refreshToken: refreshToken || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      email: verification.email || null,
    })

    return NextResponse.json({
      success: true,
      email: verification.email,
      hasRefreshToken: !!refreshToken,
    })
  } catch (error) {
    console.error('Error saving Dropbox token:', error)
    return NextResponse.json({ error: 'Błąd podczas zapisywania' }, { status: 500 })
  }
}

/**
 * DELETE /api/settings/dropbox - disconnect Dropbox
 */
export async function DELETE() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  try {
    // Revoke tokens and clean up
    await revokeTokens()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting Dropbox:', error)
    // Still return success even if revoke fails
    return NextResponse.json({ success: true })
  }
}
