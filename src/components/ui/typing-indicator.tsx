'use client'

import { cn } from '@/lib/utils'
import { Avatar } from './avatar-upload'

interface TypingIndicatorProps {
  users: Array<{ name: string; avatarUrl?: string | null }>
  className?: string
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const names = users.map(u => u.name)
  let text = ''

  if (names.length === 1) {
    text = `${names[0]} pisze`
  } else if (names.length === 2) {
    text = `${names[0]} i ${names[1]} piszą`
  } else if (names.length === 3) {
    text = `${names[0]}, ${names[1]} i ${names[2]} piszą`
  } else {
    text = `${names[0]}, ${names[1]} i ${names.length - 2} innych piszą`
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 animate-fade-in',
        className
      )}
    >
      {/* Avatars */}
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user, index) => (
          <div
            key={index}
            className="ring-2 ring-white dark:ring-gray-900 rounded-full"
          >
            <Avatar
              src={user.avatarUrl}
              name={user.name}
              size="xs"
            />
          </div>
        ))}
      </div>

      {/* Text */}
      <span>{text}</span>

      {/* Animated dots */}
      <span className="inline-flex gap-0.5">
        <span
          className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </span>
    </div>
  )
}

// ============================================
// Typing indicator bubble (for chat)
// ============================================

interface TypingBubbleProps {
  className?: string
}

export function TypingBubble({ className }: TypingBubbleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm',
        className
      )}
    >
      <span
        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}

export default TypingIndicator
