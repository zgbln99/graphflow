'use client'

import { useState, useCallback, useRef, useTransition } from 'react'

// ============================================================================
// Types
// ============================================================================

interface OptimisticState<T> {
  /** Current data (optimistically updated) */
  data: T
  /** Whether there's a pending update */
  isPending: boolean
  /** Error from the last failed update */
  error: Error | null
  /** Whether currently rolling back from an error */
  isRollingBack: boolean
}

interface OptimisticActions<T> {
  /** Apply an optimistic update */
  update: (
    optimisticData: T | ((current: T) => T),
    asyncAction: () => Promise<T | void>
  ) => Promise<void>
  /** Reset error state */
  clearError: () => void
  /** Force set the data (no async action) */
  setData: (data: T) => void
  /** Reset to initial state */
  reset: () => void
}

type UseOptimisticReturn<T> = [OptimisticState<T>, OptimisticActions<T>]

interface UseOptimisticOptions<T> {
  /** Called when an update fails */
  onError?: (error: Error, rollbackData: T) => void
  /** Called when an update succeeds */
  onSuccess?: (data: T) => void
  /** Delay before applying rollback (for UI smoothness) */
  rollbackDelay?: number
}

// ============================================================================
// useOptimistic Hook
// ============================================================================

/**
 * Hook for managing optimistic updates with automatic rollback on error.
 *
 * @param initialData - Initial data state
 * @param options - Configuration options
 * @returns Tuple of [state, actions]
 *
 * @example
 * ```tsx
 * const [{ data: todos, isPending, error }, { update }] = useOptimistic<Todo[]>(
 *   initialTodos,
 *   { onError: (err) => toast.error(err.message) }
 * )
 *
 * const handleToggle = async (id: string) => {
 *   await update(
 *     // Optimistic update
 *     (current) => current.map(t => t.id === id ? { ...t, done: !t.done } : t),
 *     // Async action
 *     async () => {
 *       const response = await toggleTodo(id)
 *       return response.todos // Optional: return server data to use instead
 *     }
 *   )
 * }
 * ```
 */
export function useOptimistic<T>(
  initialData: T,
  options: UseOptimisticOptions<T> = {}
): UseOptimisticReturn<T> {
  const { onError, onSuccess, rollbackDelay = 0 } = options

  const [data, setData] = useState<T>(initialData)
  const [error, setError] = useState<Error | null>(null)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Keep track of the last confirmed data for rollback
  const confirmedDataRef = useRef<T>(initialData)
  const initialDataRef = useRef<T>(initialData)
  const pendingUpdatesRef = useRef<number>(0)

  const update = useCallback(
    async (
      optimisticData: T | ((current: T) => T),
      asyncAction: () => Promise<T | void>
    ): Promise<void> => {
      // Store the current data for potential rollback
      const previousData = confirmedDataRef.current

      // Apply optimistic update
      const newData =
        typeof optimisticData === 'function'
          ? (optimisticData as (current: T) => T)(data)
          : optimisticData

      pendingUpdatesRef.current += 1
      setData(newData)
      setError(null)

      try {
        // Wrap in startTransition for better UX
        await new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            try {
              const result = await asyncAction()

              // Use server response if provided, otherwise keep optimistic data
              const finalData = result !== undefined ? result : newData
              confirmedDataRef.current = finalData
              setData(finalData)

              onSuccess?.(finalData)
              resolve()
            } catch (err) {
              reject(err)
            }
          })
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))

        // Rollback to previous confirmed data
        setError(error)
        setIsRollingBack(true)

        if (rollbackDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, rollbackDelay))
        }

        setData(previousData)
        setIsRollingBack(false)

        onError?.(error, previousData)
      } finally {
        pendingUpdatesRef.current -= 1
      }
    },
    [data, onError, onSuccess, rollbackDelay]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const setDataDirect = useCallback((newData: T) => {
    setData(newData)
    confirmedDataRef.current = newData
  }, [])

  const reset = useCallback(() => {
    setData(initialDataRef.current)
    confirmedDataRef.current = initialDataRef.current
    setError(null)
    setIsRollingBack(false)
  }, [])

  return [
    { data, isPending, error, isRollingBack },
    { update, clearError, setData: setDataDirect, reset },
  ]
}

// ============================================================================
// useOptimisticList Hook
// ============================================================================

interface ListItem {
  id: string | number
}

interface OptimisticListActions<T extends ListItem> {
  /** Add an item optimistically */
  add: (
    item: T,
    asyncAction: () => Promise<T | void>,
    options?: { position?: 'start' | 'end' }
  ) => Promise<void>
  /** Update an item optimistically */
  update: (
    id: T['id'],
    updates: Partial<T> | ((item: T) => T),
    asyncAction: () => Promise<T | void>
  ) => Promise<void>
  /** Remove an item optimistically */
  remove: (
    id: T['id'],
    asyncAction: () => Promise<void>
  ) => Promise<void>
  /** Reorder items optimistically */
  reorder: (
    fromIndex: number,
    toIndex: number,
    asyncAction: () => Promise<void>
  ) => Promise<void>
  /** Clear error state */
  clearError: () => void
  /** Set list directly */
  setList: (items: T[]) => void
  /** Reset to initial state */
  reset: () => void
}

