'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Lock, Loader2 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { addCommentAction } from './comment-actions'
import { useRealtime } from '@/hooks/use-realtime'
import { EmojiReactions, Reaction } from '@/components/ui/emoji-reactions'
import { MentionsInput, MentionHighlight, MentionUser } from '@/components/ui/mentions-input'
import { Avatar } from '@/components/ui/avatar-upload'
import { TypingIndicator } from '@/components/ui/typing-indicator'

type UserRole = 'ADMIN' | 'CLIENT_USER'

interface CommentReaction {
  emoji: string
  userId: string
}

interface CommentType {
  id: string
  content: string
  visibility: 'PUBLIC' | 'INTERNAL'
  createdAt: Date | string
  authorId: string
  ticketId?: string | null
  projectId?: string | null
  reactions?: CommentReaction[]
}

interface CommentsListProps {
  comments: (CommentType & { author: { id: string; name: string; role: UserRole; avatarUrl?: string | null } })[]
  ticketId?: string
  projectId?: string
  isAdmin: boolean
  currentUserId: string
  currentUserName: string
  users?: MentionUser[]
}

export function CommentsList({
  comments: initialComments,
  ticketId,
  projectId,
  isAdmin,
  currentUserId,
  currentUserName,
  users = [],
}: CommentsListProps) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [reactionsMap, setReactionsMap] = useState<Record<string, Reaction[]>>({})
  const [typingUsers, setTypingUsers] = useState<Array<{ name: string; avatarUrl?: string | null }>>([])

  // Simulate typing indicator (in production, this would come from WebSocket)
  useEffect(() => {
    // Clear typing when user submits
    if (content.length > 0) {
      // Broadcast that current user is typing (would use WebSocket)
    }
  }, [content])

  // Update comments when props change
  useEffect(() => {
    setComments(initialComments)
    // Initialize reactions map
    const newMap: Record<string, Reaction[]> = {}
    initialComments.forEach(comment => {
      if (comment.reactions) {
        newMap[comment.id] = groupReactions(comment.reactions, currentUserId)
      }
    })
    setReactionsMap(newMap)
  }, [initialComments, currentUserId])

  // Group reactions by emoji
  function groupReactions(reactions: CommentReaction[], userId: string): Reaction[] {
    const grouped = reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        }
      }
      acc[r.emoji].count++
      acc[r.emoji].users.push(r.userId)
      if (r.userId === userId) {
        acc[r.emoji].hasReacted = true
      }
      return acc
    }, {} as Record<string, Reaction>)
    return Object.values(grouped)
  }

  // Handle reaction
  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })

      if (res.ok) {
        // Optimistically update UI
        setReactionsMap(prev => {
          const current = prev[commentId] || []
          const existing = current.find(r => r.emoji === emoji)

          if (existing?.hasReacted) {
            // Remove reaction
            const updated = current.map(r => {
              if (r.emoji === emoji) {
                return {
                  ...r,
                  count: r.count - 1,
                  hasReacted: false,
                  users: r.users.filter(u => u !== currentUserId),
                }
              }
              return r
            }).filter(r => r.count > 0)
            return { ...prev, [commentId]: updated }
          } else if (existing) {
            // Add to existing reaction
            const updated = current.map(r => {
              if (r.emoji === emoji) {
                return {
                  ...r,
                  count: r.count + 1,
                  hasReacted: true,
                  users: [...r.users, currentUserId],
                }
              }
              return r
            })
            return { ...prev, [commentId]: updated }
          } else {
            // New reaction
            return {
              ...prev,
              [commentId]: [
                ...current,
                { emoji, count: 1, users: [currentUserId], hasReacted: true },
              ],
            }
          }
        })
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  // Listen for real-time comment updates
  const handleRealtimeEvent = useCallback((event: { type: string; data?: any }) => {
    if (event.type !== 'notification' || !event.data) return

    const eventData = event.data
    if (eventData.type === 'COMMENT_ADDED' && eventData.comment) {
      const newComment = eventData.comment
      if (
        (projectId && newComment.projectId === projectId) ||
        (ticketId && newComment.ticketId === ticketId)
      ) {
        setComments(prev => {
          if (prev.some(c => c.id === newComment.id)) return prev
          return [newComment, ...prev]
        })
      }
    }
  }, [projectId, ticketId])

  useRealtime(handleRealtimeEvent)

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!content.trim()) return

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('content', content)
      formData.append('visibility', isInternal ? 'INTERNAL' : 'PUBLIC')
      if (ticketId) formData.append('ticketId', ticketId)
      if (projectId) formData.append('projectId', projectId)

      await addCommentAction(formData)
      setContent('')
      router.refresh()
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Comment form with mentions */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-gray-100 dark:border-gray-800">
        <MentionsInput
          value={content}
          onChange={setContent}
          users={users}
          placeholder="Napisz komentarz... Użyj @ aby wspomnieć kogoś"
          onSubmit={handleSubmit}
          disabled={isLoading}
        />
        <div className="flex items-center justify-between mt-3">
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <Lock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Notatka wewnętrzna (niewidoczna dla klienta)</span>
            </label>
          )}
          {!isAdmin && <div />}
          <button
            type="submit"
            disabled={isLoading || !content.trim()}
            className="btn-primary btn-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Wyślij
              </>
            )}
          </button>
        </div>
      </form>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} className="px-4 py-2 border-b border-gray-100 dark:border-gray-800" />
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Brak komentarzy
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-start gap-3">
                <Avatar
                  src={comment.author.avatarUrl}
                  name={comment.author.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {comment.author.name}
                    </span>
                    {comment.author.role === 'ADMIN' && (
                      <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs">
                        Admin
                      </span>
                    )}
                    {comment.visibility === 'INTERNAL' && (
                      <span className="badge bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Wewnętrzna
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    <MentionHighlight
                      text={comment.content}
                      mentionedUsers={users}
                    />
                  </div>

                  {/* Emoji reactions */}
                  <div className="mt-2">
                    <EmojiReactions
                      reactions={reactionsMap[comment.id] || []}
                      onReact={(emoji) => handleReaction(comment.id, emoji)}
                      onRemoveReaction={(emoji) => handleReaction(comment.id, emoji)}
                      currentUserName={currentUserName}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
