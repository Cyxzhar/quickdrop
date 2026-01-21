import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { UploadRecord } from '../types'
import { getConfig } from '../config'

// Use a simple JSON file-based store for compatibility
const configDir = app.getPath('userData')
const historyPath = join(configDir, 'history.json')

interface HistoryData {
  uploads: UploadRecord[]
}

function ensureConfigDir(): void {
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
}

function loadHistory(): HistoryData {
  ensureConfigDir()

  try {
    if (existsSync(historyPath)) {
      const data = readFileSync(historyPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading history:', error)
  }

  return { uploads: [] }
}

function saveHistory(history: HistoryData): void {
  ensureConfigDir()

  try {
    writeFileSync(historyPath, JSON.stringify(history, null, 2))
  } catch (error) {
    console.error('Error saving history:', error)
  }
}

export function getUploadHistory(): UploadRecord[] {
  const history = loadHistory()
  return history.uploads || []
}

export function addUploadRecord(record: UploadRecord): void {
  const config = getConfig()
  const history = loadHistory()

  // Add new record at the beginning
  history.uploads.unshift(record)

  // Keep only the max number of items
  if (history.uploads.length > config.maxHistoryItems) {
    history.uploads.splice(config.maxHistoryItems)
  }

  saveHistory(history)
}

export function removeUploadRecord(id: string): void {
  const history = loadHistory()
  history.uploads = history.uploads.filter(record => record.id !== id)
  saveHistory(history)
}

export function updateUploadRecordTitle(id: string, title: string): boolean {
  const history = loadHistory()
  const recordIndex = history.uploads.findIndex(record => record.id === id)

  console.log(`[Store] Finding record ${id}. Index: ${recordIndex}`)

  if (recordIndex !== -1) {
    history.uploads[recordIndex].title = title
    saveHistory(history)
    return true
  }
  return false
}

export function updateUploadRecordTags(id: string, tags: string[]): boolean {
  const history = loadHistory()
  const recordIndex = history.uploads.findIndex(record => record.id === id)

  console.log(`[Store] Finding record ${id} for tags. Index: ${recordIndex}`)

  if (recordIndex !== -1) {
    history.uploads[recordIndex].tags = tags
    saveHistory(history)
    return true
  }
  return false
}

export function updateUploadRecordText(id: string, text: string): boolean {
  const history = loadHistory()
  const recordIndex = history.uploads.findIndex(record => record.id === id)

  if (recordIndex !== -1) {
    history.uploads[recordIndex].text = text
    saveHistory(history)
    return true
  }
  return false
}

export function clearUploadHistory(): void {
  saveHistory({ uploads: [] })
}

export function cleanupExpiredRecords(): number {
  const now = Date.now()
  const history = loadHistory()
  const originalLength = history.uploads.length
  history.uploads = history.uploads.filter(record => record.expiresAt > now)
  const removedCount = originalLength - history.uploads.length

  if (removedCount > 0) {
    saveHistory(history)
  }

  return removedCount
}

export function getRecentUploads(count: number = 10): UploadRecord[] {
  return getUploadHistory().slice(0, count)
}

// Search functionality
export function searchHistory(query: string): UploadRecord[] {
  const history = loadHistory()
  const lowerQuery = query.toLowerCase().trim()

  if (!lowerQuery) {
    return history.uploads
  }

  return history.uploads.filter(record =>
    (record.title && record.title.toLowerCase().includes(lowerQuery)) ||
    (record.tags && record.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
    (record.text && record.text.toLowerCase().includes(lowerQuery)) ||
    record.link.toLowerCase().includes(lowerQuery) ||
    record.filename.toLowerCase().includes(lowerQuery) ||
    record.id.toLowerCase().includes(lowerQuery)
  )
}

// Sorting types and function
export type SortBy = 'timestamp' | 'size' | 'expiresAt'
export type SortOrder = 'asc' | 'desc'

export function getSortedHistory(sortBy: SortBy = 'timestamp', order: SortOrder = 'desc'): UploadRecord[] {
  const history = getUploadHistory()

  return [...history].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    return order === 'desc' ? bVal - aVal : aVal - bVal
  })
}

// Filter by date range
export function filterHistoryByDate(startTime: number, endTime: number): UploadRecord[] {
  const history = loadHistory()
  return history.uploads.filter(record =>
    record.timestamp >= startTime && record.timestamp <= endTime
  )
}
