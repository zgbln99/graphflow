import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * PATCH /api/projects/[id]/corrections/[correctionId]
 * Update a correction (toggle resolved or update content)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; correctionId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, correctionId } = await context.params
    const body = await request.json()
    const { isResolved, content } = body

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build update data
    const updateData: { isResolved?: boolean; resolvedAt?: Date | null; content?: string } = {}

    if (typeof isResolved === 'boolean') {
      updateData.isResolved = isResolved
      updateData.resolvedAt = isResolved ? new Date() : null
    }

    if (typeof content === 'string' && content.trim()) {
      updateData.content = content.trim()
    }

    // Update correction
    const correction = await (prisma as any).projectCorrection.update({
      where: { id: correctionId },
      data: updateData,
    })

    return NextResponse.json(correction)
  } catch (error) {
    console.error('Error updating correction:', error)
    return NextResponse.json(
      { error: 'Failed to update correction' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id]/corrections/[correctionId]
 * Delete a correction
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; correctionId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { correctionId } = await context.params

    await (prisma as any).projectCorrection.delete({
      where: { id: correctionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting correction:', error)
    return NextResponse.json(
      { error: 'Failed to delete correction' },
      { status: 500 }
    )
  }
}
