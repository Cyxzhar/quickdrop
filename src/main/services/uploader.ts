import { randomUUID } from 'crypto'

export async function uploadImage(buffer: Buffer): Promise<string> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Generate 6-char ID
  const id = randomUUID().replace(/-/g, '').slice(0, 6)

  console.log(`[MockUpload] Uploaded ${buffer.length} bytes. ID: ${id}`)

  // Return the mock link
  return `https://drop.to/${id}`
}
