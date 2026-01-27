'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface SSEEvent<T = unknown> {
  type: string
  data: T
  id?: string
  retry?: number
}

interface SSEOptions<T = unknown> {
  /** URL of the SSE endpoint */
  url: string
  /** Whether to automatically connect on mount (default: true) */
  autoConnect?: boolean
  /** Whether to automatically reconnect on disconnect (default: true) */
  autoReconnect?: boolean
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number
  /** Multiplier for exponential backoff (default: 2) */
  reconnectBackoff?: number
  /** Maximum number of reconnect attempts (default: Infinity) */
  maxReconnectAttempts?: number
  /** Custom headers (requires fetch-based SSE) */
  withCredentials?: boolean
  /** Event handlers for specific event types */
  eventHandlers?: Record<string, (data: T) => void>
  /** Called when any event is received */
  onEvent?: (event: SSEEvent<T>) => void
  /** Called when connection is established */
  onConnect?: () => void
  /** Called when connection is closed */
  onDisconnect?: () => void
  /** Called when an error occurs */
  onError?: (error: Event | Error) => void
  /** Called when reconnecting */
  onReconnect?: (attempt: number) => void
  /** Parse incoming data (default: JSON.parse) */
  parseData?: (data: string) => T
}

interface SSEState {
  /** Current connection state */
  connectionState: ConnectionState
  /** Whether currently connected */
  isConnected: boolean
  /** Whether currently connecting */
  isConnecting: boolean
  /** Last error that occurred */
  lastError: Error | null
  /** Number of reconnect attempts */
  reconnectAttempts: number
  /** Last event ID received */
  lastEventId: string | null
}

interface SSEActions {
  /** Manually connect to the SSE endpoint */
  connect: () => void
  /** Manually disconnect from the SSE endpoint */
  disconnect: () => void
  /** Reconnect (disconnect then connect) */
  reconnect: () => void
}

type UseSSEReturn<T> = [SSEState, SSEActions, T | null]

// ============================================================================
// useSSE Hook
// ============================================================================

/**
 * Hook for managing Server-Sent Events connections.
 *
 * @param options - SSE configuration options
 * @returns Tuple of [state, actions, lastEventData]
 *
 * @example
 * ```tsx
 * const [{ isConnected, connectionState }, { connect, disconnect }, lastEvent] = useSSE({
 *   url: '/api/events',
 *   eventHandlers: {
 *     'notification': (data) => addNotification(data),
 *     'update': (data) => updateState(data),
 *   },
 *   onConnect: () => console.log('Connected'),
 *   onError: (err) => console.error('SSE Error:', err),
 * })
 * ```
 */
