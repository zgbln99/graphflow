'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Lock, Loader2 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { addCommentAction } from './comment-actions'
import { useRealtime } from '@/hooks/use-realtime'
import type { User, UserRole, Comment } from '@prisma/client'

interface CommentsListProps {
  comments: (Comment & { author: { id: string; name: string; role: UserRole } })[]
  ticketId?: string
  projectId?: string
  isAdmin: boolean
  currentUserId: string
}

export function CommentsList({
  comments: initialComments,
  ticketId,
  projectId,
  isAdmin,
  currentUserId,
}: CommentsListProps) {
  const router = useRouter()
  const [comments, setComments] = useState(initialComments)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  // Update comments when props change
  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  // Listen for real-time comment updates
  const handleRealtimeEvent = useCallback((event: { type: string; data?: any }) => {
    // Events come as { type: 'notification', data: { type: 'COMMENT_ADDED', ... } }
    if (event.type !== 'notification' || !event.data) return

    const eventData = event.data
    if (eventData.type === 'COMMENT_ADDED' && eventData.comment) {
      const newComment = eventData.comment
      // Check if this comment belongs to current project/ticket
      if (
        (projectId && newComment.projectId === projectId) ||
        (ticketId && newComment.ticketId === ticketId)
      ) {
        // Only add if not already in list
        setComments(prev => {
          if (prev.some(c => c.id === newComment.id)) return prev
          return [newComment, ...prev]
        })
      }
    }
  }, [projectId, ticketId])

  useRealtime(handleRealtimeEvent)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      {/* Comment form */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-gray-100">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Napisz komentarz..."
          rows={3}
          className="input mb-3"
        />
        <div className="flex items-center justify-between">
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <Lock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Notatka wewnętrzna (niewidoczna dla klienta)</span>
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

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Brak komentarzy
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary-700">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {comment.author.name}
                    </span>
                    {comment.author.role === 'ADMIN' && (
                      <span className="badge bg-primary-100 text-primary-700 text-xs">
                        Admin
                      </span>
                    )}
                    {comment.visibility === 'INTERNAL' && (
                      <span className="badge bg-yellow-100 text-yellow-700 text-xs flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Wewnętrzna
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
