import { Dropbox } from 'dropbox'
import { getValidAccessToken, isDropboxConnected } from './dropbox-oauth'

// Custom error for disconnected Dropbox
export class DropboxDisconnectedError extends Error {
  constructor(message = 'Dropbox integration is disconnected or token expired') {
    super(message)
    this.name = 'DropboxDisconnectedError'
  }
}

// Create Dropbox client with proper fetch for Node.js environment
function createDropboxClient(accessToken: string): Dropbox {
  return new Dropbox({
    accessToken,
    fetch: globalThis.fetch,
  })
}

/**
 * Get Dropbox client with auto-refreshing access token
 * Throws DropboxDisconnectedError if integration is disconnected
 */
export async function getDropboxClient(): Promise<Dropbox> {
  const accessToken = await getValidAccessToken()

  if (!accessToken) {
    throw new DropboxDisconnectedError()
  }

  return createDropboxClient(accessToken)
}

/**
 * Get Dropbox client (nullable version for backward compatibility)
 */
export async function getDropboxClientOrNull(): Promise<Dropbox | null> {
  try {
    return await getDropboxClient()
  } catch (error) {
    if (error instanceof DropboxDisconnectedError) {
      return null
    }
    throw error
  }
}

/**
 * Check if Dropbox is configured and connected
 */
export async function isDropboxConfigured(): Promise<boolean> {
  const status = await isDropboxConnected()
  return status.connected && !status.needsReconnect
}

/**
 * Upload file to Dropbox (supports large files up to 2GB via chunked upload)
 */
export async function uploadToDropbox(
  file: Buffer,
  path: string,
  filename: string
): Promise<{ url: string; path: string }> {
  const dbx = await getDropboxClient()

  const fullPath = `/GraphFlow/${path}/${filename}`
  const CHUNK_SIZE = 8 * 1024 * 1024 // 8MB chunks

  let uploadResponse

  // For files larger than 150MB, use chunked upload
  if (file.length > 150 * 1024 * 1024) {
    console.log(`Large file detected (${(file.length / (1024 * 1024)).toFixed(1)} MB), using chunked upload...`)

    // Start upload session
    const startResponse = await dbx.filesUploadSessionStart({
      close: false,
      contents: file.slice(0, CHUNK_SIZE),
    })

    const sessionId = startResponse.result.session_id
    let offset = CHUNK_SIZE

    // Upload remaining chunks
    while (offset < file.length - CHUNK_SIZE) {
      await dbx.filesUploadSessionAppendV2({
        cursor: { session_id: sessionId, offset },
        close: false,
        contents: file.slice(offset, offset + CHUNK_SIZE),
      })
      offset += CHUNK_SIZE
      console.log(`Uploaded ${(offset / (1024 * 1024)).toFixed(1)} MB / ${(file.length / (1024 * 1024)).toFixed(1)} MB`)
    }

    // Finish upload session
    uploadResponse = await dbx.filesUploadSessionFinish({
      cursor: { session_id: sessionId, offset },
      commit: {
        path: fullPath,
        mode: { '.tag': 'overwrite' },
      },
      contents: file.slice(offset),
    })
  } else {
    // Small file - simple upload
    uploadResponse = await dbx.filesUpload({
      path: fullPath,
      contents: file,
      mode: { '.tag': 'overwrite' },
    })
  }

  // Create shared link for viewing
  let sharedLink: string
  try {
    const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
      path: uploadResponse.result.path_display || fullPath,
      settings: {
        requested_visibility: { '.tag': 'public' },
      },
    })
    sharedLink = linkResponse.result.url.replace('?dl=0', '?raw=1')
  } catch (linkError: any) {
    // If link already exists, get existing link
    if (linkError?.error?.error?.['.tag'] === 'shared_link_already_exists') {
      const existingLinks = await dbx.sharingListSharedLinks({
        path: uploadResponse.result.path_display || fullPath,
        direct_only: true,
      })
      if (existingLinks.result.links.length > 0) {
        sharedLink = existingLinks.result.links[0].url.replace('?dl=0', '?raw=1')
      } else {
        throw linkError
      }
    } else {
      throw linkError
    }
  }

  return {
    url: sharedLink,
    path: uploadResponse.result.path_display || fullPath,
  }
}

/**
 * Delete file from Dropbox
 */
