'use client'

import { formatRelativeTime } from '@/lib/utils'
import { Avatar } from './avatar'
import {
  MessageSquare,
  FileUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  User,
  Tag,
  Mail,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
} from 'lucide-react'

type ActivityType =
  | 'comment'
  | 'file_upload'
  | 'status_change'
  | 'created'
  | 'updated'
  | 'assigned'
  | 'tagged'
  | 'email_sent'
  | 'completed'
  | 'viewed'
  | 'downloaded'
  | 'deleted'

interface Activity {
  id: string
  type: ActivityType
  user: {
    name: string
    email?: string
  }
  description: string
  metadata?: Record<string, any>
  timestamp: Date | string
}

interface ActivityFeedProps {
  activities: Activity[]
  showAvatar?: boolean
  compact?: boolean
  maxItems?: number
  className?: string
}

const activityIcons: Record<ActivityType, { icon: typeof MessageSquare; color: string }> = {
  comment: { icon: MessageSquare, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  file_upload: { icon: FileUp, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  status_change: { icon: RefreshCw, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  created: { icon: Plus, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
  updated: { icon: Edit, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  assigned: { icon: User, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
  tagged: { icon: Tag, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
  email_sent: { icon: Mail, color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  viewed: { icon: Eye, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  downloaded: { icon: Download, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' },
  deleted: { icon: Trash2, color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
}

export function ActivityFeed({
  activities,
  showAvatar = true,
  compact = false,
  maxItems,
  className = '',
}: ActivityFeedProps) {
  const displayActivities = maxItems ? activities.slice(0, maxItems) : activities

  if (displayActivities.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Brak aktywności</p>
      </div>
    )
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {displayActivities.map((activity, index) => {
        const { icon: Icon, color } = activityIcons[activity.type] || activityIcons.updated
        const isLast = index === displayActivities.length - 1

        return (
          <div
            key={activity.id}
            className={`
              flex gap-3 py-3
              ${!isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}
              ${compact ? 'py-2' : ''}
            `}
          >
            {/* Icon or Avatar */}
            <div className="flex-shrink-0">
              {showAvatar ? (
                <Avatar name={activity.user.name} email={activity.user.email} size="sm" showTooltip={false} />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-gray-900 dark:text-white ${compact ? 'text-sm' : ''}`}>
                <span className="font-medium">{activity.user.name}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{activity.description}</span>
              </p>

              {/* Metadata */}
              {activity.metadata && !compact && (
                <div className="mt-1">
                  {activity.metadata.oldStatus && activity.metadata.newStatus && (
                    <span className="text-sm">
                      <span className="text-gray-400 line-through">{activity.metadata.oldStatus}</span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        {activity.metadata.newStatus}
                      </span>
                    </span>
                  )}
                  {activity.metadata.filename && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.metadata.filename}
                    </span>
                  )}
                  {activity.metadata.comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      "{activity.metadata.comment}"
                    </p>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <p className={`text-gray-400 dark:text-gray-500 ${compact ? 'text-xs' : 'text-sm'} mt-0.5`}>
                {formatRelativeTime(new Date(activity.timestamp))}
              </p>
            </div>

            {/* Activity type icon (when showing avatar) */}
            {showAvatar && (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-3 h-3" />
              </div>
            )}
          </div>
        )
      })}

      {/* Show more link */}
      {maxItems && activities.length > maxItems && (
        <div className="pt-3 text-center">
          <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
            Zobacz wszystkie ({activities.length})
          </button>
        </div>
      )}
    </div>
  )
}

// Activity timeline - vertical with connecting line
interface ActivityTimelineProps {
  activities: Activity[]
  className?: string
}

export function ActivityTimeline({ activities, className = '' }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Brak aktywności</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-4">
        {activities.map((activity) => {
          const { icon: Icon, color } = activityIcons[activity.type] || activityIcons.updated

          return (
            <div key={activity.id} className="relative flex gap-4 pl-2">
              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <Avatar name={activity.user.name} email={activity.user.email} size="xs" showTooltip={false} />
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {activity.user.name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatRelativeTime(new Date(activity.timestamp))}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {activity.description}
                </p>
                {activity.metadata?.comment && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    {activity.metadata.comment}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
