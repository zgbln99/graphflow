// Real-time event types
export type RealtimeEventType =
  | 'notification'
  | 'project_update'
  | 'comment_added'
  | 'status_changed'

export interface RealtimeEvent {
  type: RealtimeEventType
  data: any
}

// Global event bus for SSE connections
// This works for single-server deployment
// For multi-server, replace with Redis pub/sub
class EventBus {
  private controllers = new Map<string, Set<ReadableStreamDefaultController>>()

  addController(userId: string, controller: ReadableStreamDefaultController) {
    if (!this.controllers.has(userId)) {
      this.controllers.set(userId, new Set())
    }
    this.controllers.get(userId)!.add(controller)
  }

  removeController(userId: string, controller: ReadableStreamDefaultController) {
    const userControllers = this.controllers.get(userId)
    if (userControllers) {
      userControllers.delete(controller)
      if (userControllers.size === 0) {
        this.controllers.delete(userId)
      }
    }
  }

  sendToUser(userId: string, event: RealtimeEvent) {
    const userControllers = this.controllers.get(userId)
    if (userControllers) {
      const message = `data: ${JSON.stringify(event)}\n\n`
      const encoded = new TextEncoder().encode(message)
      userControllers.forEach((controller) => {
        try {
          controller.enqueue(encoded)
        } catch (error) {
          // Controller may be closed
        }
      })
    }
  }

  sendToUsers(userIds: string[], event: RealtimeEvent) {
    userIds.forEach((userId) => this.sendToUser(userId, event))
  }

  broadcast(event: RealtimeEvent) {
    const message = `data: ${JSON.stringify(event)}\n\n`
    const encoded = new TextEncoder().encode(message)
    this.controllers.forEach((controllers) => {
      controllers.forEach((controller) => {
        try {
          controller.enqueue(encoded)
        } catch (error) {
          // Controller may be closed
        }
      })
    })
  }
}

// Singleton event bus
export const eventBus = new EventBus()

/**
 * Send notification event to a user
 */
export function notifyUser(userId: string, data: any) {
  eventBus.sendToUser(userId, { type: 'notification', data })
}

/**
 * Send notification event to multiple users
 */
export function notifyUsers(userIds: string[], data: any) {
  console.log('[Realtime] Sending to users:', userIds, 'data:', JSON.stringify(data))
  eventBus.sendToUsers(userIds, { type: 'notification', data })
}
