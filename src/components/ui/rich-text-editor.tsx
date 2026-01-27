'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Image,
  Code,
  Quote,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Palette,
  Highlighter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================
// Types
// ============================================

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minHeight?: number
  maxHeight?: number
  toolbar?: ('basic' | 'formatting' | 'lists' | 'alignment' | 'media' | 'history')[]
  onImageUpload?: (file: File) => Promise<string>
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}

// ============================================
// Toolbar Button
// ============================================

function ToolbarButton({ icon, onClick, active, disabled, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        active && 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
      )}
    >
      {icon}
    </button>
  )
}

// ============================================
// Toolbar Divider
// ============================================

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
}

// ============================================
// Color Picker
// ============================================

const COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
]

interface ColorPickerProps {
  onSelect: (color: string) => void
  type: 'text' | 'highlight'
}

function ColorPicker({ onSelect, type }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={type === 'text' ? 'Kolor tekstu' : 'Podświetlenie'}
      >
        {type === 'text' ? (
          <Palette className="w-4 h-4" />
        ) : (
          <Highlighter className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="grid grid-cols-4 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onSelect(color)
                  setIsOpen(false)
                }}
                className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Link Dialog
// ============================================

interface LinkDialogProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (url: string, text: string) => void
  selectedText?: string
}

