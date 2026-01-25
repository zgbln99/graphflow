import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { eventBus } from '@/lib/realtime'

// GET /api/events - SSE endpoint for real-time events
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id

  const stream = new ReadableStream({
    start(controller) {
      // Add this controller to the event bus
      eventBus.addController(userId, controller)

      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({ type: 'connected' })}\n\n`
      controller.enqueue(new TextEncoder().encode(connectMessage))

      // Keep connection alive with heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `: heartbeat\n\n`
          controller.enqueue(new TextEncoder().encode(heartbeat))
        } catch (error) {
          clearInterval(heartbeatInterval)
        }
      }, 30000)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        eventBus.removeController(userId, controller)
        try {
          controller.close()
        } catch (error) {
          // Controller may already be closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