export function useSSE<T = unknown>(options: SSEOptions<T>): UseSSEReturn<T> {
  const {
    url,
    autoConnect = true,
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    reconnectBackoff = 2,
    maxReconnectAttempts = Infinity,
    withCredentials = false,
    eventHandlers = {},
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    parseData = JSON.parse,
  } = options

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    autoConnect ? 'connecting' : 'disconnected'
  )
  const [lastError, setLastError] = useState<Error | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastEventId, setLastEventId] = useState<string | null>(null)
  const [lastEventData, setLastEventData] = useState<T | null>(null)

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentReconnectDelayRef = useRef(reconnectDelay)
  const isManualDisconnectRef = useRef(false)
  const mountedRef = useRef(true)

  // Keep callbacks in refs to avoid reconnection on callback changes
  const callbacksRef = useRef({
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    eventHandlers,
    parseData,
  })

  useEffect(() => {
    callbacksRef.current = {
      onEvent,
      onConnect,
      onDisconnect,
      onError,
      onReconnect,
      eventHandlers,
      parseData,
    }
  }, [onEvent, onConnect, onDisconnect, onError, onReconnect, eventHandlers, parseData])

  // Ref to hold connect function for use in scheduleReconnect
  const connectRef = useRef<() => void>(() => {})

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (!autoReconnect || isManualDisconnectRef.current) return
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionState('error')
      return
    }

    const delay = Math.min(currentReconnectDelayRef.current, maxReconnectDelay)
    currentReconnectDelayRef.current = delay * reconnectBackoff

    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !isManualDisconnectRef.current) {
        setReconnectAttempts((prev) => prev + 1)
        callbacksRef.current.onReconnect?.(reconnectAttempts + 1)
        connectRef.current()
      }
    }, delay)
  }, [autoReconnect, maxReconnectAttempts, maxReconnectDelay, reconnectBackoff, reconnectAttempts])

  // Connect function
  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    clearReconnectTimeout()

    isManualDisconnectRef.current = false
    setConnectionState('connecting')
    setLastError(null)

    try {
      // Create EventSource with optional last event ID
      const eventSourceUrl = lastEventId
        ? `${url}${url.includes('?') ? '&' : '?'}lastEventId=${encodeURIComponent(lastEventId)}`
        : url

      const eventSource = new EventSource(eventSourceUrl, { withCredentials })
      eventSourceRef.current = eventSource

      // Handle connection open
      eventSource.onopen = () => {
        if (!mountedRef.current) return

        setConnectionState('connected')
        setReconnectAttempts(0)
        currentReconnectDelayRef.current = reconnectDelay
        callbacksRef.current.onConnect?.()
      }

      // Handle messages
      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return

        try {
          const data = callbacksRef.current.parseData(event.data)
          const sseEvent: SSEEvent<T> = {
            type: 'message',
            data,
            id: event.lastEventId,
          }

          if (event.lastEventId) {
            setLastEventId(event.lastEventId)
          }

          setLastEventData(data)
          callbacksRef.current.onEvent?.(sseEvent)
        } catch (err) {
          console.error('Failed to parse SSE message:', err)
        }
      }

      // Handle errors
      eventSource.onerror = (event) => {
        if (!mountedRef.current) return

        const error = new Error('SSE connection error')
        setLastError(error)
        callbacksRef.current.onError?.(event)

        if (eventSource.readyState === EventSource.CLOSED) {
          setConnectionState('disconnected')
          callbacksRef.current.onDisconnect?.()
          scheduleReconnect()
        }
      }

      // Set up custom event handlers
      const handlers = callbacksRef.current.eventHandlers
      Object.entries(handlers).forEach(([eventType, handler]) => {
        eventSource.addEventListener(eventType, ((event: MessageEvent) => {
          if (!mountedRef.current) return

          try {
            const data = callbacksRef.current.parseData(event.data)
            const sseEvent: SSEEvent<T> = {
              type: eventType,
              data,
              id: event.lastEventId,
            }

            if (event.lastEventId) {
              setLastEventId(event.lastEventId)
            }

            setLastEventData(data)
            handler(data)
            callbacksRef.current.onEvent?.(sseEvent)
          } catch (err) {
            console.error(`Failed to parse SSE event "${eventType}":`, err)
          }
        }) as EventListener)
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setLastError(error)
      setConnectionState('error')
      callbacksRef.current.onError?.(error)
    }
  }, [url, withCredentials, lastEventId, reconnectDelay, clearReconnectTimeout, scheduleReconnect])

  // Update connectRef to break circular dependency with scheduleReconnect
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // Disconnect function
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true
    clearReconnectTimeout()

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setConnectionState('disconnected')
    callbacksRef.current.onDisconnect?.()
  }, [clearReconnectTimeout])

  // Reconnect function
  const reconnect = useCallback(() => {
    disconnect()
    isManualDisconnectRef.current = false
    setReconnectAttempts(0)
    currentReconnectDelayRef.current = reconnectDelay
    connect()
  }, [connect, disconnect, reconnectDelay])

  // Auto-connect on mount - intentionally empty deps array to only run once
  useEffect(() => {
    mountedRef.current = true

    if (autoConnect) {
      connectRef.current()
    }

    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty - only run on mount/unmount

  // Computed state values
  const state: SSEState = useMemo(
    () => ({
      connectionState,
      isConnected: connectionState === 'connected',
      isConnecting: connectionState === 'connecting',
      lastError,
      reconnectAttempts,
      lastEventId,
    }),
    [connectionState, lastError, reconnectAttempts, lastEventId]
  )

  const actions: SSEActions = useMemo(
    () => ({
      connect,
      disconnect,
      reconnect,
    }),
    [connect, disconnect, reconnect]
  )

  return [state, actions, lastEventData]
}

// ============================================================================
// useSSESubscription Hook - Simplified subscription to a single event type
// ============================================================================

interface SSESubscriptionOptions<T> {
  /** URL of the SSE endpoint */
  url: string
  /** Event type to subscribe to (default: 'message') */
  eventType?: string
  /** Called when an event is received */
  onEvent: (data: T) => void
  /** Auto-connect on mount */
  autoConnect?: boolean
  /** Parse data function */
  parseData?: (data: string) => T
}

/**
 * Simplified hook for subscribing to a single SSE event type.
 *
 * @example
 * ```tsx
 * const { isConnected } = useSSESubscription<Notification>({
 *   url: '/api/events',
 *   eventType: 'notification',
 *   onEvent: (notification) => {
 *     addNotification(notification)
 *   },
 * })
 * ```
 */
export function useSSESubscription<T = unknown>(
  options: SSESubscriptionOptions<T>
): { isConnected: boolean; error: Error | null; reconnect: () => void } {
  const { url, eventType = 'message', onEvent, autoConnect = true, parseData } = options

  const [state, actions] = useSSE<T>({
    url,
    autoConnect,
    parseData,
    eventHandlers:
      eventType === 'message' ? {} : { [eventType]: onEvent },
    onEvent:
      eventType === 'message'
        ? (event) => {
            if (event.type === 'message') {
              onEvent(event.data)
            }
          }
        : undefined,
  })

  return {
    isConnected: state.isConnected,
    error: state.lastError,
    reconnect: actions.reconnect,
  }
}

// ============================================================================
// useSSEWithHistory Hook - Keep event history
// ============================================================================

interface SSEWithHistoryOptions<T> extends Omit<SSEOptions<T>, 'onEvent'> {
  /** Maximum number of events to keep in history */
  maxHistory?: number
}

interface SSEWithHistoryState<T> extends SSEState {
  /** History of received events */
  history: SSEEvent<T>[]
}

/**
 * Hook that maintains a history of received SSE events.
 *
 * @example
 * ```tsx
 * const [{ history, isConnected }, actions] = useSSEWithHistory<Message>({
 *   url: '/api/chat',
 *   maxHistory: 100,
 * })
 *
 * return (
 *   <div>
 *     {history.map((event, i) => (
 *       <div key={i}>{event.data.text}</div>
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useSSEWithHistory<T = unknown>(
  options: SSEWithHistoryOptions<T>
): [SSEWithHistoryState<T>, SSEActions] {
  const { maxHistory = 100, ...sseOptions } = options
  const [history, setHistory] = useState<SSEEvent<T>[]>([])

  const [state, actions] = useSSE<T>({
    ...sseOptions,
    onEvent: (event) => {
      setHistory((prev) => {
        const newHistory = [...prev, event]
        if (newHistory.length > maxHistory) {
          return newHistory.slice(-maxHistory)
        }
        return newHistory
      })
    },
  })

  const extendedState: SSEWithHistoryState<T> = useMemo(
    () => ({
      ...state,
      history,
    }),
    [state, history]
  )

  return [extendedState, actions]
}

// ============================================================================
// Helper: Create typed SSE hook
// ============================================================================

/**
 * Create a typed SSE hook for a specific endpoint and event types.
 *
 * @example
 * ```tsx
 * interface ChatEvents {
 *   message: { user: string; text: string }
 *   typing: { user: string }
 *   presence: { user: string; online: boolean }
 * }
 *
 * const useChatSSE = createSSEHook<ChatEvents>('/api/chat/events')
 *
 * // Usage
 * const [state, actions] = useChatSSE({
 *   eventHandlers: {
 *     message: (data) => handleMessage(data),
 *     typing: (data) => handleTyping(data),
 *   },
 * })
 * ```
 */
export function createSSEHook<TEvents extends Record<string, unknown>>(
  url: string
) {
  return function useTypedSSE(
    options: Omit<SSEOptions<TEvents[keyof TEvents]>, 'url'> & {
      eventHandlers?: {
        [K in keyof TEvents]?: (data: TEvents[K]) => void
      }
    }
  ) {
    return useSSE<TEvents[keyof TEvents]>({
      url,
      ...options,
      eventHandlers: options.eventHandlers as Record<
        string,
        (data: TEvents[keyof TEvents]) => void
      >,
    })
  }
}
