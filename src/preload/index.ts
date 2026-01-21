import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Types for the renderer
export interface UploadRecord {
  id: string
  link: string
  filename: string
  size: number
  timestamp: number
  expiresAt: number
}

export interface AppConfig {
  cloudflareAccountId: string
  cloudflareAccessKeyId: string
  cloudflareSecretAccessKey: string
  cloudflareR2Bucket: string
  cloudflareWorkerUrl: string
  autoUpload: boolean
  expiryHours: number
  maxHistoryItems: number
  useMockUploader: boolean
}

export interface UploadProgress {
  uploaded: number
  total: number
  percentage: number
}

export type TrayStatus = 'idle' | 'uploading' | 'success' | 'error'

// Custom APIs for renderer
const api = {
  // Event listeners
  onUploadSuccess: (callback: (data: { link: string; record: UploadRecord }) => void) => {
    ipcRenderer.on('upload-success', (_event, data) => callback(data))
  },
  onStatusChange: (callback: (status: TrayStatus) => void) => {
    ipcRenderer.on('status-change', (_event, status) => callback(status))
  },
  onUploadProgress: (callback: (progress: UploadProgress) => void) => {
    ipcRenderer.on('upload-progress', (_event, progress) => callback(progress))
  },
  onNavigate: (callback: (page: string) => void) => {
    ipcRenderer.on('navigate', (_event, page) => callback(page))
  },

  // History operations
  getHistory: (): Promise<UploadRecord[]> => {
    return ipcRenderer.invoke('get-history')
  },
  clearHistory: (): Promise<boolean> => {
    return ipcRenderer.invoke('clear-history')
  },
  deleteRecord: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke('delete-record', id)
  },
  searchHistory: (query: string): Promise<UploadRecord[]> => {
    return ipcRenderer.invoke('search-history', query)
  },
  getSortedHistory: (sortBy: string, order: string): Promise<UploadRecord[]> => {
    return ipcRenderer.invoke('get-sorted-history', sortBy, order)
  },

  // Config operations
  getConfig: (): Promise<AppConfig> => {
    return ipcRenderer.invoke('get-config')
  },
  setConfig: (key: keyof AppConfig, value: any): Promise<boolean> => {
    return ipcRenderer.invoke('set-config', key, value)
  },
  setMultipleConfig: (config: Partial<AppConfig>): Promise<boolean> => {
    return ipcRenderer.invoke('set-multiple-config', config)
  },
  isCloudflareConfigured: (): Promise<boolean> => {
    return ipcRenderer.invoke('is-cloudflare-configured')
  },

  // Window operations
  showWindow: () => {
    ipcRenderer.send('show-window')
  },
  hideWindow: () => {
    ipcRenderer.send('hide-window')
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// Expose APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