type UseOptimisticListReturn<T extends ListItem> = [
  OptimisticState<T[]>,
  OptimisticListActions<T>
]

/**
 * Specialized hook for optimistic list operations.
 *
 * @example
 * ```tsx
 * const [{ data: items, isPending }, { add, remove, update }] = useOptimisticList<Task>(
 *   initialTasks
 * )
 *
 * const handleAdd = () => {
 *   const newTask = { id: tempId(), title: 'New Task' }
 *   await add(newTask, async () => {
 *     const created = await api.createTask(newTask)
 *     return created // Replace temp item with server response
 *   })
 * }
 * ```
 */
export function useOptimisticList<T extends ListItem>(
  initialItems: T[],
  options: UseOptimisticOptions<T[]> = {}
): UseOptimisticListReturn<T> {
  const [state, baseActions] = useOptimistic<T[]>(initialItems, options)

  const add = useCallback(
    async (
      item: T,
      asyncAction: () => Promise<T | void>,
      { position = 'end' }: { position?: 'start' | 'end' } = {}
    ): Promise<void> => {
      await baseActions.update(
        (current) =>
          position === 'start' ? [item, ...current] : [...current, item],
        async () => {
          const result = await asyncAction()
          // If server returns the created item, replace the temp item
          if (result) {
            return state.data.map((i) => (i.id === item.id ? result : i))
          }
        }
      )
    },
    [baseActions, state.data]
  )

  const update = useCallback(
    async (
      id: T['id'],
      updates: Partial<T> | ((item: T) => T),
      asyncAction: () => Promise<T | void>
    ): Promise<void> => {
      await baseActions.update(
        (current) =>
          current.map((item) => {
            if (item.id !== id) return item
            return typeof updates === 'function'
              ? updates(item)
              : { ...item, ...updates }
          }),
        async () => {
          const result = await asyncAction()
          if (result) {
            return state.data.map((i) => (i.id === id ? result : i))
          }
        }
      )
    },
    [baseActions, state.data]
  )

  const remove = useCallback(
    async (id: T['id'], asyncAction: () => Promise<void>): Promise<void> => {
      await baseActions.update(
        (current) => current.filter((item) => item.id !== id),
        asyncAction
      )
    },
    [baseActions]
  )

  const reorder = useCallback(
    async (
      fromIndex: number,
      toIndex: number,
      asyncAction: () => Promise<void>
    ): Promise<void> => {
      await baseActions.update((current) => {
        const result = [...current]
        const [removed] = result.splice(fromIndex, 1)
        result.splice(toIndex, 0, removed)
        return result
      }, asyncAction)
    },
    [baseActions]
  )

  return [
    state,
    {
      add,
      update,
      remove,
      reorder,
      clearError: baseActions.clearError,
      setList: baseActions.setData,
      reset: baseActions.reset,
    },
  ]
}

// ============================================================================
// useOptimisticMutation Hook
// ============================================================================

interface MutationState<T> {
  data: T | null
  isPending: boolean
  error: Error | null
  isSuccess: boolean
}

interface MutationActions<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput>
  reset: () => void
}

interface UseOptimisticMutationOptions<TInput, TOutput> {
  /** The async mutation function */
  mutationFn: (input: TInput) => Promise<TOutput>
  /** Called on success */
  onSuccess?: (data: TOutput, input: TInput) => void
  /** Called on error */
  onError?: (error: Error, input: TInput) => void
  /** Called after mutation (success or error) */
  onSettled?: (data: TOutput | null, error: Error | null, input: TInput) => void
}

/**
 * Hook for handling mutations with loading and error states.
 *
 * @example
 * ```tsx
 * const [{ isPending, error }, { mutate }] = useOptimisticMutation({
 *   mutationFn: updateProject,
 *   onSuccess: (data) => toast.success('Saved!'),
 *   onError: (err) => toast.error(err.message),
 * })
 *
 * const handleSubmit = async (data) => {
 *   await mutate(data)
 * }
 * ```
 */
export function useOptimisticMutation<TInput, TOutput>(
  options: UseOptimisticMutationOptions<TInput, TOutput>
): [MutationState<TOutput>, MutationActions<TInput, TOutput>] {
  const { mutationFn, onSuccess, onError, onSettled } = options

  const [data, setData] = useState<TOutput | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setIsPending(true)
      setError(null)
      setIsSuccess(false)

      try {
        const result = await mutationFn(input)
        setData(result)
        setIsSuccess(true)
        onSuccess?.(result, input)
        onSettled?.(result, null, input)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error, input)
        onSettled?.(null, error, input)
        throw error
      } finally {
        setIsPending(false)
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsPending(false)
    setIsSuccess(false)
  }, [])

  return [
    { data, isPending, error, isSuccess },
    { mutate, reset },
  ]
}

// ============================================================================
// Helper: Generate temporary IDs for optimistic items
// ============================================================================

let tempIdCounter = 0

/**
 * Generate a temporary ID for optimistic items.
 * Use this when creating new items before they're saved to the server.
 */
export function generateTempId(prefix = 'temp'): string {
  return `${prefix}_${Date.now()}_${++tempIdCounter}`
}

/**
 * Check if an ID is a temporary ID.
 */
export function isTempId(id: string | number, prefix = 'temp'): boolean {
  return typeof id === 'string' && id.startsWith(`${prefix}_`)
}
