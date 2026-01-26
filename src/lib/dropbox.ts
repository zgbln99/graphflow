import { Dropbox } from 'dropbox'
import { prisma } from './db'

// Create Dropbox client with proper fetch for Node.js environment
function createDropboxClient(accessToken: string): Dropbox {
  return new Dropbox({
    accessToken,
    fetch: globalThis.fetch,
  })
}

// Get Dropbox client with access token from settings
export async function getDropboxClient(): Promise<Dropbox | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'dropbox_access_token' },
  })

  if (!setting?.value) {
    return null
  }

  return createDropboxClient(setting.value)
}

// Check if Dropbox is configured
export async function isDropboxConfigured(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'dropbox_access_token' },
  })
  return !!setting?.value
}

// Upload file to Dropbox (supports large files up to 2GB via chunked upload)
export async function uploadToDropbox(
  file: Buffer,
  path: string,
  filename: string
): Promise<{ url: string; path: string } | null> {
  const dbx = await getDropboxClient()
  if (!dbx) return null

  try {
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
  } catch (error) {
    console.error('Dropbox upload error:', error)
    return null
  }
}

// Delete file from Dropbox
export async function deleteFromDropbox(path: string): Promise<boolean> {
  const dbx = await getDropboxClient()
  if (!dbx) return false

  try {
    await dbx.filesDeleteV2({ path })
    return true
  } catch (error) {
    console.error('Dropbox delete error:', error)
    return false
  }
}

// Get temporary download link
export async function getDropboxDownloadLink(path: string): Promise<string | null> {
  const dbx = await getDropboxClient()
  if (!dbx) return null

  try {
    const response = await dbx.filesGetTemporaryLink({ path })
    return response.result.link
  } catch (error) {
    console.error('Dropbox get link error:', error)
    return null
  }
}

// Verify Dropbox token is valid
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

    // Extract error message for debugging
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
