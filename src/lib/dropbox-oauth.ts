/**
 * Dropbox OAuth2 Integration
 *
 * Uses Authorization Code Flow with token_access_type=offline
 * to get refresh tokens that don't expire.
 */

import { prisma } from './db'

// Environment variables
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY || ''
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET || ''
const DROPBOX_REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI || ''

// SystemSetting keys for Dropbox OAuth
export const DROPBOX_KEYS = {
  ACCESS_TOKEN: 'dropbox_access_token',
  REFRESH_TOKEN: 'dropbox_refresh_token',
  EXPIRES_AT: 'dropbox_token_expires_at',
  CONNECTED_EMAIL: 'dropbox_connected_email',
  CONNECTED_AT: 'dropbox_connected_at',
} as const

// Token refresh buffer (refresh 5 minutes before expiry)
const REFRESH_BUFFER_MS = 5 * 60 * 1000

interface DropboxTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  uid: string
  account_id: string
}

interface DropboxTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  email: string | null
}

/**
 * Check if Dropbox OAuth is properly configured
 */
export function isOAuthConfigured(): boolean {
  return !!(DROPBOX_APP_KEY && DROPBOX_APP_SECRET && DROPBOX_REDIRECT_URI)
}

/**
 * Generate Dropbox OAuth authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  if (!isOAuthConfigured()) {
    throw new Error('Dropbox OAuth not configured. Set DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REDIRECT_URI')
  }

  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    redirect_uri: DROPBOX_REDIRECT_URI,
    response_type: 'code',
    token_access_type: 'offline', // This gives us refresh_token
  })

  if (state) {
    params.set('state', state)
  }

  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<DropboxTokens> {
  if (!isOAuthConfigured()) {
    throw new Error('Dropbox OAuth not configured')
  }

  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
      redirect_uri: DROPBOX_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Dropbox token exchange error:', error)
    throw new Error(`Failed to exchange code: ${response.status}`)
  }

  const data: DropboxTokenResponse = await response.json()

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  // Get user email
  const email = await getUserEmail(data.access_token)

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt,
    email,
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: Date
}> {
  if (!isOAuthConfigured()) {
    throw new Error('Dropbox OAuth not configured')
  }

  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Dropbox token refresh error:', error)

    // If refresh token is invalid/revoked, throw specific error
    if (response.status === 400 || response.status === 401) {
      throw new Error('REFRESH_TOKEN_INVALID')
    }

    throw new Error(`Failed to refresh token: ${response.status}`)
  }

  const data: DropboxTokenResponse = await response.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  return {
    accessToken: data.access_token,
    expiresAt,
  }
}

/**
 * Get user email from Dropbox API
 */
async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.email || null
  } catch {
    return null
  }
}

/**
 * Save tokens to database
 */
export async function saveTokens(tokens: DropboxTokens): Promise<void> {
  const updates = [
    { key: DROPBOX_KEYS.ACCESS_TOKEN, value: tokens.accessToken },
    { key: DROPBOX_KEYS.REFRESH_TOKEN, value: tokens.refreshToken || '' },
    { key: DROPBOX_KEYS.EXPIRES_AT, value: tokens.expiresAt?.toISOString() || '' },
    { key: DROPBOX_KEYS.CONNECTED_EMAIL, value: tokens.email || '' },
    { key: DROPBOX_KEYS.CONNECTED_AT, value: new Date().toISOString() },
  ]

  for (const { key, value } of updates) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }
}

/**
 * Get stored tokens from database
 */
export async function getStoredTokens(): Promise<DropboxTokens | null> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: Object.values(DROPBOX_KEYS),
      },
    },
  })

  const getValue = (key: string) => settings.find((s: { key: string; value: string | null }) => s.key === key)?.value || null

  const accessToken = getValue(DROPBOX_KEYS.ACCESS_TOKEN)
  if (!accessToken) {
    return null
  }

  const expiresAtStr = getValue(DROPBOX_KEYS.EXPIRES_AT)

  return {
    accessToken,
    refreshToken: getValue(DROPBOX_KEYS.REFRESH_TOKEN),
    expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
    email: getValue(DROPBOX_KEYS.CONNECTED_EMAIL),
  }
}

/**
 * Get a valid access token, refreshing if necessary
 * This is the main function to use when making Dropbox API calls
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens()

  if (!tokens) {
    return null
  }

  // Check if token is expired or about to expire
  const now = new Date()
  const isExpired = tokens.expiresAt && (tokens.expiresAt.getTime() - REFRESH_BUFFER_MS) < now.getTime()

  if (!isExpired) {
    return tokens.accessToken
  }

  // Token expired - try to refresh
  if (!tokens.refreshToken) {
    console.warn('Dropbox access token expired and no refresh token available')
    return null
  }

  try {
    console.log('Refreshing Dropbox access token...')
    const refreshed = await refreshAccessToken(tokens.refreshToken)

    // Update stored tokens
    await prisma.systemSetting.upsert({
      where: { key: DROPBOX_KEYS.ACCESS_TOKEN },
      update: { value: refreshed.accessToken },
      create: { key: DROPBOX_KEYS.ACCESS_TOKEN, value: refreshed.accessToken },
    })

    await prisma.systemSetting.upsert({
      where: { key: DROPBOX_KEYS.EXPIRES_AT },
      update: { value: refreshed.expiresAt.toISOString() },
      create: { key: DROPBOX_KEYS.EXPIRES_AT, value: refreshed.expiresAt.toISOString() },
    })

    console.log('Dropbox token refreshed successfully')
    return refreshed.accessToken
  } catch (error: any) {
    console.error('Failed to refresh Dropbox token:', error)

    // If refresh token is invalid, mark integration as disconnected
    if (error.message === 'REFRESH_TOKEN_INVALID') {
      await markAsDisconnected()
    }

    return null
  }
}

/**
 * Mark Dropbox integration as disconnected (when refresh token is invalid)
 */
export async function markAsDisconnected(): Promise<void> {
  console.warn('Marking Dropbox integration as disconnected')

  // Clear access token but keep refresh token and email for reference
  await prisma.systemSetting.updateMany({
    where: { key: DROPBOX_KEYS.ACCESS_TOKEN },
    data: { value: '' },
  })
}

/**
 * Disconnect Dropbox integration completely
 */
export async function disconnectDropbox(): Promise<void> {
  await prisma.systemSetting.deleteMany({
    where: {
      key: {
        in: Object.values(DROPBOX_KEYS),
      },
    },
  })
}

/**
 * Check if Dropbox is connected and valid
 */
export async function isDropboxConnected(): Promise<{
  connected: boolean
  email: string | null
  needsReconnect: boolean
}> {
  const tokens = await getStoredTokens()

  if (!tokens || !tokens.accessToken) {
    return { connected: false, email: null, needsReconnect: false }
  }

  // If we have refresh token, we're properly connected
  if (tokens.refreshToken) {
    return { connected: true, email: tokens.email, needsReconnect: false }
  }

  // Legacy: only access token, no refresh token - needs reconnect
  return { connected: true, email: tokens.email, needsReconnect: true }
}

/**
 * Revoke Dropbox tokens (call Dropbox API to revoke)
 */
export async function revokeTokens(): Promise<void> {
  const tokens = await getStoredTokens()

  if (tokens?.accessToken) {
    try {
      await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      })
    } catch (error) {
      console.error('Failed to revoke Dropbox token:', error)
    }
  }

  await disconnectDropbox()
}
