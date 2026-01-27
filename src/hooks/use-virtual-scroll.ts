'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

interface VirtualScrollOptions {
  /** Total number of items in the list */
  itemCount: number
  /** Height of each item in pixels (or function for variable heights) */
  itemHeight: number | ((index: number) => number)
  /** Number of items to render above and below the visible area (default: 5) */
  overscan?: number
  /** Height of the container in pixels (auto-detected if not provided) */
  containerHeight?: number
  /** Callback when scroll position changes */
  onScroll?: (scrollTop: number) => void
  /** Enable smooth scrolling behavior */
  smoothScroll?: boolean
}

interface VirtualItem {
  /** Index of the item in the original array */
  index: number
  /** Start position (top) in pixels */
  start: number
  /** Size of the item in pixels */
  size: number
  /** End position (bottom) in pixels */
  end: number
}

interface VirtualScrollState {
  /** Array of virtual items to render */
  virtualItems: VirtualItem[]
  /** Total height of all items */
  totalHeight: number
  /** Current scroll offset */
  scrollOffset: number
  /** First visible item index */
  startIndex: number
  /** Last visible item index */
  endIndex: number
  /** Whether the list is at the top */
  isAtTop: boolean
  /** Whether the list is at the bottom */
  isAtBottom: boolean
}

interface VirtualScrollActions {
  /** Scroll to a specific item index */
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end'; smooth?: boolean }) => void
  /** Scroll to a specific offset */
  scrollToOffset: (offset: number, options?: { smooth?: boolean }) => void
  /** Scroll to top */
  scrollToTop: (options?: { smooth?: boolean }) => void
  /** Scroll to bottom */
  scrollToBottom: (options?: { smooth?: boolean }) => void
  /** Measure the container and update dimensions */
  measure: () => void
}

