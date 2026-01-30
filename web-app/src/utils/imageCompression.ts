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
    return compressed
  } catch (error) {
    console.error('[Compression] Failed:', error)
    return file // Return original if compression fails
  }
}
