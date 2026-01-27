'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Camera, Loader2, User, X, Upload, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  currentAvatar?: string | null
  name: string
  onUpload: (file: File) => Promise<string | void>
  onRemove?: () => Promise<void>
  size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
}

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

export function AvatarUpload({
  currentAvatar,
  name,
  onUpload,
  onRemove,
  size = 'lg',
  editable = true,
  className,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Proszę wybrać plik graficzny')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Plik jest za duży (max 5MB)')
      return
    }

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (error) {
      console.error('Upload failed:', error)
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }, [onUpload])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemove = async () => {
    if (!onRemove) return

    setIsUploading(true)
    try {
      await onRemove()
      setPreviewUrl(null)
    } catch (error) {
      console.error('Remove failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const displayUrl = previewUrl || currentAvatar
  const initials = getInitials(name)
  const bgColor = getColorFromName(name)

  return (
    <div className={cn('relative inline-block', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        className={cn(
          'relative rounded-full overflow-hidden transition-all duration-300',
          sizeClasses[size],
          editable && 'cursor-pointer',
          dragActive && 'ring-4 ring-primary-500 ring-offset-2',
          isHovering && editable && 'ring-2 ring-primary-400 ring-offset-2'
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onDragEnter={editable ? handleDrag : undefined}
        onDragLeave={editable ? handleDrag : undefined}
        onDragOver={editable ? handleDrag : undefined}
        onDrop={editable ? handleDrop : undefined}
        onClick={() => editable && inputRef.current?.click()}
      >
        {/* Avatar image or initials */}
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={name}
            fill
            className="object-cover"
            sizes={size === 'xl' ? '128px' : size === 'lg' ? '96px' : size === 'md' ? '64px' : '40px'}
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center text-white font-semibold',
              bgColor,
              size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'
            )}
          >
            {initials}
          </div>
        )}

        {/* Hover overlay */}
        {editable && (
          <div
            className={cn(
              'absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200',
              isHovering || dragActive ? 'opacity-100' : 'opacity-0'
            )}
          >
            {isUploading ? (
              <Loader2 className={cn('text-white animate-spin', iconSizes[size])} />
            ) : (
              <Camera className={cn('text-white', iconSizes[size])} />
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      {editable && displayUrl && onRemove && !isUploading && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleRemove()
          }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          title="Usuń avatar"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ============================================
// Simple Avatar Display (non-editable)
// ============================================

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showStatus?: boolean
  status?: 'online' | 'offline' | 'away' | 'busy'
}

const displaySizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
}

export function Avatar({
  src,
  name,
  size = 'md',
  className,
  showStatus = false,
  status = 'offline',
}: AvatarProps) {
  const initials = getInitials(name)
  const bgColor = getColorFromName(name)

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center',
          displaySizes[size]
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center text-white font-medium',
              bgColor
            )}
          >
            {initials}
          </div>
        )}
      </div>

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-900',
            statusColors[status],
            size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
          )}
        />
      )}
    </div>
  )
}

// ============================================
// Avatar Group (stacked avatars)
// ============================================

interface AvatarGroupProps {
  users: Array<{ name: string; avatarUrl?: string | null }>
  max?: number
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export function AvatarGroup({ users, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max)
  const remaining = users.length - max

  return (
    <div className={cn('flex -space-x-2', className)}>
      {displayUsers.map((user, index) => (
        <div
          key={index}
          className="relative ring-2 ring-white dark:ring-gray-900 rounded-full"
          style={{ zIndex: displayUsers.length - index }}
        >
          <Avatar
            src={user.avatarUrl}
            name={user.name}
            size={size}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'relative rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium ring-2 ring-white dark:ring-gray-900',
            displaySizes[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}

export default AvatarUpload
