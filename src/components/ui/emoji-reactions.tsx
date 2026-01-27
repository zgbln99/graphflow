'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

export interface Reaction {
  emoji: string
  count: number
  users: string[]
  hasReacted: boolean
}

interface EmojiReactionsProps {
  reactions: Reaction[]
  onReact: (emoji: string) => void
  onRemoveReaction: (emoji: string) => void
  currentUserName: string
  size?: 'sm' | 'md'
  className?: string
}

// ============================================
// Available emojis
// ============================================

const EMOJI_OPTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👀', label: 'Looking' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '💯', label: '100' },
  { emoji: '✅', label: 'Done' },
  { emoji: '❌', label: 'No' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😢', label: 'Sad' },
]

// ============================================
// Emoji Picker
// ============================================

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  existingEmojis: string[]
}

function EmojiPicker({ onSelect, onClose, existingEmojis }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-[100] animate-pop-in"
      style={{ minWidth: '200px' }}
    >
      <div className="grid grid-cols-6 gap-1">
        {EMOJI_OPTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelect(emoji)
              onClose()
            }}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all hover:scale-110',
              existingEmojis.includes(emoji)
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            title={label}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Single Reaction Button
// ============================================

interface ReactionButtonProps {
  reaction: Reaction
  onClick: () => void
  size: 'sm' | 'md'
}

function ReactionButton({ reaction, onClick, size }: ReactionButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = () => {
    setIsAnimating(true)
    onClick()
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border transition-all',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        reaction.hasReacted
          ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-300'
          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700',
        isAnimating && 'scale-110'
      )}
      title={reaction.users.join(', ')}
    >
      <span className={cn('transition-transform', isAnimating && 'animate-bounce')}>
        {reaction.emoji}
      </span>
      <span className="font-medium">{reaction.count}</span>
    </button>
  )
}

// ============================================
// Main Component
// ============================================

export function EmojiReactions({
  reactions,
  onReact,
  onRemoveReaction,
  currentUserName,
  size = 'md',
  className,
}: EmojiReactionsProps) {
  const [showPicker, setShowPicker] = useState(false)

  const handleReactionClick = (reaction: Reaction) => {
    if (reaction.hasReacted) {
      onRemoveReaction(reaction.emoji)
    } else {
      onReact(reaction.emoji)
    }
  }

  const handleNewReaction = (emoji: string) => {
    onReact(emoji)
  }

  const existingEmojis = reactions.map(r => r.emoji)

  return (
    <div className={cn('flex items-center flex-wrap gap-1.5', className)}>
      {/* Existing reactions */}
      {reactions.map(reaction => (
        <ReactionButton
          key={reaction.emoji}
          reaction={reaction}
          onClick={() => handleReactionClick(reaction)}
          size={size}
        />
      ))}

      {/* Add reaction button */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowPicker(!showPicker)
          }}
          className={cn(
            'inline-flex items-center justify-center rounded-full border border-dashed transition-all',
            size === 'sm' ? 'w-6 h-6' : 'w-8 h-8',
            'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50',
            'dark:border-gray-600 dark:text-gray-500 dark:hover:border-gray-500 dark:hover:text-gray-400 dark:hover:bg-gray-800'
          )}
          title="Dodaj reakcję"
        >
          <Smile className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>

        {showPicker && (
          <EmojiPicker
            onSelect={handleNewReaction}
            onClose={() => setShowPicker(false)}
            existingEmojis={existingEmojis}
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// Quick Reaction Bar (inline)
// ============================================

interface QuickReactionBarProps {
  onReact: (emoji: string) => void
  className?: string
}

export function QuickReactionBar({ onReact, className }: QuickReactionBarProps) {
  const quickEmojis = ['👍', '❤️', '🎉', '🔥', '👀']

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 p-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {quickEmojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-125"
        >
          {emoji}
        </button>
      ))}
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
      <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <Plus className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  )
}

export default EmojiReactions
