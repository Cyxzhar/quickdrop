import Tesseract from 'tesseract.js'

export async function extractText(imageFile: File | Blob): Promise<string> {
  try {
    console.log('[OCR] Starting text extraction...')
    const startTime = Date.now()

    const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round((m.progress || 0) * 100)}%`)
        }
      }
    })

    const duration = Date.now() - startTime
    const charCount = text.trim().length
    console.log(`[OCR] Completed in ${(duration / 1000).toFixed(1)}s. Extracted ${charCount} characters`)

    return text.trim()
  } catch (error) {
    console.error('[OCR] Failed to extract text:', error)
    return ''
  }
}
