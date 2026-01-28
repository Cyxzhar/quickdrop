import Tesseract from 'tesseract.js'

export async function extractText(imageBuffer: Buffer): Promise<string> {
  try {
    console.log('[OCR] Starting text extraction...')

    const startTime = Date.now()

    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`)
        }
      }
    })

    const duration = Date.now() - startTime
    const extractedText = text.trim()

    console.log(`[OCR] Completed in ${duration}ms. Extracted ${extractedText.length} characters`)

    return extractedText
  } catch (error) {
    console.error('[OCR] Failed to extract text:', error)
    return ''
  }
}

export async function extractTextWithConfidence(imageBuffer: Buffer): Promise<{
  text: string
  confidence: number
}> {
  try {
    const { data } = await Tesseract.recognize(imageBuffer, 'eng')

    return {
      text: data.text.trim(),
      confidence: data.confidence
    }
  } catch (error) {
    console.error('[OCR] Failed to extract text:', error)
    return {
      text: '',
      confidence: 0
    }
  }
}
