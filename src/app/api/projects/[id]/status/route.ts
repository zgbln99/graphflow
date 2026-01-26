import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyProjectStatusChanged } from '@/lib/email/notifications'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const { statusId } = await request.json()

    if (!statusId) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 })
    }

    // Get current project with status
    const currentProject = await prisma.project.findUnique({
      where: { id },
      include: { status: true },
    })

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get new status
    const newStatus = await prisma.projectStatus.findUnique({
      where: { id: statusId },
    })

    if (!newStatus) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 })
    }

    // Skip if status hasn't changed
    if (currentProject.statusId === statusId) {
      return NextResponse.json({ success: true, project: currentProject })
    }

    // Update project status and create history entry
    const project = await prisma.project.update({
      where: { id },
      data: {
        statusId,
        statusHistory: {
          create: {
            fromStatus: currentProject.status.name,
            toStatus: newStatus.name,
            changedBy: session.user.id,
          },
        },
      },
      include: { status: true },
    })

    // Send notification about status change
    try {
      await notifyProjectStatusChanged(project, currentProject.status.name)
    } catch (error) {
      console.error('Error sending status change notification:', error)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ success: true, project })
  } catch (error) {
    console.error('Error updating project status:', error)
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}
