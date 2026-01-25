import { prisma } from './db'
import { createHmac } from 'crypto'

export type WebhookEvent =
  | 'project.created'
  | 'project.updated'
  | 'project.status_changed'
  | 'project.deleted'
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.status_changed'
  | 'ticket.closed'
  | 'comment.created'

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

export async function triggerWebhook(event: WebhookEvent, data: Record<string, unknown>) {
  try {
    // Find all active webhooks that listen for this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: event },
      },
    })

    if (webhooks.length === 0) return

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    // Send webhooks in parallel
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const payloadString = JSON.stringify(payload)

        // Create signature
        const signature = createHmac('sha256', webhook.secret)
          .update(payloadString)
          .digest('hex')

        try {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Event': event,
            },
            body: payloadString,
          })

          // Update webhook stats
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              lastCalledAt: new Date(),
              lastStatusCode: response.status,
              failCount: response.ok ? 0 : { increment: 1 },
            },
          })

          return { webhookId: webhook.id, success: response.ok, status: response.status }
        } catch (error) {
          // Update fail count
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              lastCalledAt: new Date(),
              lastStatusCode: 0,
              failCount: { increment: 1 },
            },
          })

          throw error
        }
      })
    )

    // Log results
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      console.warn(`${failed}/${webhooks.length} webhooks failed for event ${event}`)
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error)
  }
}

// Helper to trigger webhooks from server actions
export async function webhookProjectCreated(project: { id: string; number: string; title: string; clientAccountId: string }) {
  await triggerWebhook('project.created', {
    project: {
      id: project.id,
      number: project.number,
      title: project.title,
      clientAccountId: project.clientAccountId,
    },
  })
}

export async function webhookProjectStatusChanged(
  project: { id: string; number: string; title: string },
  oldStatus: string,
  newStatus: string
) {
  await triggerWebhook('project.status_changed', {
    project: {
      id: project.id,
      number: project.number,
      title: project.title,
    },
    change: {
      from: oldStatus,
      to: newStatus,
    },
  })
}

export async function webhookTicketCreated(ticket: { id: string; number: string; title: string; clientAccountId: string }) {
  await triggerWebhook('ticket.created', {
    ticket: {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      clientAccountId: ticket.clientAccountId,
    },
  })
}

export async function webhookTicketStatusChanged(
  ticket: { id: string; number: string; title: string },
  oldStatus: string,
  newStatus: string
) {
  await triggerWebhook('ticket.status_changed', {
    ticket: {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
    },
    change: {
      from: oldStatus,
      to: newStatus,
    },
  })
}

export async function webhookCommentCreated(
  comment: { id: string; content: string },
  ticket: { id: string; number: string; title: string },
  author: { id: string; name: string }
) {
  await triggerWebhook('comment.created', {
    comment: {
      id: comment.id,
      content: comment.content.substring(0, 200),
    },
    ticket: {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
    },
    author: {
      id: author.id,
      name: author.name,
    },
  })
}
