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
 * Analyze screenshot OCR text using Perplexity API (text-only analysis)
 * Note: Perplexity doesn't support vision, so we analyze OCR text instead
 */
export async function analyzeScreenshot(
  imageUrl: string,
  ocrText: string,
  apiKey: string
): Promise<AIAnalysisResult> {
  try {
    // If no OCR text, use fallback
    if (!ocrText || ocrText.trim().length < 10) {
      console.log('[AI] No OCR text available, using fallback analysis')
      return generateFallbackAnalysis(ocrText)
    }

    // Prepare prompt for Perplexity
    const prompt = buildAnalysisPrompt(ocrText)

    // Call Perplexity API (text-only analysis)
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar', // Perplexity's base model
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing text content extracted from screenshots. Respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.2, // Lower for consistent JSON output
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI] Perplexity API error:', errorText)
      throw new Error(`Perplexity API failed: ${response.status}`)
    }

    const result = await response.json()
    const analysisText = result.choices[0].message.content

    console.log('[AI] Perplexity response:', analysisText.substring(0, 200))

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