export async function deleteFromDropbox(path: string): Promise<boolean> {
  try {
    const dbx = await getDropboxClient()
    await dbx.filesDeleteV2({ path })
    return true
  } catch (error) {
    if (error instanceof DropboxDisconnectedError) {
      console.warn('Cannot delete from Dropbox: integration disconnected')
      return false
    }
    console.error('Dropbox delete error:', error)
    return false
  }
}

/**
 * Get temporary download link
 */
export async function getDropboxDownloadLink(path: string): Promise<string | null> {
  try {
    const dbx = await getDropboxClient()
    const response = await dbx.filesGetTemporaryLink({ path })
    return response.result.link
  } catch (error) {
    if (error instanceof DropboxDisconnectedError) {
      console.warn('Cannot get Dropbox link: integration disconnected')
      return null
    }
    console.error('Dropbox get link error:', error)
    return null
  }
}

/**
 * Verify Dropbox token is valid (for manual token entry - legacy support)
 */
export async function verifyDropboxToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    const dbx = createDropboxClient(token)
    const response = await dbx.usersGetCurrentAccount()
    return {
      valid: true,
      email: response.result.email,
    }
  } catch (error: any) {
    console.error('Dropbox token verification error:', error)

    let errorMessage = 'Unknown error'
    if (error?.error?.error_summary) {
      errorMessage = error.error.error_summary
    } else if (error?.message) {
      errorMessage = error.message
    } else if (error?.status) {
      errorMessage = `HTTP ${error.status}`
    }

    return { valid: false, error: errorMessage }
  }
}

/**
 * Browse Dropbox folder
 */
export async function browseDropboxFolder(path: string = ''): Promise<{
  entries: Array<{
    name: string
    path: string
    isFolder: boolean
    size?: number
    modified?: string
  }>
} | null> {
  try {
    const dbx = await getDropboxClient()
    const response = await dbx.filesListFolder({
      path: path || '',
      include_media_info: true,
    })

    const entries = response.result.entries.map((entry) => ({
      name: entry.name,
      path: entry.path_display || entry.path_lower || '',
      isFolder: entry['.tag'] === 'folder',
      size: entry['.tag'] === 'file' ? (entry as any).size : undefined,
      modified: entry['.tag'] === 'file' ? (entry as any).server_modified : undefined,
    }))

    // Sort: folders first, then alphabetically
    entries.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })

    return { entries }
  } catch (error) {
    if (error instanceof DropboxDisconnectedError) {
      return null
    }
    console.error('Dropbox browse error:', error)
    return null
  }
}

/**
 * Create folder in Dropbox
 */
export async function createDropboxFolder(path: string): Promise<{ path: string } | null> {
  try {
    const dbx = await getDropboxClient()
    const response = await dbx.filesCreateFolderV2({ path })
    return {
      path: response.result.metadata.path_display || path,
    }
  } catch (error: any) {
    if (error instanceof DropboxDisconnectedError) {
      return null
    }
    // Handle "folder already exists" error
    if (error?.error?.error?.['.tag'] === 'path' &&
        error?.error?.error?.path?.['.tag'] === 'conflict') {
      return { path }
    }
    console.error('Dropbox create folder error:', error)
    return null
  }
}

/**
 * Get or create shared link for a path
 */
export async function getDropboxSharedLink(path: string): Promise<{
  url: string
  directUrl: string
} | null> {
  try {
    const dbx = await getDropboxClient()

    let sharedUrl: string

    try {
      const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
        path,
        settings: {
          requested_visibility: { '.tag': 'public' },
        },
      })
      sharedUrl = linkResponse.result.url
    } catch (linkError: any) {
      if (linkError?.error?.error?.['.tag'] === 'shared_link_already_exists') {
        const existingLinks = await dbx.sharingListSharedLinks({
          path,
          direct_only: true,
        })
        if (existingLinks.result.links.length > 0) {
          sharedUrl = existingLinks.result.links[0].url
        } else {
          throw linkError
        }
      } else {
        throw linkError
      }
    }

    // Get temporary direct download link
    let directUrl = sharedUrl.replace('?dl=0', '?raw=1')
    try {
      const tempLink = await dbx.filesGetTemporaryLink({ path })
      directUrl = tempLink.result.link
    } catch {
      // Use the raw shared link as fallback
    }

    return { url: sharedUrl, directUrl }
  } catch (error) {
    if (error instanceof DropboxDisconnectedError) {
      return null
    }
    console.error('Dropbox get shared link error:', error)
    return null
  }
}