type UseVirtualScrollReturn = [
  /** Ref to attach to the scroll container */
  React.RefObject<HTMLDivElement>,
  VirtualScrollState,
  VirtualScrollActions
]

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for virtualizing long lists to improve performance.
 * Only renders items that are visible in the viewport.
 *
 * @example
 * ```tsx
 * function VirtualList({ items }) {
 *   const [containerRef, { virtualItems, totalHeight }] = useVirtualScroll({
 *     itemCount: items.length,
 *     itemHeight: 50,
 *     overscan: 3,
 *   })
 *
 *   return (
 *     <div ref={containerRef} style={{ height: '400px', overflow: 'auto' }}>
 *       <div style={{ height: totalHeight, position: 'relative' }}>
 *         {virtualItems.map((virtualItem) => (
 *           <div
 *             key={virtualItem.index}
 *             style={{
 *               position: 'absolute',
 *               top: virtualItem.start,
 *               height: virtualItem.size,
 *               width: '100%',
 *             }}
 *           >
 *             {items[virtualItem.index]}
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useVirtualScroll(options: VirtualScrollOptions): UseVirtualScrollReturn {
  const {
    itemCount,
    itemHeight,
    overscan = 5,
    containerHeight: providedContainerHeight,
    onScroll,
    smoothScroll = false,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [containerHeight, setContainerHeight] = useState(providedContainerHeight || 0)

  // Calculate item sizes and positions
  const { itemSizes, itemPositions, totalHeight } = useMemo(() => {
    const sizes: number[] = []
    const positions: number[] = []
    let offset = 0

    for (let i = 0; i < itemCount; i++) {
      const size = typeof itemHeight === 'function' ? itemHeight(i) : itemHeight
      sizes.push(size)
      positions.push(offset)
      offset += size
    }

    return {
      itemSizes: sizes,
      itemPositions: positions,
      totalHeight: offset,
    }
  }, [itemCount, itemHeight])

  // Find the start index using binary search
  const findStartIndex = useCallback(
    (offset: number): number => {
      let low = 0
      let high = itemCount - 1

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const pos = itemPositions[mid]

        if (pos < offset) {
          low = mid + 1
        } else if (pos > offset) {
          high = mid - 1
        } else {
          return mid
        }
      }

      return Math.max(0, low - 1)
    },
    [itemCount, itemPositions]
  )

  // Calculate visible range
  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    if (containerHeight === 0 || itemCount === 0) {
      return { startIndex: 0, endIndex: 0, virtualItems: [] }
    }

    const rawStartIndex = findStartIndex(scrollOffset)
    const start = Math.max(0, rawStartIndex - overscan)

    let visibleEnd = rawStartIndex
    let accumulatedHeight = 0
    while (visibleEnd < itemCount && accumulatedHeight < containerHeight) {
      accumulatedHeight += itemSizes[visibleEnd]
      visibleEnd++
    }

    const end = Math.min(itemCount - 1, visibleEnd + overscan)

    const items: VirtualItem[] = []
    for (let i = start; i <= end; i++) {
      items.push({
        index: i,
        start: itemPositions[i],
        size: itemSizes[i],
        end: itemPositions[i] + itemSizes[i],
      })
    }

    return {
      startIndex: start,
      endIndex: end,
      virtualItems: items,
    }
  }, [scrollOffset, containerHeight, itemCount, itemSizes, itemPositions, overscan, findStartIndex])

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const newOffset = container.scrollTop
      setScrollOffset(newOffset)
      onScroll?.(newOffset)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [onScroll])

  // Measure container height
  const measure = useCallback(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight)
    }
  }, [])

  // Auto-measure on mount and resize
  useEffect(() => {
    measure()

    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      measure()
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [measure])

  // Update container height if provided
  useEffect(() => {
    if (providedContainerHeight) {
      setContainerHeight(providedContainerHeight)
    }
  }, [providedContainerHeight])

  // Scroll actions
  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end'; smooth?: boolean }) => {
      const container = containerRef.current
      if (!container || index < 0 || index >= itemCount) return

      const { align = 'start', smooth = smoothScroll } = options || {}
      const itemStart = itemPositions[index]
      const itemSize = itemSizes[index]

      let targetOffset: number
      switch (align) {
        case 'center':
          targetOffset = itemStart - containerHeight / 2 + itemSize / 2
          break
        case 'end':
          targetOffset = itemStart - containerHeight + itemSize
          break
        case 'start':
        default:
          targetOffset = itemStart
      }

      targetOffset = Math.max(0, Math.min(targetOffset, totalHeight - containerHeight))

      container.scrollTo({
        top: targetOffset,
        behavior: smooth ? 'smooth' : 'auto',
      })
    },
    [itemCount, itemPositions, itemSizes, containerHeight, totalHeight, smoothScroll]
  )

  const scrollToOffset = useCallback(
    (offset: number, options?: { smooth?: boolean }) => {
      const container = containerRef.current
      if (!container) return

      const { smooth = smoothScroll } = options || {}
      container.scrollTo({
        top: offset,
        behavior: smooth ? 'smooth' : 'auto',
      })
    },
    [smoothScroll]
  )

  const scrollToTop = useCallback(
    (options?: { smooth?: boolean }) => {
      scrollToOffset(0, options)
    },
    [scrollToOffset]
  )

  const scrollToBottom = useCallback(
    (options?: { smooth?: boolean }) => {
      scrollToOffset(totalHeight - containerHeight, options)
    },
    [scrollToOffset, totalHeight, containerHeight]
  )

  // State object
  const state: VirtualScrollState = useMemo(
    () => ({
      virtualItems,
      totalHeight,
      scrollOffset,
      startIndex,
      endIndex,
      isAtTop: scrollOffset <= 0,
      isAtBottom: scrollOffset >= totalHeight - containerHeight - 1,
    }),
    [virtualItems, totalHeight, scrollOffset, startIndex, endIndex, containerHeight]
  )

  // Actions object
  const actions: VirtualScrollActions = useMemo(
    () => ({
      scrollToIndex,
      scrollToOffset,
      scrollToTop,
      scrollToBottom,
      measure,
    }),
    [scrollToIndex, scrollToOffset, scrollToTop, scrollToBottom, measure]
  )

  return [containerRef, state, actions]
}

// ============================================================================
// VirtualList Component
// ============================================================================

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of each item (fixed or function for variable heights) */
  itemHeight: number | ((index: number, item: T) => number)
  /** Render function for each item */
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  /** Container height in pixels */
  height?: number | string
  /** Container width */
  width?: number | string
  /** Container className */
  className?: string
  /** Number of overscan items */
  overscan?: number
  /** Callback when scroll changes */
  onScroll?: (scrollTop: number) => void
  /** Key extractor for items */
  keyExtractor?: (item: T, index: number) => string | number
  /** Empty state component */
  emptyComponent?: React.ReactNode
  /** Loading state */
  isLoading?: boolean
  /** Loading component */
  loadingComponent?: React.ReactNode
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  height = 400,
  width = '100%',
  className = '',
  overscan = 5,
  onScroll,
  keyExtractor,
  emptyComponent,
  isLoading,
  loadingComponent,
}: VirtualListProps<T>) {
  const getItemHeight = useCallback(
    (index: number) => {
      if (typeof itemHeight === 'function') {
        return itemHeight(index, items[index])
      }
      return itemHeight
    },
    [itemHeight, items]
  )

  const [containerRef, { virtualItems, totalHeight }] = useVirtualScroll({
    itemCount: items.length,
    itemHeight: getItemHeight,
    overscan,
    onScroll,
  })

  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>
  }

  if (items.length === 0 && emptyComponent) {
    return <>{emptyComponent}</>
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          const key = keyExtractor
            ? keyExtractor(item, virtualItem.index)
            : virtualItem.index

          const style: React.CSSProperties = {
            position: 'absolute',
            top: virtualItem.start,
            height: virtualItem.size,
            width: '100%',
          }

          return (
            <div key={key} style={style}>
              {renderItem(item, virtualItem.index, style)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default useVirtualScroll
