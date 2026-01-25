import { prisma } from '@/lib/db'
import { authenticateApiRequest, hasPermission, apiResponse, apiError } from '@/lib/api-auth'
import { NextRequest } from 'next/server'

// GET /api/v1/projects - Lista projektów
export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest()

  if (!auth.authenticated) {
    return apiError(auth.error || 'Unauthorized', 401)
  }

  if (!hasPermission(auth.permissions, 'projects:read')) {
    return apiError('Insufficient permissions', 403)
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status) where.status = { slug: status }
    if (clientId) where.clientAccountId = clientId

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          status: { select: { name: true, slug: true, color: true } },
          clientAccount: { select: { id: true, name: true, slug: true } },
          tags: { select: { id: true, name: true, color: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.project.count({ where }),
    ])

    return apiResponse({
      data: projects.map((p) => ({
        id: p.id,
        number: p.number,
        title: p.title,
        description: p.description,
        status: p.status,
        client: p.clientAccount,
        tags: p.tags,
        deadline: p.deadline,
        localPath: p.localPath,
        dropboxPath: p.dropboxPath,
        dropboxLink: p.dropboxLink,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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

// POST /api/v1/projects - Utwórz projekt
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest()

  if (!auth.authenticated) {
    return apiError(auth.error || 'Unauthorized', 401)
  }

  if (!hasPermission(auth.permissions, 'projects:write')) {
    return apiError('Insufficient permissions', 403)
  }

  try {
    const body = await request.json()

    const { title, description, clientId, statusSlug, deadline, tags } = body

    if (!title || !clientId) {
      return apiError('Missing required fields: title, clientId', 400)
    }

    // Get default status if not provided
    let statusId: string
    if (statusSlug) {
      const status = await prisma.projectStatus.findUnique({
        where: { slug: statusSlug },
      })
      if (!status) return apiError('Status not found', 400)
      statusId = status.id
    } else {
      const defaultStatus = await prisma.projectStatus.findFirst({
        where: { isDefault: true },
      })
      if (!defaultStatus) return apiError('No default status configured', 500)
      statusId = defaultStatus.id
    }

    // Generate project number
    const lastProject = await prisma.project.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    })
    const lastNum = lastProject ? parseInt(lastProject.number.replace('PRJ-', '')) : 0
    const number = `PRJ-${String(lastNum + 1).padStart(6, '0')}`

    const project = await prisma.project.create({
      data: {
        number,
        title,
        description,
        clientAccountId: clientId,
        statusId,
        deadline: deadline ? new Date(deadline) : null,
        tags: tags ? { connect: tags.map((id: string) => ({ id })) } : undefined,
      },
      include: {
        status: { select: { name: true, slug: true, color: true } },
        clientAccount: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, color: true } },
      },
    })

    return apiResponse({ data: project }, 201)
  } catch (error) {
    console.error('API error:', error)
    return apiError('Internal server error', 500)
  }
}
