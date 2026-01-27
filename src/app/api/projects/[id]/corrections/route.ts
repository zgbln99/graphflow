import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/projects/[id]/corrections
 * Get all corrections for a project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Verify project access
    const project = await prisma.project.findUnique({
      where: { id },
      select: { clientAccountId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check access for client users
    if (session.user.role !== 'ADMIN') {
      if (session.user.clientAccountId !== project.clientAccountId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const corrections = await (prisma as any).projectCorrection.findMany({
      where: { projectId: id },
      orderBy: [
        { isResolved: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(corrections)
  } catch (error) {
    console.error('Error fetching corrections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch corrections' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/corrections
 * Add a new correction to a project
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const correction = await (prisma as any).projectCorrection.create({
      data: {
        projectId: id,
        content: content.trim(),
        isResolved: false,
      },
    })

    return NextResponse.json(correction, { status: 201 })
  } catch (error) {
    console.error('Error creating correction:', error)
    return NextResponse.json(
      { error: 'Failed to create correction' },
      { status: 500 }
    )
  }
}
