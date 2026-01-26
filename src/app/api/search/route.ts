import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const isAdmin = session.user.role === 'ADMIN'
  const results: any[] = []

  try {
    // Search projects
    const projects = await prisma.project.findMany({
      where: {
        ...(isAdmin ? {} : { clientAccountId: session.user.clientAccountId! }),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { number: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        clientAccount: { select: { name: true } },
        status: { select: { name: true } },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    })

    projects.forEach((project: typeof projects[number]) => {
      results.push({
        id: project.id,
        type: 'project',
        title: `${project.number} - ${project.title}`,
        subtitle: `${project.clientAccount.name} • ${project.status.name}`,
        href: `/panel/projects/${project.id}`,
      })
    })

    // Admin-only searches
    if (isAdmin) {
      // Search clients
      const clients = await prisma.clientAccount.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { name: 'asc' },
      })

      clients.forEach((client: typeof clients[number]) => {
        results.push({
          id: client.id,
          type: 'client',
          title: client.name,
          subtitle: client.email || undefined,
          href: `/panel/clients/${client.id}`,
        })
      })

      // Search users
      const users = await prisma.user.findMany({
        where: {
          role: 'CLIENT_USER',
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          clientAccount: { select: { name: true, id: true } },
        },
        take: 5,
        orderBy: { name: 'asc' },
      })

      users.forEach((user: typeof users[number]) => {
        results.push({
          id: user.id,
          type: 'user',
          title: user.name,
          subtitle: `${user.email} • ${user.clientAccount?.name || 'Brak klienta'}`,
          href: user.clientAccountId ? `/panel/clients/${user.clientAccountId}/users` : '#',
        })
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
