'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, Plus, Folder, Trash2 } from 'lucide-react'
import type { FileLocation } from '@prisma/client'
import { addFileLocationAction, deleteFileLocationAction } from './file-location-actions'
import { useRouter } from 'next/navigation'

interface FileLocationsListProps {
  projectId: string
  locations: FileLocation[]
  localPath: string | null
  dropboxPath: string | null
  dropboxLink: string | null
}

export function FileLocationsList({
  projectId,
  locations,
  localPath,
  dropboxPath,
  dropboxLink,
}: FileLocationsListProps) {
  const router = useRouter()
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  async function copyToClipboard(path: string) {
    await navigator.clipboard.writeText(path)
    setCopiedPath(path)
    setTimeout(() => setCopiedPath(null), 2000)
  }

  async function handleAddLocation(formData: FormData) {
    formData.append('projectId', projectId)
    await addFileLocationAction(formData)
    setIsAdding(false)
    router.refresh()
  }

  async function handleDelete(locationId: string) {
    if (confirm('Czy na pewno chcesz usunąć tę lokalizację?')) {
      await deleteFileLocationAction(locationId)
      router.refresh()
    }
  }

  const hasMainPaths = localPath || dropboxPath || dropboxLink

  return (
    <div className="divide-y divide-gray-100">
      {/* Main paths from project */}
      {localPath && (
        <PathItem
          label="Ścieżka lokalna"
          path={localPath}
          onCopy={() => copyToClipboard(localPath)}
          isCopied={copiedPath === localPath}
        />
      )}
      {dropboxPath && (
        <PathItem
          label="Dropbox"
          path={dropboxPath}
          onCopy={() => copyToClipboard(dropboxPath)}
          isCopied={copiedPath === dropboxPath}
        />
      )}
      {dropboxLink && (
        <PathItem
          label="Link Dropbox"
          path={dropboxLink}
          isLink
          onCopy={() => copyToClipboard(dropboxLink)}
          isCopied={copiedPath === dropboxLink}
        />
      )}

      {/* Additional locations */}
      {locations.map((location) => (
        <PathItem
          key={location.id}
          label={location.label || location.type}
          path={location.path}
          isLink={location.type !== 'LOCAL'}
          onCopy={() => copyToClipboard(location.path)}
          isCopied={copiedPath === location.path}
          onDelete={() => handleDelete(location.id)}
        />
      ))}

      {/* No locations message */}
      {!hasMainPaths && locations.length === 0 && !isAdding && (
        <div className="p-4 text-center text-gray-500 text-sm">
          Brak lokalizacji plików
        </div>
      )}

      {/* Add new location */}
      {isAdding ? (
        <form action={handleAddLocation} className="p-4 space-y-3">
          <div>
            <select name="type" className="input" required>
              <option value="LOCAL">Lokalna</option>
              <option value="DROPBOX">Dropbox</option>
              <option value="GOOGLE_DRIVE">Google Drive</option>
              <option value="OTHER">Inna</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              name="path"
              className="input"
              placeholder="Ścieżka lub link"
              required
            />
          </div>
          <div>
            <input
              type="text"
              name="label"
              className="input"
              placeholder="Etykieta (opcjonalnie)"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary btn-sm">
              Dodaj
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="btn-ghost btn-sm"
            >
              Anuluj
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full p-3 text-sm text-primary-600 hover:bg-gray-50 flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Dodaj lokalizację
        </button>
      )}
    </div>
  )
}

function PathItem({
  label,
  path,
  isLink,
  onCopy,
  isCopied,
  onDelete,
}: {
  label: string
  path: string
  isLink?: boolean
  onCopy: () => void
  isCopied: boolean
  onDelete?: () => void
}) {
  return (
    <div className="p-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-sm text-gray-900 break-all font-mono">{path}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onCopy}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Kopiuj"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          {isLink && (
            <a
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Otwórz"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Usuń"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
