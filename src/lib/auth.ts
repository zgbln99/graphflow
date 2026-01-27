import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

type UserRole = 'ADMIN' | 'CLIENT_USER'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  clientAccountId: string | null
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-me')
const COOKIE_NAME = 'graphflow-session'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  clientAccountId: string | null
  avatarUrl?: string | null
}

export interface Session {
  user: SessionUser
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSession(user: User): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dni

  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientAccountId: user.clientAccountId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)

  // Zapisz sesję w bazie
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  })

  return token
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Sprawdź czy sesja istnieje w bazie
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      return null
    }

    return {
      user: {
        id: payload.userId as string,
        email: payload.email as string,
        name: session.user.name || payload.name as string,
        role: payload.role as UserRole,
        clientAccountId: payload.clientAccountId as string | null,
        avatarUrl: session.user.avatarUrl,
      },
    }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  if (!session) return null

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { clientAccount: true },
  })
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return session
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    })
  }
}

export function setSessionCookie(token: string): void {
  // Ta funkcja jest używana w Server Actions
  // Cookie jest ustawiane w response
}

export { COOKIE_NAME }
