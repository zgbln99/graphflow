import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAuthorizationUrl, isOAuthConfigured } from '@/lib/dropbox-oauth'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

/**
 * GET /api/dropbox/connect
 *
 * Redirects user to Dropbox OAuth authorization page
 * Only accessible by ADMIN users
 */
export async function GET() {
  try {
    // Check authentication
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if OAuth is configured
    if (!isOAuthConfigured()) {
      return NextResponse.json(
        {
          error: 'Dropbox OAuth not configured',
          details: 'Please set DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REDIRECT_URI environment variables',
        },
        { status: 500 }
      )
    }

    // Generate state parameter for CSRF protection
    const state = randomBytes(16).toString('hex')

    // Store state in a secure cookie (short-lived)
    const cookieStore = await cookies()
    cookieStore.set('dropbox_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Get authorization URL and redirect
    const authUrl = getAuthorizationUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Dropbox connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Dropbox connection' },
      { status: 500 }
    )
  }
}
