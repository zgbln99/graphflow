'use client'

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { LucideIcon } from 'lucide-react'

// Types
interface MenuItem {
  id: string
  label: string
  icon?: LucideIcon
  shortcut?: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  danger?: boolean
  divider?: boolean
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  items: MenuItem[]
}

interface ContextMenuContextType {
  openMenu: (x: number, y: number, items: MenuItem[]) => void
  closeMenu: () => void
}

// Context
const ContextMenuContext = createContext<ContextMenuContextType | null>(null)

export function useContextMenu() {
  const context = useContext(ContextMenuContext)
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider')
  }
  return context
}

// Provider component
export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
  })
  const menuRef = useRef<HTMLDivElement>(null)

  const openMenu = useCallback((x: number, y: number, items: MenuItem[]) => {
    // Adjust position if menu would go off screen
    const menuWidth = 200
    const menuHeight = items.length * 40
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y

    setState({
      isOpen: true,
      x: Math.max(0, adjustedX),
      y: Math.max(0, adjustedY),
      items,
    })
  }, [])

  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }

    const handleScroll = () => closeMenu()

    if (state.isOpen) {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [state.isOpen, closeMenu])

  return (
    <ContextMenuContext.Provider value={{ openMenu, closeMenu }}>
      {children}
      {state.isOpen && (
        <div
          ref={menuRef}
          className="fixed z-[100] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: state.x, top: state.y }}
        >
          {state.items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="h-px bg-gray-200 dark:bg-gray-700 my-1"
                />
              )
            }

            const Icon = item.icon

            if (item.href) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    item.disabled
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : item.danger
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                      {item.shortcut}
                    </span>
                  )}
                </a>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.()
                    closeMenu()
                  }
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  item.disabled
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : item.danger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span className="flex-1 text-left">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {item.shortcut}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </ContextMenuContext.Provider>
  )
}

// Hook for easy context menu attachment
interface UseContextMenuTriggerOptions {
  items: MenuItem[]
}

export function useContextMenuTrigger({ items }: UseContextMenuTriggerOptions) {
  const { openMenu } = useContextMenu()

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      openMenu(e.clientX, e.clientY, items)
    },
    [openMenu, items]
  )

  return { onContextMenu }
}
