import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { AppConfig } from './types'

// Use a simple JSON file-based store for compatibility
const configDir = app.getPath('userData')
const configPath = join(configDir, 'config.json')

const defaultConfig: AppConfig = {
  cloudflareAccountId: '',
  cloudflareAccessKeyId: '',
  cloudflareSecretAccessKey: '',
  cloudflareR2Bucket: 'quickdrop',
  cloudflareWorkerUrl: '',
  autoUpload: true,
  watchScreenshots: true,
  screenshotsDirectory: '',
  expiryHours: 24,
  maxHistoryItems: 50,
  useMockUploader: true
}

function ensureConfigDir(): void {
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
}

function loadConfig(): AppConfig {
  ensureConfigDir()

  try {
    if (existsSync(configPath)) {
      const data = readFileSync(configPath, 'utf-8')
      const parsed = JSON.parse(data)
      return { ...defaultConfig, ...parsed }
    }
  } catch (error) {
    console.error('Error loading config:', error)
  }

  return { ...defaultConfig }
}

function saveConfig(config: AppConfig): void {
  ensureConfigDir()

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Error saving config:', error)
  }
}

// In-memory cache
let configCache: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!configCache) {
    configCache = loadConfig()
  }
  return { ...configCache }
}

export function setConfig(key: keyof AppConfig, value: any): void {
  const config = getConfig()
  ;(config as any)[key] = value
  configCache = config
  saveConfig(config)
}

export function setMultipleConfig(updates: Partial<AppConfig>): void {
  const config = getConfig()
  Object.assign(config, updates)
  configCache = config
  saveConfig(config)
}

export function isCloudflareConfigured(): boolean {
  const config = getConfig()
  return !!(
    config.cloudflareAccountId &&
    config.cloudflareAccessKeyId &&
    config.cloudflareSecretAccessKey &&
    config.cloudflareWorkerUrl
  )
}

export function resetConfig(): void {
  configCache = { ...defaultConfig }
  saveConfig(configCache)
}
