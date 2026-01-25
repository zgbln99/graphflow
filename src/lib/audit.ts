import { prisma } from './db'
import { AuditAction } from '@prisma/client'

interface AuditLogInput {
  action: AuditAction
  entityType: 'project' | 'ticket' | 'client' | 'user' | 'comment' | 'settings'
  entityId: string
  entityName?: string
  changes?: Record<string, { from: unknown; to: unknown }>
  description?: string
  userId?: string
  userName?: string
  userEmail?: string
  ipAddress?: string
  userAgent?: string
}

export async function logAudit(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        changes: input.changes ? JSON.stringify(input.changes) : null,
        description: input.description,
        userId: input.userId,
        userName: input.userName,
        userEmail: input.userEmail,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export function formatChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  for (const field of fields) {
    const fromValue = before[field]
    const toValue = after[field]

    if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
      changes[field] = { from: fromValue, to: toValue }
    }
  }

  return changes
}

export function describeChange(
  action: AuditAction,
  entityType: string,
  changes?: Record<string, { from: unknown; to: unknown }>
): string {
  const entityNames: Record<string, string> = {
    project: 'projekt',
    ticket: 'ticket',
    client: 'klienta',
    user: 'użytkownika',
    comment: 'komentarz',
    settings: 'ustawienia',
  }

  const entityName = entityNames[entityType] || entityType

  switch (action) {
    case 'CREATE':
      return `Utworzono ${entityName}`
    case 'DELETE':
      return `Usunięto ${entityName}`
    case 'STATUS_CHANGE':
      if (changes?.status) {
        return `Zmieniono status z "${changes.status.from}" na "${changes.status.to}"`
      }
      return `Zmieniono status`
    case 'COMMENT_ADD':
      return `Dodano komentarz`
    case 'LOGIN':
      return `Zalogowano do systemu`
    case 'LOGOUT':
      return `Wylogowano z systemu`
    case 'UPDATE':
      if (changes) {
        const changedFields = Object.keys(changes)
        if (changedFields.length === 1) {
          return `Zmieniono pole "${changedFields[0]}"`
        }
        return `Zmieniono ${changedFields.length} pól`
      }
      return `Zaktualizowano ${entityName}`
    default:
      return `Wykonano akcję na ${entityName}`
  }
}
