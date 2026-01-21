import { app } from 'electron'
import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { uploadImage } from './uploader'
import { getConfig } from '../config'
import type { StatusCallback, UploadCallback } from '../types'

const execAsync = promisify(exec)

let watcher: any = null
let onUploadCallback: UploadCallback | null = null
let onStatusCallback: StatusCallback | null = null
let startTime: number = Date.now()

// macOS screenshot filename patterns
const SCREENSHOT_PATTERNS = [
  /^Screenshot \d{4}-\d{2}-\d{2} at \d{1,2}\.\d{2}\.\d{2}( [AP]M)?\.png$/,
  /^Screen Shot \d{4}-\d{2}-\d{2} at \d{1,2}\.\d{2}\.\d{2}( [AP]M)?\.png$/,
  /^Screenshot from \d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}\.png$/ // Linux pattern
]

function isScreenshotFile(filename: string): boolean {
  return SCREENSHOT_PATTERNS.some(pattern => pattern.test(filename))
}

// Get macOS screenshots directory from system preferences
async function getScreenshotsDirectory(): Promise<string> {
  try {
    // Try to get the user's configured screenshot location
    const { stdout } = await execAsync('defaults read com.apple.screencapture location 2>/dev/null || echo ""')
    const location = stdout.trim()

    if (location && location !== '') {
      // Replace ~ with actual home directory
      return location.replace(/^~/, homedir())
    }
  } catch (error) {
    // Ignore error, will fall back to default
  }

  // Default location is Desktop
  return join(homedir(), 'Desktop')
}

async function handleNewFile(filePath: string): Promise<void> {
  const config = getConfig()

  if (!config.autoUpload || !config.watchScreenshots) {
    return
  }

  console.log(`New screenshot detected: ${filePath}`)

  if (onStatusCallback) {
    onStatusCallback('uploading')
  }

  try {
    // Wait a bit to ensure file is fully written
    await new Promise(resolve => setTimeout(resolve, 100))

    // Read the file
    const buffer = await readFile(filePath)

    // Upload the image
    const link = await uploadImage(buffer)

    console.log(`Screenshot uploaded: ${link}`)

    if (onStatusCallback) {
      onStatusCallback('success')
    }

    // Copy link to clipboard
    const { clipboard } = require('electron')
    clipboard.writeText(link)

    if (onUploadCallback) {
      const record = {
        id: link.split('/').pop() || '',
        link,
        filename: filePath.split('/').pop() || '',
        size: buffer.length,
        timestamp: Date.now(),
        expiresAt: Date.now() + config.expiryHours * 60 * 60 * 1000
      }
      onUploadCallback(link, record)
    }

    // Reset status after 2 seconds
    setTimeout(() => {
      if (onStatusCallback) {
        onStatusCallback('idle')
      }
    }, 2000)
  } catch (error) {
    console.error('Screenshot upload failed:', error)
    if (onStatusCallback) {
      onStatusCallback('error')
    }

    // Reset status after 3 seconds
    setTimeout(() => {
      if (onStatusCallback) {
        onStatusCallback('idle')
      }
    }, 3000)
  }
}

export async function startScreenshotWatcher(
  onUpload?: UploadCallback,
  onStatus?: StatusCallback
): Promise<void> {
  if (watcher) {
    console.log('Screenshot watcher already running')
    return
  }

  const config = getConfig()

  if (!config.watchScreenshots) {
    console.log('Screenshot watching is disabled')
    return
  }

  onUploadCallback = onUpload || null
  onStatusCallback = onStatus || null
  startTime = Date.now()

  // Get screenshots directory
  let screenshotsDir = config.screenshotsDirectory

  if (!screenshotsDir || screenshotsDir === '') {
    screenshotsDir = await getScreenshotsDirectory()
    console.log(`Auto-detected screenshots directory: ${screenshotsDir}`)
  } else {
    console.log(`Using configured screenshots directory: ${screenshotsDir}`)
  }

  console.log(`Starting screenshot watcher on: ${screenshotsDir}`)

  try {
    // Dynamic import for ESM module
    const chokidar = await import('chokidar')

    // Watch for new PNG files
    watcher = chokidar.watch(screenshotsDir, {
      persistent: true,
      ignoreInitial: true, // Don't trigger for existing files
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      },
      depth: 0 // Don't watch subdirectories
    })

    watcher.on('add', (filePath: string) => {
      const filename = filePath.split('/').pop() || ''

      // Only process PNG files that match screenshot naming patterns
      if (filePath.endsWith('.png') && isScreenshotFile(filename)) {
        handleNewFile(filePath)
      }
    })

    watcher.on('error', (error: Error) => {
      console.error('Screenshot watcher error:', error)
    })

    console.log('Screenshot watcher started')
  } catch (error) {
    console.error('Failed to start screenshot watcher:', error)
  }
}

export function stopScreenshotWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
    onUploadCallback = null
    onStatusCallback = null
    console.log('Screenshot watcher stopped')
  }
}

export function isScreenshotWatcherRunning(): boolean {
  return watcher !== null
}
