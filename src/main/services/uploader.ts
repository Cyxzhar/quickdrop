import { createHash, createHmac, webcrypto } from 'crypto'
import { nativeImage } from 'electron'
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

// SHA-256 hash function
function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

// Encrypt image using AES-GCM
async function encryptImage(buffer: Buffer, password: string): Promise<Buffer> {
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const iv = webcrypto.getRandomValues(new Uint8Array(12))

  // Derive key: PBKDF2 with 100k iterations
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  const key = await webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  const ciphertext = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buffer
  )

  // Payload: salt (16) + iv (12) + ciphertext
  return Buffer.concat([
    Buffer.from(salt),
    Buffer.from(iv),
    Buffer.from(ciphertext)
  ])
}

// Mock uploader for local development
async function mockUpload(
  buffer: Buffer,
  onProgress?: ProgressCallback,
  isEncrypted: boolean = false
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
  // Append ?p=true if encrypted
  const link = `https://drop.to/${id}${isEncrypted ? '?p=true' : ''}`

  console.log(`[MockUpload] Uploaded ${buffer.length} bytes. ID: ${id} (Encrypted: ${isEncrypted})`)

  return { id, link }
}

// Real Cloudflare R2 uploader using S3-compatible API
async function cloudflareR2Upload(
  buffer: Buffer,
  onProgress?: ProgressCallback,
  isEncrypted: boolean = false
): Promise<{ id: string; link: string }> {
  const config = getConfig()
  const id = generateShortId()
  // Use .enc extension if encrypted
  const filename = isEncrypted ? `${id}.enc` : `${id}.png`

  // Cloudflare R2 uses S3-compatible API
  const host = `${config.cloudflareAccountId}.r2.cloudflarestorage.com`
  const url = `https://${host}/${config.cloudflareR2Bucket}/${filename}`

  // Create AWS Signature V4 for authentication
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const region = 'auto'
  const service = 's3'

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`

  // Calculate content hash using SHA-256 (NOT HMAC)
  const contentHash = sha256(buffer)

  // Canonical request components
  const canonicalUri = `/${config.cloudflareR2Bucket}/${filename}`
  const canonicalQueryString = ''

  const contentType = isEncrypted ? 'application/octet-stream' : 'image/png'

  const canonicalHeaders =
    `content-length:${buffer.length}\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${contentHash}\n` +
    `x-amz-date:${amzDate}\n`

  const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest =
    `PUT\n` +
    `${canonicalUri}\n` +
    `${canonicalQueryString}\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${contentHash}`

  // Hash the canonical request using SHA-256 (NOT HMAC)
  const canonicalRequestHash = sha256(canonicalRequest)

  // String to sign
  const stringToSign =
    `AWS4-HMAC-SHA256\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    `${canonicalRequestHash}`

  // Calculate signature key using HMAC-SHA256
  const getSignatureKey = (key: string, dateStamp: string, region: string, service: string): Buffer => {
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

  // Calculate final signature using HMAC-SHA256
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${config.cloudflareAccessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`

  // Report initial progress
  if (onProgress) {
    onProgress({ uploaded: 0, total: buffer.length, percentage: 0 })
  }

  // Perform the upload
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'Host': host,
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
  const link = `${config.cloudflareWorkerUrl}/${id}${isEncrypted ? '?p=true' : ''}`

  console.log(`[CloudflareR2] Uploaded ${buffer.length} bytes. ID: ${id} (Encrypted: ${isEncrypted})`)

  return { id, link }
}

// Main upload function - chooses between mock and real based on config
export async function uploadImage(
  buffer: Buffer,
  onProgress?: ProgressCallback
): Promise<string> {
  const config = getConfig()
  const expiresAt = Date.now() + config.expiryHours * 60 * 60 * 1000

  let uploadBuffer = buffer
  let isEncrypted = false

  // Check for password protection
  if (config.enablePasswordProtection && config.defaultPassword) {
    try {
      console.log('Encrypting image before upload...')
      uploadBuffer = await encryptImage(buffer, config.defaultPassword)
      isEncrypted = true
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt image')
    }
  }

  let result: { id: string; link: string }

  if (config.useMockUploader || !isCloudflareConfigured()) {
    result = await mockUpload(uploadBuffer, onProgress, isEncrypted)
  } else {
    result = await cloudflareR2Upload(uploadBuffer, onProgress, isEncrypted)
  }

  // Generate thumbnail for UI (resize to max 100x100)
  // We use the ORIGINAL buffer for thumbnail (not encrypted) so we can see it in history
  const image = nativeImage.createFromBuffer(buffer)
  const thumbnail = image.resize({ height: 100 }).toDataURL()

  // Create and store the upload record
  const record: UploadRecord = {
    id: result.id,
    link: result.link,
    filename: isEncrypted ? `${result.id}.enc` : `${result.id}.png`,
    title: `Screenshot ${new Date().toLocaleTimeString()}`, // Default title
    thumbnail: thumbnail,
    size: uploadBuffer.length,
    timestamp: Date.now(),
    expiresAt
  }

  addUploadRecord(record)

  return result.link
}

// Export individual uploaders for testing
export { mockUpload, cloudflareR2Upload, generateShortId }
