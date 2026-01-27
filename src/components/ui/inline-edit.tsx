'use client'

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  FocusEvent,
  ChangeEvent,
  HTMLAttributes,
  TextareaHTMLAttributes,
  InputHTMLAttributes,
} from 'react'
import { Check, X, Loader2, Pencil, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type InlineEditVariant = 'text' | 'textarea'
type InlineEditSize = 'sm' | 'md' | 'lg'

interface ValidationResult {
  valid: boolean
  message?: string
}

type ValidateFn = (value: string) => ValidationResult | Promise<ValidationResult>

interface InlineEditBaseProps {
  /** Current value */
  value: string
  /** Callback when value is saved */
  onSave: (value: string) => void | Promise<void>
  /** Callback when edit is cancelled */
  onCancel?: () => void
  /** Placeholder text when empty */
  placeholder?: string
  /** Disable editing */
  disabled?: boolean
  /** Show loading state */
  isLoading?: boolean
  /** Auto-save on blur (default: true) */
  saveOnBlur?: boolean
  /** Validation function */
  validate?: ValidateFn
  /** Minimum length for value */
  minLength?: number
  /** Maximum length for value */
  maxLength?: number
  /** Size variant */
  size?: InlineEditSize
  /** Show edit icon on hover */
  showEditIcon?: boolean
  /** Show confirmation buttons */
  showButtons?: boolean
  /** Custom className for display mode */
  displayClassName?: string
  /** Custom className for edit mode */
  editClassName?: string
  /** Empty state text */
  emptyText?: string
  /** Start in edit mode */
  startInEditMode?: boolean
  /** Trim whitespace on save */
  trimOnSave?: boolean
  /** Select all text when entering edit mode */
  selectAllOnEdit?: boolean
}

// Props that should not be passed to native input/textarea
type OmittedNativeProps = 'value' | 'onSave' | 'size' | 'onCancel' | 'rows'

interface InlineEditTextProps
  extends InlineEditBaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, OmittedNativeProps> {
  variant?: 'text'
}

interface InlineEditTextareaProps
  extends InlineEditBaseProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, OmittedNativeProps> {
  variant: 'textarea'
  /** Number of rows for textarea */
  rows?: number
  /** Auto-resize textarea */
  autoResize?: boolean
}

type InlineEditProps = InlineEditTextProps | InlineEditTextareaProps

// ============================================================================
// Style Maps
// ============================================================================

const sizeClasses: Record<InlineEditSize, { text: string; input: string; icon: string }> = {
  sm: {
    text: 'text-sm',
    input: 'px-2 py-1 text-sm',
    icon: 'w-3 h-3',
  },
  md: {
    text: 'text-base',
    input: 'px-3 py-2 text-base',
    icon: 'w-4 h-4',
  },
  lg: {
    text: 'text-lg',
    input: 'px-4 py-3 text-lg',
    icon: 'w-5 h-5',
  },
}

// ============================================================================
// InlineEdit Component
// ============================================================================

export const InlineEdit = forwardRef<HTMLDivElement, InlineEditProps>((props, ref) => {
  const {
    value,
    onSave,
    onCancel,
    placeholder = 'Click to edit...',
    disabled = false,
    isLoading = false,
    saveOnBlur = true,
    validate,
    minLength,
    maxLength,
    size = 'md',
    showEditIcon = true,
    showButtons = true,
    displayClassName,
    editClassName,
    emptyText = 'Empty',
    startInEditMode = false,
    trimOnSave = true,
    selectAllOnEdit = true,
    variant = 'text',
    className,
    ...rest
  } = props

  const [isEditing, setIsEditing] = useState(startInEditMode)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const sizeStyles = sizeClasses[size]

  // Sync edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value)
    }
  }, [value, isEditing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (selectAllOnEdit && inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      } else if (selectAllOnEdit && inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.setSelectionRange(0, inputRef.current.value.length)
      }
    }
  }, [isEditing, selectAllOnEdit])

  // Auto-resize textarea
  useEffect(() => {
    if (
      variant === 'textarea' &&
      (props as InlineEditTextareaProps).autoResize &&
      inputRef.current instanceof HTMLTextAreaElement
    ) {
      const textarea = inputRef.current
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [editValue, variant, props])

  const validateValue = useCallback(
    async (val: string): Promise<ValidationResult> => {
      const trimmedVal = trimOnSave ? val.trim() : val

      // Built-in validation
      if (minLength !== undefined && trimmedVal.length < minLength) {
        return {
          valid: false,
          message: `Minimum ${minLength} characters required`,
        }
      }

      if (maxLength !== undefined && trimmedVal.length > maxLength) {
        return {
          valid: false,
          message: `Maximum ${maxLength} characters allowed`,
        }
      }

      // Custom validation
      if (validate) {
        return validate(trimmedVal)
      }

      return { valid: true }
    },
    [validate, minLength, maxLength, trimOnSave]
  )

  const handleSave = useCallback(async () => {
    const valueToSave = trimOnSave ? editValue.trim() : editValue

    // Skip if value hasn't changed
    if (valueToSave === value) {
      setIsEditing(false)
      setError(null)
      return
    }

    // Validate
    const validationResult = await validateValue(valueToSave)
    if (!validationResult.valid) {
      setError(validationResult.message || 'Invalid value')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(valueToSave)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, validateValue, onSave, trimOnSave])

  const handleCancel = useCallback(() => {
    setEditValue(value)
    setError(null)
    setIsEditing(false)
    onCancel?.()
  }, [value, onCancel])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      } else if (e.key === 'Enter') {
        // For text input, save on Enter
        // For textarea, save on Ctrl/Cmd + Enter
        if (variant === 'text' || (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          handleSave()
        }
      }
    },
    [handleCancel, handleSave, variant]
  )

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Check if the related target is within our container (buttons)
      if (containerRef.current?.contains(e.relatedTarget as Node)) {
        return
      }

      if (saveOnBlur && !isSaving) {
        handleSave()
      }
    },
    [saveOnBlur, isSaving, handleSave]
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setEditValue(e.target.value)
      setError(null)
    },
    []
  )

  const enterEditMode = useCallback(() => {
    if (!disabled && !isLoading) {
      setIsEditing(true)
    }
  }, [disabled, isLoading])

  // Display mode
  if (!isEditing) {
    return (
      <div
        ref={ref}
        className={cn(
          'group relative inline-flex items-center gap-2 cursor-pointer rounded transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          disabled && 'cursor-not-allowed opacity-50',
          isLoading && 'cursor-wait',
          className
        )}
        onClick={enterEditMode}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            enterEditMode()
          }
        }}
        aria-label={`Edit: ${value || emptyText}`}
      >
        <span
          className={cn(
            sizeStyles.text,
            'py-1 px-2',
            !value && 'text-gray-400 dark:text-gray-500 italic',
            displayClassName
          )}
        >
          {value || emptyText}
        </span>

        {isLoading && (
          <Loader2 className={cn(sizeStyles.icon, 'animate-spin text-gray-400')} />
        )}

        {showEditIcon && !isLoading && !disabled && (
          <Pencil
            className={cn(
              sizeStyles.icon,
              'text-gray-400 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
      </div>
    )
  }

  // Edit mode
  const inputProps = {
    ref: inputRef as any,
    value: editValue,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    disabled: isSaving,
    placeholder,
    maxLength,
    className: cn(
      'w-full border rounded-lg transition-colors',
      'bg-white dark:bg-gray-900',
      'border-gray-300 dark:border-gray-600',
      'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      sizeStyles.input,
      editClassName
    ),
    'aria-invalid': !!error,
    'aria-describedby': error ? 'inline-edit-error' : undefined,
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="flex items-start gap-2">
        {variant === 'textarea' ? (
          <textarea
            {...inputProps}
            rows={(props as InlineEditTextareaProps).rows || 3}
          />
        ) : (
          <input
            type="text"
            {...inputProps}
          />
        )}

        {showButtons && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="Save"
            >
              {isSaving ? (
                <Loader2 className={cn(sizeStyles.icon, 'animate-spin')} />
              ) : (
                <Check className={sizeStyles.icon} />
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="Cancel"
            >
              <X className={sizeStyles.icon} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          id="inline-edit-error"
          className="flex items-center gap-1 mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {maxLength && (
        <div className="flex justify-end mt-1">
          <span
            className={cn(
              'text-xs',
              editValue.length > maxLength * 0.9
                ? 'text-red-500'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {editValue.length} / {maxLength}
          </span>
        </div>
      )}
    </div>
  )
})

InlineEdit.displayName = 'InlineEdit'

// ============================================================================
// InlineEditText - Convenience wrapper for text input
// ============================================================================

export function InlineEditText(
  props: Omit<InlineEditTextProps, 'variant'>
) {
  return <InlineEdit {...props} variant="text" />
}

// ============================================================================
// InlineEditTextarea - Convenience wrapper for textarea
// ============================================================================

export function InlineEditTextarea(
  props: Omit<InlineEditTextareaProps, 'variant'>
) {
  return <InlineEdit {...props} variant="textarea" />
}

// ============================================================================
// InlineEditTitle - Pre-styled for titles/headings
// ============================================================================

interface InlineEditTitleProps extends Omit<InlineEditTextProps, 'variant' | 'size'> {
  level?: 'h1' | 'h2' | 'h3' | 'h4'
}

const titleStyles = {
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-bold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-semibold',
}

export function InlineEditTitle({
  level = 'h2',
  displayClassName,
  editClassName,
  ...props
}: InlineEditTitleProps) {
  return (
    <InlineEdit
      {...props}
      variant="text"
      size="lg"
      displayClassName={cn(titleStyles[level], displayClassName)}
      editClassName={cn(titleStyles[level], editClassName)}
    />
  )
}

// ============================================================================
// useInlineEdit - Hook for managing inline edit state
// ============================================================================

interface UseInlineEditOptions {
  initialValue: string
  onSave: (value: string) => void | Promise<void>
  validate?: ValidateFn
}

export function useInlineEdit({ initialValue, onSave, validate }: UseInlineEditOptions) {
  const [value, setValue] = useState(initialValue)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(
    async (newValue: string) => {
      if (validate) {
        const result = await validate(newValue)
        if (!result.valid) {
          setError(result.message || 'Invalid value')
          return
        }
      }

      setIsSaving(true)
      setError(null)

      try {
        await onSave(newValue)
        setValue(newValue)
        setIsEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setIsSaving(false)
      }
    },
    [onSave, validate]
  )

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setError(null)
  }, [])

  const startEditing = useCallback(() => {
    setIsEditing(true)
  }, [])

  return {
    value,
    isEditing,
    isSaving,
    error,
    handleSave,
    handleCancel,
    startEditing,
    setValue,
  }
}
