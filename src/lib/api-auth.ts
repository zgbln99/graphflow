import { prisma } from './db'
import { headers } from 'next/headers'
import { createHmac } from 'crypto'

export interface ApiAuthResult {
  authenticated: boolean
  apiKeyId?: string
  permissions?: string[]
  error?: string
}

export async function authenticateApiRequest(): Promise<ApiAuthResult> {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid Authorization header' }
  }

  const token = authHeader.substring(7)
  const [keyId, secret] = token.split('.')

  if (!keyId || !secret) {
    return { authenticated: false, error: 'Invalid API key format' }
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: keyId },
    })

    if (!apiKey) {
      return { authenticated: false, error: 'API key not found' }
    }

    if (!apiKey.isActive) {
      return { authenticated: false, error: 'API key is inactive' }
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { authenticated: false, error: 'API key has expired' }
    }

    // Verify secret (simple comparison for now, should use bcrypt in production)
    const hashedSecret = createHmac('sha256', process.env.API_SECRET || 'default-secret')
      .update(secret)
      .digest('hex')

    if (hashedSecret !== apiKey.secret) {
      return { authenticated: false, error: 'Invalid API secret' }
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })

    return {
      authenticated: true,
      apiKeyId: apiKey.id,
      permissions: apiKey.permissions,
    }
  } catch (error) {
    console.error('API auth error:', error)
    return { authenticated: false, error: 'Authentication failed' }
  }
}

export function hasPermission(permissions: string[] | undefined, required: string): boolean {
  if (!permissions) return false

  // Check for exact match or wildcard
  const [resource, action] = required.split(':')

  return permissions.some((p) => {
    if (p === '*') return true
    if (p === required) return true
    if (p === `${resource}:*`) return true
    return false
  })
}

export function apiResponse(data: unknown, status: number = 200) {
  return Response.json(data, { status })
}

export function apiError(error: string, status: number = 400) {
  return Response.json({ error }, { status })
}
