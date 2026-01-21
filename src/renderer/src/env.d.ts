/// <reference types="vite/client" />

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
  enablePasswordProtection?: boolean
  defaultPassword?: string
}

export interface UploadProgress {
  uploaded: number
  total: number
  percentage: number
}

export type TrayStatus = 'idle' | 'uploading' | 'success' | 'error'

export type SortBy = 'timestamp' | 'size' | 'expiresAt'
export type SortOrder = 'asc' | 'desc'

interface WindowApi {
  onUploadSuccess: (callback: (data: { link: string; record: UploadRecord }) => void) => void
  onStatusChange: (callback: (status: TrayStatus) => void) => void
  onUploadProgress: (callback: (progress: UploadProgress) => void) => void
  onNavigate: (callback: (page: string) => void) => void
  getHistory: () => Promise<UploadRecord[]>
  clearHistory: () => Promise<boolean>
  getConfig: () => Promise<AppConfig>
  setConfig: (key: keyof AppConfig, value: any) => Promise<boolean>
  setMultipleConfig: (config: Partial<AppConfig>) => Promise<boolean>
  isCloudflareConfigured: () => Promise<boolean>
  showWindow: () => void
  hideWindow: () => void
  deleteRecord: (id: string) => Promise<boolean>
  searchHistory: (query: string) => Promise<UploadRecord[]>
  getSortedHistory: (sortBy: SortBy, order: SortOrder) => Promise<UploadRecord[]>
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    api: WindowApi
    electron: typeof import('@electron-toolkit/preload').electronAPI
  }
}
