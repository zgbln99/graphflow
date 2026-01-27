'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from './avatar-upload'

// ============================================
// Types
// ============================================

export interface MentionUser {
  id: string
  name: string
  email?: string
  avatarUrl?: string | null
}

interface MentionsInputProps {
  value: string
  onChange: (value: string) => void
  users: MentionUser[]
  placeholder?: string
  className?: string
  disabled?: boolean
  onSubmit?: () => void
  minHeight?: number
  maxHeight?: number
}

interface MentionSuggestion {
  user: MentionUser
  index: number
}

// ============================================
// MentionsInput Component
// ============================================

export function MentionsInput({
  value,
  onChange,
  users,
  placeholder = 'Napisz komentarz... Użyj @ aby wspomnieć kogoś',
  className,
  disabled = false,
  onSubmit,
  minHeight = 80,
  maxHeight = 200,
}: MentionsInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<MentionUser[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [suggestionsPosition, setSuggestionsPosition] = useState({ top: 0, left: 0 })

  // Filter users based on query
  useEffect(() => {
    if (mentionQuery) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
      setSuggestions(filtered)
      setSelectedIndex(0)
    } else if (showSuggestions) {
      setSuggestions(users.slice(0, 5))
      setSelectedIndex(0)
    }
  }, [mentionQuery, users, showSuggestions])

  // Calculate suggestions position
  const updateSuggestionsPosition = useCallback(() => {
    if (!textareaRef.current || mentionStart === null) return

    const textarea = textareaRef.current
    const textBeforeCursor = value.substring(0, mentionStart)

    // Create a hidden div to measure text position
    const mirror = document.createElement('div')
    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: ${getComputedStyle(textarea).fontFamily};
      font-size: ${getComputedStyle(textarea).fontSize};
      line-height: ${getComputedStyle(textarea).lineHeight};
      padding: ${getComputedStyle(textarea).padding};
      width: ${textarea.clientWidth}px;
    `
    mirror.textContent = textBeforeCursor

    document.body.appendChild(mirror)
    const mirrorRect = mirror.getBoundingClientRect()
    document.body.removeChild(mirror)

    const textareaRect = textarea.getBoundingClientRect()
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
    const lines = textBeforeCursor.split('\n')
    const currentLineIndex = lines.length - 1

    setSuggestionsPosition({
      top: (currentLineIndex + 1) * lineHeight + 8,
      left: 0,
    })
  }, [value, mentionStart])

  // Handle text change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart

    onChange(newValue)

    // Check if we're typing a mention
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if there's no space after @ (we're still typing the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionStart(lastAtIndex)
        setMentionQuery(textAfterAt)
        setShowSuggestions(true)
        updateSuggestionsPosition()
        return
      }
    }

    setShowSuggestions(false)
    setMentionStart(null)
    setMentionQuery('')
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % suggestions.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
          break
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault()
            selectUser(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          setShowSuggestions(false)
          break
        case 'Tab':
          e.preventDefault()
          selectUser(suggestions[selectedIndex])
          break
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSubmit?.()
    }
  }

  // Select a user from suggestions
  const selectUser = (user: MentionUser) => {
    if (mentionStart === null || !textareaRef.current) return

    const beforeMention = value.substring(0, mentionStart)
    const afterMention = value.substring(textareaRef.current.selectionStart)
    const newValue = `${beforeMention}@${user.name} ${afterMention}`

    onChange(newValue)
    setShowSuggestions(false)
    setMentionStart(null)
    setMentionQuery('')

    // Focus and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + user.name.length + 2
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(
        Math.max(textareaRef.current.scrollHeight, minHeight),
        maxHeight
      )
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [value, minHeight, maxHeight])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 border rounded-lg resize-none',
          'border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800',
          'text-gray-900 dark:text-white',
          'placeholder-gray-400 dark:placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-200'
        )}
        style={{ minHeight }}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden animate-fade-in"
          style={{ top: suggestionsPosition.top }}
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                index === selectedIndex
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <Avatar
                src={user.avatarUrl}
                name={user.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </div>
                {user.email && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
        <span>Wpisz @ aby wspomnieć kogoś</span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span>Ctrl+Enter aby wysłać</span>
      </div>
    </div>
  )
}

// ============================================
// MentionHighlight - renders text with highlighted mentions
// ============================================

interface MentionHighlightProps {
  text: string
  mentionedUsers?: MentionUser[]
  onMentionClick?: (user: MentionUser) => void
  className?: string
}

export function MentionHighlight({
  text,
  mentionedUsers = [],
  onMentionClick,
  className,
}: MentionHighlightProps) {
  // Parse mentions in text
  const parts = text.split(/(@\w+(?:\s\w+)?)/g)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const mentionName = part.substring(1)
          const user = mentionedUsers.find(
            u => u.name.toLowerCase() === mentionName.toLowerCase()
          )

          return (
            <span
              key={index}
              onClick={() => user && onMentionClick?.(user)}
              className={cn(
                'inline-flex items-center px-1 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium',
                onMentionClick && user && 'cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-900/50'
              )}
            >
              {part}
            </span>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}

// ============================================
// useMentions hook - parse and extract mentions
// ============================================

export function useMentions(text: string, users: MentionUser[]) {
  const [mentions, setMentions] = useState<MentionUser[]>([])

  useEffect(() => {
    // Extract all @mentions from text
    const mentionPattern = /@(\w+(?:\s\w+)?)/g
    const foundMentions: MentionUser[] = []
    let match

    while ((match = mentionPattern.exec(text)) !== null) {
      const mentionName = match[1]
      const user = users.find(
        u => u.name.toLowerCase() === mentionName.toLowerCase()
      )
      if (user && !foundMentions.find(m => m.id === user.id)) {
        foundMentions.push(user)
      }
    }

    setMentions(foundMentions)
  }, [text, users])

  return {
    mentions,
    hasMentions: mentions.length > 0,
    getMentionedIds: () => mentions.map(m => m.id),
  }
}

// ============================================
// Quick Mention Picker (inline)
// ============================================

interface QuickMentionPickerProps {
  users: MentionUser[]
  onSelect: (user: MentionUser) => void
  className?: string
}

export function QuickMentionPicker({
  users,
  onSelect,
  className,
}: QuickMentionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredUsers = search
    ? users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
      >
        <span className="font-bold">@</span>
        <span>Wspomnij</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 animate-fade-in">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj użytkownika..."
              className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>

          {/* Users list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                Nie znaleziono użytkowników
              </div>
            ) : (
              filteredUsers.slice(0, 8).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onSelect(user)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Avatar
                    src={user.avatarUrl}
                    name={user.name}
                    size="xs"
                  />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MentionsInput
