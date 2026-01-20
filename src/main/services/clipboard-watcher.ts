import { clipboard, Notification } from 'electron'
import { uploadImage } from './uploader'
import { getConfig } from '../config'
import { UploadRecord, StatusCallback, ProgressCallback } from '../types'
// @ts-ignore - electron-clipboard-extended doesn't have types
import clipboardEx from 'electron-clipboard-extended'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Callbacks
let onSuccessCallback: ((link: string, record: UploadRecord) => void) | null = null
let onStatusChangeCallback: StatusCallback | null = null
let onProgressCallback: ProgressCallback | null = null

// Track last image hash to prevent duplicate uploads
let lastImageHash: string | null = null

// Calculate simple hash for image comparison
function getImageHash(image: Electron.NativeImage): string {
  const buffer = image.toPNG()
  let hash = 0
  for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
    hash = ((hash << 5) - hash) + buffer[i]
    hash = hash & hash
  }
  return hash.toString(16)
}

// Retry wrapper for upload
async function uploadWithRetry(buffer: Buffer): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${MAX_RETRIES}...`)
      const link = await uploadImage(buffer, onProgressCallback || undefined)
      return link
    } catch (error) {
      lastError = error as Error
      console.error(`Upload attempt ${attempt} failed:`, error)

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
      }
    }
  }

  throw lastError || new Error('Upload failed after all retries')
}

export function setupClipboardWatcher(
  onSuccess: (link: string, record: UploadRecord) => void,
  onStatusChange?: StatusCallback,
  onProgress?: ProgressCallback
): void {
  onSuccessCallback = onSuccess
  onStatusChangeCallback = onStatusChange || null
  onProgressCallback = onProgress || null

  console.log('Starting clipboard watcher...')

  clipboardEx.on('image-changed', async () => {
    const config = getConfig()

    // Check if auto-upload is enabled
    if (!config.autoUpload) {
      console.log('Auto-upload disabled, ignoring image change')
      return
    }

    const image = clipboard.readImage()
    if (image.isEmpty()) return

    // Check for duplicate image
    const currentHash = getImageHash(image)
    if (currentHash === lastImageHash) {
      console.log('Duplicate image detected, skipping upload')
      return
    }
    lastImageHash = currentHash

    console.log('New image detected in clipboard')
    onStatusChangeCallback?.('uploading')

    try {
      const buffer = image.toPNG()

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024
      if (buffer.length > maxSize) {
        throw new Error(`Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 10MB)`)
      }

      // Upload with retry
      const link = await uploadWithRetry(buffer)

      // Replace clipboard content with link
      clipboard.writeText(link)

      // Update status
      onStatusChangeCallback?.('success')

      // Show success notification
      new Notification({
        title: 'QuickDrop',
        body: `Link copied! ${link}`,
        silent: false
      }).show()

      // Create record for callback
      const record: UploadRecord = {
        id: link.split('/').pop() || '',
        link,
        filename: `${link.split('/').pop()}.png`,
        size: buffer.length,
        timestamp: Date.now(),
        expiresAt: Date.now() + config.expiryHours * 60 * 60 * 1000
      }

      // Callback to main process
      onSuccessCallback?.(link, record)

      console.log(`Upload successful: ${link}`)

      // Reset status after delay
      setTimeout(() => {
        onStatusChangeCallback?.('idle')
      }, 3000)
    } catch (error) {
      console.error('Upload failed:', error)
      onStatusChangeCallback?.('error')

      // Restore original image to clipboard
      clipboard.writeImage(image)

      // Show error notification
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      new Notification({
        title: 'QuickDrop - Upload Failed',
        body: errorMessage,
        silent: false
      }).show()

      // Reset status after delay
      setTimeout(() => {
        onStatusChangeCallback?.('idle')
      }, 5000)
    }
  })

  clipboardEx.startWatching()
  console.log('Clipboard watcher started')
}

export function stopClipboardWatcher(): void {
  clipboardEx.stopWatching()
  console.log('Clipboard watcher stopped')
}

export function setAutoUpload(enabled: boolean): void {
  // This will be reflected in the next image change event
  console.log(`Auto-upload ${enabled ? 'enabled' : 'disabled'}`)
}

// Reset the last image hash (useful when user wants to re-upload same image)
export function resetLastImageHash(): void {
  lastImageHash = null
}
