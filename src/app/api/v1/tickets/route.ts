import { prisma } from '@/lib/db'
import { authenticateApiRequest, hasPermission, apiResponse, apiError } from '@/lib/api-auth'
import { NextRequest } from 'next/server'
import { createHmac, randomBytes } from 'crypto'

// GET /api/v1/tickets - Lista ticketów
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest()

  if (!auth.authenticated) {
    return apiError(auth.error || 'Unauthorized', 401)
  }

  if (!hasPermission(auth.permissions, 'tickets:read')) {
    return apiError('Insufficient permissions', 403)
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const clientId = searchParams.get('client_id')
    const projectId = searchParams.get('project_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (clientId) where.clientAccountId = clientId
    if (projectId) where.projectId = projectId

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          clientAccount: { select: { id: true, name: true, slug: true } },
          project: { select: { id: true, number: true, title: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ticket.count({ where }),
    ])

    return apiResponse({
      data: tickets.map((t) => ({
        id: t.id,
        number: t.number,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        client: t.clientAccount,
        project: t.project,
        createdBy: t.createdBy,
        deadline: t.deadline,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      meta: {
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return apiError('Internal server error', 500)
  }
}

// POST /api/v1/tickets - Utwórz ticket
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest()

  if (!auth.authenticated) {
    return apiError(auth.error || 'Unauthorized', 401)
  }

  if (!hasPermission(auth.permissions, 'tickets:write')) {
    return apiError('Insufficient permissions', 403)
  }

  try {
    const body = await request.json()

    const { title, description, clientId, projectId, priority, deadline, createdById } = body

    if (!title || !clientId || !createdById) {
      return apiError('Missing required fields: title, clientId, createdById', 400)
    }

    // Generate ticket number
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    })
    const lastNum = lastTicket ? parseInt(lastTicket.number.replace('TCK-', '')) : 0
    const number = `TCK-${String(lastNum + 1).padStart(6, '0')}`

    // Generate reply token
    const replyToken = createHmac('sha256', process.env.EMAIL_REPLY_SECRET || 'secret')
      .update(`${number}-${Date.now()}-${randomBytes(8).toString('hex')}`)
      .digest('hex')
      .substring(0, 32)

    const ticket = await prisma.ticket.create({
      data: {
        number,
        title,
        description,
        clientAccountId: clientId,
        projectId: projectId || null,
        createdById,
        priority: priority || 'NORMAL',
        deadline: deadline ? new Date(deadline) : null,
        replyToken,
      },
      include: {
        clientAccount: { select: { id: true, name: true, slug: true } },
        project: { select: { id: true, number: true, title: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return apiResponse({ data: ticket }, 201)
  } catch (error) {
    console.error('API error:', error)
    return apiError('Internal server error', 500)
  }
}
