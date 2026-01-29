/**
 * AI Vision Service
 * Analyzes screenshots using Claude API to generate titles, tags, and descriptions
 */

export interface AIAnalysisResult {
  title: string
  tags: string[]
  category: 'bug-report' | 'tutorial' | 'note' | 'code' | 'design' | 'data' | 'screenshot' | 'other'
  description: string
  confidence: number
  detectedUrls: string[]
  entities: {
    names?: string[]
    dates?: string[]
    numbers?: string[]
    technologies?: string[]
  }
}

/**
 * Analyze screenshot using Claude API
 */
export async function analyzeScreenshot(
  imageUrl: string,
  ocrText: string,
  apiKey: string
): Promise<AIAnalysisResult> {
  try {
    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image for analysis')
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = arrayBufferToBase64(imageBuffer)
    const mimeType = imageResponse.headers.get('content-type') || 'image/png'

    // Prepare prompt for Claude
    const prompt = buildAnalysisPrompt(ocrText)

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Fast and cheap for this use case
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[AI] Claude API error:', error)
      throw new Error(`Claude API failed: ${response.status}`)
    }

    const result = await response.json()
    const analysisText = result.content[0].text

    // Parse structured response
    return parseAIResponse(analysisText, ocrText)
  } catch (error) {
    console.error('[AI] Analysis failed:', error)

    // Return fallback analysis based on OCR text only
    return generateFallbackAnalysis(ocrText)
  }
}

/**
 * Build analysis prompt for Claude
 */
function buildAnalysisPrompt(ocrText: string): string {
  return `Analyze this screenshot and provide structured metadata in JSON format.

${ocrText ? `OCR Text extracted from image:\n${ocrText.substring(0, 2000)}\n` : ''}

Provide your analysis in this EXACT JSON format:
{
  "title": "5-8 word descriptive title",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "bug-report|tutorial|note|code|design|data|screenshot|other",
  "description": "2-3 sentence summary of what this screenshot shows",
  "confidence": 0.85,
  "detectedUrls": ["https://example.com"],
  "entities": {
    "names": ["PersonName", "CompanyName"],
    "dates": ["2024-01-29"],
    "numbers": ["27017", "3000"],
    "technologies": ["MongoDB", "React", "Node.js"]
  }
}

Guidelines:
- title: Short, descriptive, useful for search (e.g., "MongoDB Connection Error Port 27017")
- tags: 3-5 relevant keywords (lowercase, no spaces, use-dashes)
- category: Choose the best fit category
- description: Clear summary of what the screenshot contains and its purpose
- confidence: Your confidence in this analysis (0-1)
- detectedUrls: Any URLs visible in the screenshot
- entities: Key information extracted (names, dates, technical terms, etc.)

Return ONLY the JSON, no other text.`
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(responseText: string, ocrText: string): AIAnalysisResult {
  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Also extract URLs from OCR text
    const urlsFromOcr = extractUrlsFromText(ocrText)
    const allUrls = [...new Set([...(parsed.detectedUrls || []), ...urlsFromOcr])]

    return {
      title: parsed.title || 'Untitled Screenshot',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      category: parsed.category || 'other',
      description: parsed.description || '',
      confidence: parsed.confidence || 0.5,
      detectedUrls: allUrls,
      entities: parsed.entities || {},
    }
  } catch (error) {
    console.error('[AI] Failed to parse response:', error)
    return generateFallbackAnalysis(ocrText)
  }
}

/**
 * Generate fallback analysis when AI fails
 */
function generateFallbackAnalysis(ocrText: string): AIAnalysisResult {
  const urls = extractUrlsFromText(ocrText)
  const words = ocrText.toLowerCase().split(/\s+/)

  // Simple keyword extraction for tags
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
  const tags = [...new Set(words)]
    .filter(w => w.length > 3 && !commonWords.has(w))
    .slice(0, 5)

  // Generate simple title from first line or filename
  const firstLine = ocrText.split('\n')[0]?.trim() || 'Screenshot'
  const title = firstLine.substring(0, 50)

  return {
    title,
    tags,
    category: 'screenshot',
    description: ocrText.substring(0, 200),
    confidence: 0.3,
    detectedUrls: urls,
    entities: {},
  }
}

/**
 * Extract URLs from text using regex
 */
function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlRegex) || []

  // Validate and clean URLs
  return [...new Set(matches)]
    .filter(url => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    })
    .slice(0, 10) // Limit to 10 URLs
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
