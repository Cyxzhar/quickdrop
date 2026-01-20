import { v4 as uuidv4 } from 'uuid'
import { createHmac } from 'crypto'
import { UploadRecord, ProgressCallback } from '../types'
import { getConfig, isCloudflareConfigured } from '../config'
import { addUploadRecord } from './history-store'

// Generate a short unique ID (6 characters, alphanumeric)
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

// Calculate file hash for deduplication (optional)
function calculateHash(buffer: Buffer): string {
  return createHmac('sha256', 'quickdrop').update(buffer).digest('hex').slice(0, 12)
}

// Mock uploader for local development
async function mockUpload(
  buffer: Buffer,
  onProgress?: ProgressCallback
): Promise<{ id: string; link: string }> {
  const totalSize = buffer.length
  const steps = 5

  // Simulate upload progress
  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, 100))
    if (onProgress) {
      onProgress({
        uploaded: Math.floor((totalSize / steps) * i),
        total: totalSize,
        percentage: Math.floor((i / steps) * 100)
      })
    }
  }

  const id = generateShortId()
  const link = `https://drop.to/${id}`

  console.log(`[MockUpload] Uploaded ${buffer.length} bytes. ID: ${id}`)

  return { id, link }
}

// Real Cloudflare R2 uploader using S3-compatible API
async function cloudflareR2Upload(
  buffer: Buffer,
  onProgress?: ProgressCallback
): Promise<{ id: string; link: string }> {
  const config = getConfig()
  const id = generateShortId()
  const filename = `${id}.png`

  // Cloudflare R2 uses S3-compatible API
  const endpoint = `https://${config.cloudflareAccountId}.r2.cloudflarestorage.com`
  const url = `${endpoint}/${config.cloudflareR2Bucket}/${filename}`

  // Create AWS Signature V4 for authentication
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const region = 'auto'
  const service = 's3'

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`

  // Canonical request
  const canonicalUri = `/${config.cloudflareR2Bucket}/${filename}`
  const canonicalQueryString = ''
  const contentHash = createHmac('sha256', '')
    .update(buffer)
    .digest('hex')

  const canonicalHeaders = [
    `content-length:${buffer.length}`,
    `content-type:image/png`,
    `host:${config.cloudflareAccountId}.r2.cloudflarestorage.com`,
    `x-amz-content-sha256:${contentHash}`,
    `x-amz-date:${amzDate}`
  ].join('\n') + '\n'

  const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    contentHash
  ].join('\n')

  // String to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHmac('sha256', '').update(canonicalRequest).digest('hex')
  ].join('\n')

  // Calculate signature
  const getSignatureKey = (key: string, dateStamp: string, region: string, service: string) => {
    const kDate = createHmac('sha256', `AWS4${key}`).update(dateStamp).digest()
    const kRegion = createHmac('sha256', kDate).update(region).digest()
    const kService = createHmac('sha256', kRegion).update(service).digest()
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest()
    return kSigning
  }

  const signingKey = getSignatureKey(
    config.cloudflareSecretAccessKey,
    dateStamp,
    region,
    service
  )
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')

  const authorizationHeader = [
    `AWS4-HMAC-SHA256 Credential=${config.cloudflareAccessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(', ')

  // Report initial progress
  if (onProgress) {
    onProgress({ uploaded: 0, total: buffer.length, percentage: 0 })
  }

  // Perform the upload (convert Buffer to Uint8Array for fetch compatibility)
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': buffer.length.toString(),
      'X-Amz-Date': amzDate,
      'X-Amz-Content-SHA256': contentHash,
      'Authorization': authorizationHeader
    },
    body: new Uint8Array(buffer)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Upload failed: ${response.status} - ${errorText}`)
  }

  // Report completion
  if (onProgress) {
    onProgress({ uploaded: buffer.length, total: buffer.length, percentage: 100 })
  }

  // Generate the public link using the worker URL
  const link = `${config.cloudflareWorkerUrl}/${id}`

  console.log(`[CloudflareR2] Uploaded ${buffer.length} bytes. ID: ${id}`)

  return { id, link }
}

// Main upload function - chooses between mock and real based on config
export async function uploadImage(
  buffer: Buffer,
  onProgress?: ProgressCallback
): Promise<string> {
  const config = getConfig()
  const expiresAt = Date.now() + config.expiryHours * 60 * 60 * 1000

  let result: { id: string; link: string }

  if (config.useMockUploader || !isCloudflareConfigured()) {
    result = await mockUpload(buffer, onProgress)
  } else {
    result = await cloudflareR2Upload(buffer, onProgress)
  }

  // Create and store the upload record
  const record: UploadRecord = {
    id: result.id,
    link: result.link,
    filename: `${result.id}.png`,
    size: buffer.length,
    timestamp: Date.now(),
    expiresAt
  }

  addUploadRecord(record)

  return result.link
}

// Export individual uploaders for testing
export { mockUpload, cloudflareR2Upload, generateShortId }
