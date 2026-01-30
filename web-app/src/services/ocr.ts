import Tesseract from 'tesseract.js'

/**
 * Clean and filter OCR text to remove gibberish and improve quality
 */
function cleanOCRText(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) return ''

  // Split into lines
  let lines = rawText.split('\n')

  // Filter and clean each line
  lines = lines
    .map(line => {
      // Remove excessive whitespace
      line = line.replace(/\s+/g, ' ').trim()

      // Remove lines that are just symbols or too short to be meaningful
      if (line.length < 2) return ''

      // Remove lines with too many special characters (>50% of line)
      const specialCharCount = (line.match(/[^a-zA-Z0-9\s.,!?;:()\-–—'"/]/g) || []).length
      if (specialCharCount / line.length > 0.5) return ''

      // Remove lines that are mostly numbers and symbols (like "8&7" or "o—.")
      const alphaCount = (line.match(/[a-zA-Z]/g) || []).length
      if (alphaCount === 0 && line.length < 4) return ''

      // Clean up common OCR errors
      line = line
        // Remove isolated special characters at start/end
        .replace(/^[^a-zA-Z0-9\s]+|[^a-zA-Z0-9\s.!?,;:)]+$/g, '')
        // Fix common OCR mistakes
        .replace(/\s+([.,!?;:])/g, '$1') // Remove space before punctuation
        .replace(/([.,!?;:])\s*([.,!?;:])/g, '$1') // Remove duplicate punctuation

      return line
    })
    .filter(line => {
      // Keep only meaningful lines
      if (line.length === 0) return false

      // Remove lines with gibberish patterns (random mix of letters, numbers, symbols)
      // Keep if it has at least 3 consecutive letters (likely a word)
      const hasWords = /[a-zA-Z]{3,}/.test(line)
      if (!hasWords && line.length < 10) return false

      return true
    })

  // Remove excessive empty lines (max 1 empty line between content)
  let cleanedText = lines.join('\n')
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n')

  return cleanedText.trim()
}

export async function extractText(imageFile: File | Blob): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      preserve_interword_spaces: '1',
    })

    // Clean and filter the text
    const cleanedText = cleanOCRText(text)

    // Only return if we have meaningful text after cleaning
    return cleanedText.length > 10 ? cleanedText : ''
  } catch (error) {
    console.error('[OCR] Extraction failed:', error)
    return ''
  }
}
