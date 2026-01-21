// Shared types for QuickDrop

export interface UploadRecord {
  id: string
  link: string
  filename: string
  title?: string
  thumbnail?: string
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
  watchScreenshots: boolean
  screenshotsDirectory: string
  expiryHours: number
  maxHistoryItems: number
  useMockUploader: boolean
  enablePasswordProtection?: boolean
  defaultPassword?: string
}

export type TrayStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface AppState {
  isEnabled: boolean
  status: TrayStatus
  uploadHistory: UploadRecord[]
}

export interface UploadProgress {
  uploaded: number
  total: number
  percentage: number
}

export type UploadCallback = (link: string, record: UploadRecord) => void
export type ProgressCallback = (progress: UploadProgress) => void
export type StatusCallback = (status: TrayStatus) => void
