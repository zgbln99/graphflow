import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'

// GET /api/sessions - list user's active sessions
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const currentToken = cookieStore.get('session')?.value

  const sessions = await prisma.session.findMany({
    where: {
      userId: session.user.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Mark current session
  const sessionsWithCurrent = sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: s.token === currentToken,
  }))

  return NextResponse.json({ sessions: sessionsWithCurrent })
}

// DELETE /api/sessions?id=xxx - terminate a session
export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionId = request.nextUrl.searchParams.get('id')
  const all = request.nextUrl.searchParams.get('all') === 'true'

  const cookieStore = await cookies()
  const currentToken = cookieStore.get('session')?.value

  if (all) {
    // Terminate all sessions except current
    await prisma.session.deleteMany({
      where: {
        userId: session.user.id,
        token: { not: currentToken || '' },
      },
    })
    return NextResponse.json({ success: true })
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })
  }

  // Find the session to delete
  const sessionToDelete = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
    },
  })

  if (!sessionToDelete) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Don't allow deleting current session through this endpoint
  if (sessionToDelete.token === currentToken) {
    return NextResponse.json(
      { error: 'Cannot terminate current session. Use logout instead.' },
      { status: 400 }
    )
  }

  await prisma.session.delete({
    where: { id: sessionId },
  })

  return NextResponse.json({ success: true })
}
