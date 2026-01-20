import { Tray, Menu, app, BrowserWindow, nativeImage, clipboard, shell } from 'electron'
import { join } from 'path'
import { TrayStatus, UploadRecord } from './types'
import { getConfig, setConfig } from './config'
import { getRecentUploads, clearUploadHistory } from './services/history-store'

let tray: Tray | null = null
let currentStatus: TrayStatus = 'idle'
let getWindowFn: (() => BrowserWindow | null) | null = null

// Create a simple tray icon using nativeImage
// For macOS, we use template images (black icons that adapt to light/dark mode)
function createTrayIcon(status: TrayStatus): Electron.NativeImage {
  // Base64 encoded 16x16 PNG icons for different states
  // These are simple template images that work on macOS
  const icons: Record<TrayStatus, string> = {
    idle: `
      iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
      AAAA3QAAAN0BcFOiBwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABwSURB
      VDiNY2AYBaNgFIwCGsDE0O/+nwHKZmBi4GD4z/CfASwID/8ZGBgY/jMwMf5n+M/EwPCfgeE/A0gN
      I0P/f0YGBoYBM5CBgYHhP8N/hv8MDAwMDP8Z/jMwMDAw/GdgYBgwAxn+MzAwDJiBo2AUjAJyAACE
      qRAKJNqE4QAAAABJRU5ErkJggg==
    `,
    uploading: `
      iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
      AAAA3QAAAN0BcFOiBwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACASURB
      VDiNY2AYBaNgFIwCGsCk4Ob+n4GBgYGJgYPhPwMDAxMDA4TA/38GBgYGhv8MYAEGRob/DAwM/xmY
      GP8zMDAwMPxnYPjPABIE0f8ZGBgYGBj+M/xnYGBgYGD4z8DAwMDwn4GBYYD8C/8ZGBgGzMD/DAwM
      A2bgKBgFo4AcAACtBhAKqdxfmgAAAABJRU5ErkJggg==
    `,
    success: `
      iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
      AAAA3QAAAN0BcFOiBwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAB1SURB
      VDiNY2AYBaNgFIwCGsCk4Or+nwHKZmJg4GD4z/CfASwIBv8ZGBgY/jMwMfxnYGBgYPjPwPCfASQI
      ov8zMDAwMPxn+M/AwMDA8J+BgYGB4T8DA8OA+Rf+MzAwDJiB/xkYGAbMwFEwCkbBKKACAAAHQxAK
      1GGz2gAAAABJRU5ErkJggg==
    `,
    error: `
      iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
      AAAA3QAAAN0BcFOiBwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAB4SURB
      VDiNY2AYBaNgFIwCGsCk4Ob+nwHKZmLg4PjPwMDAxMAAI/7/Z2BgYGD4z8DE8J+BgYGB4T8Dw38G
      kCCI/s/AwMDA8J/hPwMDAwPDfwYGBgaG/wwMDANmIP9/BoYBM/A/AwPDgBk4CkbBKBgFVAAAMrYQ
      Co0nDGUAAAAASUVORK5CYII=
    `
  }

  const iconData = icons[status].replace(/\s/g, '')
  const icon = nativeImage.createFromBuffer(Buffer.from(iconData, 'base64'))

  // Mark as template for macOS (auto adapts to dark/light mode)
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }

  return icon
}

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Build the tray context menu
function buildContextMenu(): Menu {
  const config = getConfig()
  const uploads = getRecentUploads(10)

  const statusLabels: Record<TrayStatus, string> = {
    idle: 'Ready',
    uploading: 'Uploading...',
    success: 'Upload Complete',
    error: 'Upload Failed'
  }

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: `QuickDrop: ${statusLabels[currentStatus]}`,
      enabled: false,
      icon: createTrayIcon(currentStatus)
    },
    { type: 'separator' },
    {
      label: `Auto-upload: ${config.autoUpload ? 'On' : 'Off'}`,
      type: 'checkbox',
      checked: config.autoUpload,
      click: () => {
        setConfig('autoUpload', !config.autoUpload)
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: 'Recent Uploads',
      enabled: uploads.length > 0,
      submenu: uploads.length > 0
        ? uploads.map(upload => ({
            label: `${upload.link.split('/').pop()} (${formatFileSize(upload.size)})`,
            sublabel: formatRelativeTime(upload.timestamp),
            click: () => {
              clipboard.writeText(upload.link)
            },
            submenu: [
              {
                label: 'Copy Link',
                click: () => clipboard.writeText(upload.link)
              },
              {
                label: 'Open in Browser',
                click: () => shell.openExternal(upload.link)
              }
            ]
          }))
        : undefined
    },
    { type: 'separator' },
    {
      label: 'Clear History',
      enabled: uploads.length > 0,
      click: () => {
        clearUploadHistory()
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        const window = getWindowFn?.()
        if (window) {
          window.show()
          window.focus()
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        const window = getWindowFn?.()
        if (window) {
          window.show()
          window.focus()
          window.webContents.send('navigate', 'settings')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit QuickDrop',
      click: () => app.quit()
    }
  ]

  return Menu.buildFromTemplate(menuTemplate)
}

// Update the tray menu
export function updateTrayMenu(): void {
  if (!tray) return
  tray.setContextMenu(buildContextMenu())
}

// Update tray status
export function setTrayStatus(status: TrayStatus): void {
  if (!tray) return

  currentStatus = status
  tray.setImage(createTrayIcon(status))
  updateTrayMenu()

  // Update tooltip
  const tooltips: Record<TrayStatus, string> = {
    idle: 'QuickDrop - Ready',
    uploading: 'QuickDrop - Uploading...',
    success: 'QuickDrop - Upload Complete',
    error: 'QuickDrop - Upload Failed'
  }
  tray.setToolTip(tooltips[status])
}

// Initialize the tray
export function initTray(getWindow: () => BrowserWindow | null): void {
  if (tray) return // Prevent multiple trays

  getWindowFn = getWindow

  tray = new Tray(createTrayIcon('idle'))
  tray.setToolTip('QuickDrop - Ready')

  // On macOS, clicking the tray shows the menu
  // On Windows/Linux, both click and right-click work
  tray.on('click', () => {
    if (process.platform === 'darwin') {
      tray?.popUpContextMenu()
    } else {
      const window = getWindowFn?.()
      if (window) {
        if (window.isVisible()) {
          window.hide()
        } else {
          window.show()
          window.focus()
        }
      }
    }
  })

  updateTrayMenu()
  console.log('System tray initialized')
}

// Destroy the tray
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
