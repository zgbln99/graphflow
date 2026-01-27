import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type ReactionGroup = Record<string, { emoji: string; count: number; users: string[]; hasReacted: boolean }>

// GET - pobierz reakcje dla komentarza
export async function GET(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reactions = await prisma.commentReaction.findMany({
      where: { commentId: params.commentId },
    })

    // Grupuj reakcje po emoji
    const grouped: ReactionGroup = {}
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        }
      }
      grouped[r.emoji].count++
      grouped[r.emoji].users.push(r.userId)
      if (r.userId === user.id) {
        grouped[r.emoji].hasReacted = true
      }
    }

    return NextResponse.json(Object.values(grouped))
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - dodaj reakcję
export async function POST(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emoji } = await request.json()

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }

    // Sprawdź czy reakcja już istnieje
    const existing = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_emoji: {
          commentId: params.commentId,
          userId: user.id,
          emoji,
        },
      },
    })

    if (existing) {
      // Usuń reakcję (toggle)
      await prisma.commentReaction.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({ action: 'removed' })
    }

    // Dodaj reakcję
    await prisma.commentReaction.create({
      data: {
        emoji,
        commentId: params.commentId,
        userId: user.id,
      },
    })

    return NextResponse.json({ action: 'added' })
  } catch (error) {
    console.error('Error adding reaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - usuń reakcję
export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emoji } = await request.json()

    await prisma.commentReaction.deleteMany({
      where: {
        commentId: params.commentId,
        userId: user.id,
        emoji,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing reaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
