import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const status = await prisma.projectStatus.findUnique({
      where: { id },
    })

    if (!status) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 })
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    )
  }
}

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
    const body = await request.json()

    // Extract allowed fields
    const { name, color, isActive, isDefault, notifyOnChange, order } = body

    // Build update data (only include fields that exist in the schema)
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (color !== undefined) updateData.color = color
    if (isActive !== undefined) updateData.isActive = isActive
    if (order !== undefined) updateData.order = order

    // notifyOnChange - only include if field exists (migration might not be run yet)
    // This will be silently ignored if the column doesn't exist
    if (notifyOnChange !== undefined) {
      updateData.notifyOnChange = notifyOnChange
    }

    // Handle isDefault - only one status can be default
    if (isDefault === true) {
      await prisma.projectStatus.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
      updateData.isDefault = true
    } else if (isDefault === false) {
      updateData.isDefault = false
    }

    // Try to update with notifyOnChange first, fall back without it if column doesn't exist
    let status
    try {
      status = await prisma.projectStatus.update({
        where: { id },
        data: updateData,
      })
    } catch (updateError: any) {
      // If error is about unknown field, try without notifyOnChange
      if (updateError?.message?.includes('notifyOnChange') || updateError?.code === 'P2009') {
        delete updateData.notifyOnChange
        status = await prisma.projectStatus.update({
          where: { id },
          data: updateData,
        })
      } else {
        throw updateError
      }
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error updating status:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Check if any projects use this status
    const projectCount = await prisma.project.count({
      where: { statusId: id },
    })

    if (projectCount > 0) {
      return NextResponse.json(
        { error: `Nie można usunąć statusu - jest używany przez ${projectCount} projektów` },
        { status: 400 }
      )
    }

    await prisma.projectStatus.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting status:', error)
    return NextResponse.json(
      { error: 'Failed to delete status' },
      { status: 500 }
    )
  }
}
