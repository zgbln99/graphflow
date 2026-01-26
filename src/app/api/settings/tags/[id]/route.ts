import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  const { id } = await params

  try {
    const tag = await prisma.projectTag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag nie został znaleziony' }, { status: 404 })
    }

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Error fetching tag:', error)
    return NextResponse.json({ error: 'Błąd pobierania tagu' }, { status: 500 })
  }
}
