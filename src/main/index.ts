import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupClipboardWatcher, stopClipboardWatcher } from './services/clipboard-watcher'
import { startScreenshotWatcher, stopScreenshotWatcher } from './services/screenshot-watcher'
import { initTray, setTrayStatus, updateTrayMenu, destroyTray } from './tray'
import { getConfig, setConfig, setMultipleConfig, isCloudflareConfigured } from './config'
import { getUploadHistory, clearUploadHistory, cleanupExpiredRecords } from './services/history-store'
import { UploadRecord, TrayStatus, UploadProgress, AppConfig } from './types'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    // Show window on startup for debugging
    mainWindow?.show()
  })

  // Hide window instead of closing on macOS
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Setup IPC handlers
function setupIPC(): void {
  // Get upload history
  ipcMain.handle('get-history', () => {
    return getUploadHistory()
  })

  // Clear history
  ipcMain.handle('clear-history', () => {
    clearUploadHistory()
    updateTrayMenu()
    return true
  })

  // Get config
  ipcMain.handle('get-config', () => {
    return getConfig()
  })

  // Update config
  ipcMain.handle('set-config', (_event, key: keyof AppConfig, value: any) => {
    setConfig(key, value)
    return true
  })

  // Update multiple config values
  ipcMain.handle('set-multiple-config', (_event, config: Partial<AppConfig>) => {
    setMultipleConfig(config)
    return true
  })

  // Check if Cloudflare is configured
  ipcMain.handle('is-cloudflare-configured', () => {
    return isCloudflareConfigured()
  })

  // Show window
  ipcMain.on('show-window', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Hide window
  ipcMain.on('hide-window', () => {
    mainWindow?.hide()
  })
}

// Register global shortcuts
function registerShortcuts(): void {
  // Register a global shortcut to show the app
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

// Cleanup expired records periodically
function setupCleanupJob(): void {
  // Run cleanup every hour
  setInterval(() => {
    const removed = cleanupExpiredRecords()
    if (removed > 0) {
      console.log(`Cleaned up ${removed} expired records`)
      updateTrayMenu()
    }
  }, 60 * 60 * 1000)

  // Also run on startup
  const removed = cleanupExpiredRecords()
  if (removed > 0) {
    console.log(`Initial cleanup removed ${removed} expired records`)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.quickdrop.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  setupIPC()

  // Initialize tray
  initTray(() => mainWindow)

  // Shared callbacks for both clipboard and screenshot watchers
  const handleUploadSuccess = (link: string, record: UploadRecord) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('upload-success', { link, record })
    }
    updateTrayMenu()
  }

  const handleStatusChange = (status: TrayStatus) => {
    setTrayStatus(status)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-change', status)
    }
  }

  const handleProgress = (progress: UploadProgress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('upload-progress', progress)
    }
  }

  // Setup clipboard watcher
  setupClipboardWatcher(handleUploadSuccess, handleStatusChange, handleProgress)

  // Setup screenshot watcher
  startScreenshotWatcher(handleUploadSuccess, handleStatusChange)

  // Register shortcuts
  registerShortcuts()

  // Setup cleanup job
  setupCleanupJob()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })

  console.log('QuickDrop started successfully')
  console.log(`Cloudflare configured: ${isCloudflareConfigured()}`)
  console.log(`Using mock uploader: ${getConfig().useMockUploader}`)
  console.log(`Screenshot watching: ${getConfig().watchScreenshots}`)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopClipboardWatcher()
  stopScreenshotWatcher()
  destroyTray()
})

app.on('before-quit', () => {
  // Allow actual quit
  mainWindow?.removeAllListeners('close')
})
