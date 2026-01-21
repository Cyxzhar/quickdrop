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

// Landing page HTML
function getLandingHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickDrop - Screenshot to Link in 1 Second</title>
  <meta name="description" content="Transform screenshots into shareable links instantly. Auto-upload, 24h auto-expiry, cross-platform. 100% free forever.">
  <meta property="og:title" content="QuickDrop - Screenshot Sharing Made Simple">
  <meta property="og:description" content="Transform screenshots into shareable links instantly. No apps to open, no files to find, no BS.">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg-primary: #0f0f23; --bg-secondary: #1a1a2e; --bg-tertiary: #16213e;
      --accent: #6366f1; --gradient: linear-gradient(135deg, #6366f1, #8b5cf6);
      --text: #ffffff; --text-sec: #a0a0b0; --border: #2d2d4a;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-primary); color: var(--text); line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    nav { padding: 24px 0; border-bottom: 1px solid var(--border); }
    nav .container { display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 24px; font-weight: 700; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .nav-links { display: flex; gap: 32px; }
    .nav-links a { color: var(--text-sec); text-decoration: none; font-size: 15px; font-weight: 500; }
    .hero { padding: 120px 0 80px; text-align: center; }
    .hero h1 { font-size: 64px; font-weight: 800; margin-bottom: 24px; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 24px; color: var(--text-sec); max-width: 700px; margin: 0 auto 48px; }
    .btn { padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; gap: 8px; transition: all 0.2s; border: none; }
    .btn-primary { background: var(--gradient); color: white; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4); }
    .btn-primary:hover { transform: translateY(-2px); }
    .features { padding: 80px 0; background: var(--bg-secondary); }
    .features h2 { text-align: center; font-size: 48px; margin-bottom: 64px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; }
    .card { background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 16px; padding: 32px; }
    .card:hover { transform: translateY(-4px); border-color: var(--accent); transition: all 0.2s; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    .card h3 { font-size: 24px; margin-bottom: 12px; }
    .card p { color: var(--text-sec); }
    footer { padding: 48px 0; border-top: 1px solid var(--border); text-align: center; color: var(--text-sec); }
    @media (max-width: 768px) { .hero h1 { font-size: 42px; } .hero p { font-size: 18px; } }
  </style>
</head>
<body>
  <nav>
    <div class="container">
      <div class="logo">📸 QuickDrop</div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="https://github.com/quickdrop/quickdrop-app">GitHub</a>
      </div>
    </div>
  </nav>
  <section class="hero">
    <div class="container">
      <h1>Screenshot to Link<br>in 1 Second</h1>
      <p>Transform screenshots into shareable links instantly. No apps to open, no files to find, no BS.</p>
      <button id="download-btn" class="btn btn-primary">
        <span>⬇️</span><span id="download-text">Download for Mac</span>
      </button>
    </div>
  </section>
  <section id="features" class="features">
    <div class="container">
      <h2>Features</h2>
      <div class="grid">
        <div class="card"><div class="icon">⚡</div><h3>Instant Upload</h3><p>Take a screenshot and get a shareable link in under 1 second.</p></div>
        <div class="card"><div class="icon">🔒</div><h3>Privacy First</h3><p>All screenshots automatically expire after 24 hours.</p></div>
        <div class="card"><div class="icon">📋</div><h3>Clipboard Magic</h3><p>Screenshots are automatically replaced with shareable links.</p></div>
        <div class="card"><div class="icon">📱</div><h3>System Tray</h3><p>Lives in your system tray with upload status and history.</p></div>
        <div class="card"><div class="icon">🌍</div><h3>Universal Sharing</h3><p>Links work everywhere: Slack, Discord, Email, SMS.</p></div>
        <div class="card"><div class="icon">🎨</div><h3>Beautiful Viewer</h3><p>Recipients see screenshots in a clean, modern viewer.</p></div>
      </div>
    </div>
  </section>
  <footer>
    <div class="container"><p>Built with ♥️ by the QuickDrop community • <a href="https://github.com/quickdrop/quickdrop-app">GitHub</a></p></div>
  </footer>
  <script>
    const platform = navigator.platform.toLowerCase();
    const btn = document.getElementById('download-btn');
    const text = document.getElementById('download-text');
    const urls = {
      mac: 'https://github.com/quickdrop/quickdrop-app/releases/latest/download/QuickDrop-mac.dmg',
      windows: 'https://github.com/quickdrop/quickdrop-app/releases/latest/download/QuickDrop-setup.exe',
      linux: 'https://github.com/quickdrop/quickdrop-app/releases/latest/download/QuickDrop-linux.AppImage'
    };
    let detected = 'mac';
    if (platform.includes('win')) { detected = 'windows'; text.textContent = 'Download for Windows'; }
    else if (platform.includes('linux')) { detected = 'linux'; text.textContent = 'Download for Linux'; }
    btn.onclick = () => window.location.href = urls[detected];
  </script>
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
  <a href="/">Go Home</a>
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

    // Root path - serve landing page
    if (path === '/' || path === '') {
      return new Response(getLandingHTML(), {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600'
        }
      })
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
