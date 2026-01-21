import { createHash, createHmac } from 'crypto'
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

  const canonicalHeaders =
    `content-length:${buffer.length}\n` +
    `content-type:image/png\n` +
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
      'Content-Type': 'image/png',
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
