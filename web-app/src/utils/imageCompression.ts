import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/png'
  }

  try {
    const compressed = await imageCompression(file, options)
    const sizeBefore = (file.size / 1024 / 1024).toFixed(2)
    const sizeAfter = (compressed.size / 1024 / 1024).toFixed(2)
    console.log(`[Compression] Reduced from ${sizeBefore}MB to ${sizeAfter}MB`)
    return compressed
  } catch (error) {
    console.error('[Compression] Failed:', error)
    return file // Return original if compression fails
  }
}
