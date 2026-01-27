import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { exchangeCodeForTokens, saveTokens } from '@/lib/dropbox-oauth'
import { cookies } from 'next/headers'

/**
 * GET /api/dropbox/callback
 *
 * Handles OAuth callback from Dropbox
 * Exchanges authorization code for tokens and saves them
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Base redirect URL for errors/success
  const settingsUrl = new URL('/panel/settings/dropbox', request.url)

  try {
    // Check authentication
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      settingsUrl.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(settingsUrl)
    }

    // Handle OAuth errors from Dropbox
    if (error) {
      console.error('Dropbox OAuth error:', error, errorDescription)
      settingsUrl.searchParams.set('error', error)
      if (errorDescription) {
        settingsUrl.searchParams.set('error_description', errorDescription)
      }
      return NextResponse.redirect(settingsUrl)
    }

    // Verify authorization code is present
    if (!code) {
      settingsUrl.searchParams.set('error', 'missing_code')
      return NextResponse.redirect(settingsUrl)
    }

    // Verify state parameter (CSRF protection)
    const cookieStore = await cookies()
    const storedState = cookieStore.get('dropbox_oauth_state')?.value

    if (!storedState || storedState !== state) {
      console.error('OAuth state mismatch:', { storedState, receivedState: state })
      settingsUrl.searchParams.set('error', 'invalid_state')
      return NextResponse.redirect(settingsUrl)
    }

    // Clear the state cookie
    cookieStore.delete('dropbox_oauth_state')

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Save tokens to database
    await saveTokens(tokens)

    console.log('Dropbox connected successfully for:', tokens.email)

    // Redirect to settings page with success message
    settingsUrl.searchParams.set('success', 'connected')
    return NextResponse.redirect(settingsUrl)
  } catch (error) {
    console.error('Dropbox callback error:', error)
    settingsUrl.searchParams.set('error', 'exchange_failed')
    return NextResponse.redirect(settingsUrl)
  }
}
