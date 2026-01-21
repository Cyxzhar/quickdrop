/**
 * QuickDrop Cloudflare Worker
 * Serves images from R2 bucket with auto-expiry
 */

export interface Env {
  QUICKDROP_BUCKET: R2Bucket
}

// HTML template for the image viewer page
function getViewerHTML(imageUrl: string, imageId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickDrop - ${imageId}</title>
  <meta property="og:title" content="Shared via QuickDrop">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:type" content="image">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${imageUrl}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      background: #0f0f23;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
    }
    .container {
      max-width: 100%;
      text-align: center;
    }
    .image-wrapper {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
    img {
      max-width: 100%;
      max-height: 80vh;
      border-radius: 8px;
      display: block;
    }
    .footer {
      margin-top: 24px;
      color: #6b6b7b;
      font-size: 14px;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .actions {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
    }
    .btn-secondary {
      background: #1a1a2e;
      color: #a0a0b0;
      border: 1px solid #2d2d4a;
    }
    .btn:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }
    .expires {
      margin-top: 12px;
      font-size: 12px;
      color: #f59e0b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="image-wrapper">
      <img src="${imageUrl}" alt="Shared screenshot">
    </div>
    <div class="actions">
      <a href="${imageUrl}" download="${imageId}.png" class="btn btn-primary">Download</a>
      <a href="${imageUrl}" target="_blank" class="btn btn-secondary">Open Original</a>
    </div>
    <p class="expires">This image will automatically expire after 24 hours</p>
    <p class="footer">
      Shared via <a href="https://quickdrop.app">QuickDrop</a> - Screenshot to link in 1 second
    </p>
  </div>
</body>
</html>`
}

// Error page HTML
function getErrorHTML(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickDrop - Not Found</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      background: #0f0f23;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
      padding: 20px;
      text-align: center;
    }
    h1 { font-size: 72px; opacity: 0.5; }
    p { margin-top: 16px; color: #a0a0b0; }
    a {
      margin-top: 24px;
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <h1>404</h1>
  <p>${message}</p>
  <a href="https://quickdrop.app">Get QuickDrop</a>
</body>
</html>`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, X-Amz-Content-SHA256, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      })
    }

    // Root path - redirect to main site
    if (path === '/' || path === '') {
      return Response.redirect('https://quickdrop.app', 302)
    }

    // Extract image ID from path (e.g., /abc123 or /abc123.png)
    const imageId = path.slice(1).replace(/\.png$/, '')

    // Validate image ID format (6 alphanumeric characters)
    if (!/^[a-z0-9]{6}$/.test(imageId)) {
      return new Response(getErrorHTML('Invalid image ID'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const filename = `${imageId}.png`

    // Check if requesting raw image
    const wantsRawImage =
      path.endsWith('.png') ||
      request.headers.get('Accept')?.includes('image/') ||
      url.searchParams.has('raw')

    try {
      // Fetch the object from R2
      const object = await env.QUICKDROP_BUCKET.get(filename)

      if (!object) {
        return new Response(getErrorHTML('This image has expired or does not exist'), {
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        })
      }

      // Return raw image
      if (wantsRawImage) {
        const headers = new Headers()
        headers.set('Content-Type', 'image/png')
        headers.set('Cache-Control', 'public, max-age=3600')
        headers.set('Access-Control-Allow-Origin', '*')

        if (object.httpMetadata?.contentDisposition) {
          headers.set('Content-Disposition', object.httpMetadata.contentDisposition)
        }

        return new Response(object.body, { headers })
      }

      // Return HTML viewer page
      const imageUrl = `${url.origin}/${imageId}.png`
      return new Response(getViewerHTML(imageUrl, imageId), {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      })
    } catch (error) {
      console.error('Error fetching image:', error)
      return new Response(getErrorHTML('An error occurred while loading the image'), {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      })
    }
  },

  // Scheduled handler for cleaning up expired images
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now()
    console.log(`[Cleanup] Starting cleanup job at ${new Date().toISOString()}`)

    const EXPIRY_HOURS = 24
    const expiryTime = Date.now() - EXPIRY_HOURS * 60 * 60 * 1000

    let deletedCount = 0
    let scannedCount = 0
    let cursor: string | undefined

    try {
      // Paginate through all objects in the bucket
      do {
        const listed = await env.QUICKDROP_BUCKET.list({
          cursor,
          limit: 1000 // Process 1000 objects at a time
        })

        scannedCount += listed.objects.length

        // Delete expired objects
        for (const object of listed.objects) {
          if (object.uploaded.getTime() < expiryTime) {
            await env.QUICKDROP_BUCKET.delete(object.key)
            deletedCount++
            console.log(`[Cleanup] Deleted expired image: ${object.key} (uploaded: ${object.uploaded.toISOString()})`)
          }
        }

        cursor = listed.cursor
      } while (cursor)

      const duration = Date.now() - startTime
      console.log(`[Cleanup] Cleanup complete in ${duration}ms. Scanned: ${scannedCount}, Deleted: ${deletedCount} expired images.`)
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[Cleanup] Cleanup job failed after ${duration}ms. Scanned: ${scannedCount}, Deleted: ${deletedCount}`, error)
      throw error // Re-throw for monitoring systems
    }
  }
}