function LinkDialog({ isOpen, onClose, onInsert, selectedText }: LinkDialogProps) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState(selectedText || '')

  useEffect(() => {
    if (selectedText) setText(selectedText)
  }, [selectedText])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-md animate-scale-in">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Wstaw link</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tekst linku
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Tekst do wyświetlenia"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://..."
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => {
              if (url) {
                onInsert(url, text || url)
                onClose()
                setUrl('')
                setText('')
              }
            }}
            disabled={!url}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Wstaw
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Rich Text Editor Component
// ============================================

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Zacznij pisać...',
  className,
  disabled = false,
  minHeight = 150,
  maxHeight = 400,
  toolbar = ['basic', 'formatting', 'lists', 'alignment', 'media', 'history'],
  onImageUpload,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set())

  // Update active styles based on selection
  const updateActiveStyles = useCallback(() => {
    const styles = new Set<string>()

    if (document.queryCommandState('bold')) styles.add('bold')
    if (document.queryCommandState('italic')) styles.add('italic')
    if (document.queryCommandState('underline')) styles.add('underline')
    if (document.queryCommandState('strikeThrough')) styles.add('strikethrough')
    if (document.queryCommandState('insertUnorderedList')) styles.add('ul')
    if (document.queryCommandState('insertOrderedList')) styles.add('ol')
    if (document.queryCommandState('justifyLeft')) styles.add('left')
    if (document.queryCommandState('justifyCenter')) styles.add('center')
    if (document.queryCommandState('justifyRight')) styles.add('right')

    setActiveStyles(styles)
  }, [])

  // Execute command
  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    updateActiveStyles()

    // Update value
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange, updateActiveStyles])

  // Format block
  const formatBlock = useCallback((tag: string) => {
    document.execCommand('formatBlock', false, tag)
    editorRef.current?.focus()

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  // Handle input
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
    updateActiveStyles()
  }, [onChange, updateActiveStyles])

  // Handle paste - clean up pasted content
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  // Handle link insertion
  const handleLinkInsert = useCallback((url: string, text: string) => {
    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">${text}</a>`
    document.execCommand('insertHTML', false, linkHtml)
    editorRef.current?.focus()

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!onImageUpload) return

    try {
      const url = await onImageUpload(file)
      const imgHtml = `<img src="${url}" alt="Uploaded image" class="max-w-full h-auto rounded-lg my-2" />`
      document.execCommand('insertHTML', false, imgHtml)
      editorRef.current?.focus()

      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    } catch (error) {
      console.error('Image upload failed:', error)
    }
  }, [onChange, onImageUpload])

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file)
    }
    e.target.value = ''
  }, [handleImageUpload])

  // Set initial value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  // Handle selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveStyles()
      const selection = window.getSelection()
      if (selection) {
        setSelectedText(selection.toString())
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [updateActiveStyles])

  return (
    <div className={cn('border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {toolbar.includes('history') && (
          <>
            <ToolbarButton
              icon={<Undo className="w-4 h-4" />}
              onClick={() => exec('undo')}
              title="Cofnij (Ctrl+Z)"
            />
            <ToolbarButton
              icon={<Redo className="w-4 h-4" />}
              onClick={() => exec('redo')}
              title="Ponów (Ctrl+Y)"
            />
            <ToolbarDivider />
          </>
        )}

        {toolbar.includes('basic') && (
          <>
            <ToolbarButton
              icon={<Bold className="w-4 h-4" />}
              onClick={() => exec('bold')}
              active={activeStyles.has('bold')}
              title="Pogrubienie (Ctrl+B)"
            />
            <ToolbarButton
              icon={<Italic className="w-4 h-4" />}
              onClick={() => exec('italic')}
              active={activeStyles.has('italic')}
              title="Kursywa (Ctrl+I)"
            />
            <ToolbarButton
              icon={<Underline className="w-4 h-4" />}
              onClick={() => exec('underline')}
              active={activeStyles.has('underline')}
              title="Podkreślenie (Ctrl+U)"
            />
            <ToolbarButton
              icon={<Strikethrough className="w-4 h-4" />}
              onClick={() => exec('strikeThrough')}
              active={activeStyles.has('strikethrough')}
              title="Przekreślenie"
            />
            <ToolbarDivider />
          </>
        )}

        {toolbar.includes('formatting') && (
          <>
            <ToolbarButton
              icon={<Heading1 className="w-4 h-4" />}
              onClick={() => formatBlock('h1')}
              title="Nagłówek 1"
            />
            <ToolbarButton
              icon={<Heading2 className="w-4 h-4" />}
              onClick={() => formatBlock('h2')}
              title="Nagłówek 2"
            />
            <ToolbarButton
              icon={<Quote className="w-4 h-4" />}
              onClick={() => formatBlock('blockquote')}
              title="Cytat"
            />
            <ToolbarButton
              icon={<Code className="w-4 h-4" />}
              onClick={() => formatBlock('pre')}
              title="Kod"
            />
            <ColorPicker onSelect={(color) => exec('foreColor', color)} type="text" />
            <ColorPicker onSelect={(color) => exec('hiliteColor', color)} type="highlight" />
            <ToolbarDivider />
          </>
        )}

        {toolbar.includes('lists') && (
          <>
            <ToolbarButton
              icon={<List className="w-4 h-4" />}
              onClick={() => exec('insertUnorderedList')}
              active={activeStyles.has('ul')}
              title="Lista punktowana"
            />
            <ToolbarButton
              icon={<ListOrdered className="w-4 h-4" />}
              onClick={() => exec('insertOrderedList')}
              active={activeStyles.has('ol')}
              title="Lista numerowana"
            />
            <ToolbarDivider />
          </>
        )}

        {toolbar.includes('alignment') && (
          <>
            <ToolbarButton
              icon={<AlignLeft className="w-4 h-4" />}
              onClick={() => exec('justifyLeft')}
              active={activeStyles.has('left')}
              title="Wyrównaj do lewej"
            />
            <ToolbarButton
              icon={<AlignCenter className="w-4 h-4" />}
              onClick={() => exec('justifyCenter')}
              active={activeStyles.has('center')}
              title="Wyśrodkuj"
            />
            <ToolbarButton
              icon={<AlignRight className="w-4 h-4" />}
              onClick={() => exec('justifyRight')}
              active={activeStyles.has('right')}
              title="Wyrównaj do prawej"
            />
            <ToolbarDivider />
          </>
        )}

        {toolbar.includes('media') && (
          <>
            <ToolbarButton
              icon={<Link2 className="w-4 h-4" />}
              onClick={() => setShowLinkDialog(true)}
              title="Wstaw link"
            />
            {onImageUpload && (
              <>
                <ToolbarButton
                  icon={<Image className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                  title="Wstaw obraz"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={updateActiveStyles}
        onClick={updateActiveStyles}
        className={cn(
          'p-3 outline-none overflow-y-auto',
          'prose prose-sm dark:prose-invert max-w-none',
          'text-gray-900 dark:text-white',
          disabled && 'opacity-50 cursor-not-allowed',
          !value && 'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none'
        )}
        style={{ minHeight, maxHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Link Dialog */}
      <LinkDialog
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onInsert={handleLinkInsert}
        selectedText={selectedText}
      />
    </div>
  )
}

// ============================================
// Simple Rich Text Viewer
// ============================================

interface RichTextViewerProps {
  content: string
  className?: string
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-a:text-primary-600 prose-a:hover:underline',
        'prose-img:rounded-lg prose-img:max-w-full',
        'prose-blockquote:border-l-primary-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800/50 prose-blockquote:py-1 prose-blockquote:px-4',
        'prose-pre:bg-gray-900 prose-pre:text-gray-100',
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

export default RichTextEditor
