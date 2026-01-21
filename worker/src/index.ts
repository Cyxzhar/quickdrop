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

// Password protected viewer HTML
function getPasswordProtectedViewerHTML(imageUrl: string, imageId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickDrop - Password Protected</title>
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
      color: white;
    }
    .container {
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .card {
      background: #1a1a2e;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      border: 1px solid #2d2d4a;
    }
    .icon { font-size: 48px; margin-bottom: 24px; }
    h2 { margin-bottom: 8px; }
    p { color: #a0a0b0; margin-bottom: 24px; }
    input {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #2d2d4a;
      background: #0f0f23;
      color: white;
      margin-bottom: 16px;
      font-size: 16px;
    }
    input:focus { outline: none; border-color: #6366f1; }
    button {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    #status { margin-top: 16px; font-size: 14px; min-height: 20px; }
    #image-wrapper { margin-top: 20px; display: none; }
    img { max-width: 100%; border-radius: 8px; }
    .footer { margin-top: 24px; font-size: 12px; color: #6b6b7b; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container" id="main-container">
    <div class="card">
      <div class="icon">🔒</div>
      <h2>Password Protected</h2>
      <p>Enter password to view this screenshot</p>
      <input type="password" id="password" placeholder="Enter password" onkeyup="if(event.key==='Enter') decryptAndShow()">
      <button onclick="decryptAndShow()">Unlock</button>
      <div id="status"></div>
    </div>
  </div>
  
  <div id="image-wrapper" style="width: 100%; max-width: 1000px; text-align: center;">
    <img id="decrypted-image">
    <div style="margin-top: 20px;">
        <a id="download-link" class="btn" style="color: #6366f1; text-decoration: none;">Download Decrypted</a>
    </div>
  </div>

  <p class="footer">
    Shared via <a href="https://quickdrop.app">QuickDrop</a>
  </p>

  <script>
    async function decryptAndShow() {
      const password = document.getElementById('password').value;
      const status = document.getElementById('status');
      
      if (!password) {
        status.textContent = 'Please enter a password';
        status.style.color = '#ef4444';
        return;
      }

      status.textContent = 'Decrypting...';
      status.style.color = '#a0a0b0';

      try {
        // Fetch encrypted blob
        const response = await fetch('${imageUrl}');
        if (!response.ok) throw new Error('Failed to load image data');
        const data = new Uint8Array(await response.arrayBuffer());

        // Extract parts: salt(16) + iv(12) + ciphertext
        if (data.length < 28) throw new Error('Invalid file format');
        
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const ciphertext = data.slice(28);

        // Import password
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(password),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        // Derive key
        const key = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          ciphertext
        );

        // Show image
        const blob = new Blob([decrypted], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        
        document.getElementById('decrypted-image').src = url;
        document.getElementById('download-link').href = url;
        document.getElementById('download-link').download = '${imageId}.png';
        
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('image-wrapper').style.display = 'block';
        
      } catch (error) {
        console.error(error);
        status.textContent = 'Incorrect password or decryption failed';
        status.style.color = '#ef4444';
      }
    }
  </script>
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
    // Supports both .png and .enc extensions
    const imageId = path.slice(1).replace(/\.(png|enc)$/, '')

    // Validate image ID format (6 alphanumeric characters)
    if (!/^[a-z0-9]{6}$/.test(imageId)) {
      return new Response(getErrorHTML('Invalid image ID'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const wantsRaw =
      path.endsWith('.png') ||
      path.endsWith('.enc') ||
      request.headers.get('Accept')?.includes('image/') ||
      url.searchParams.has('raw')

    const isPasswordProtected = url.searchParams.has('p')

    // Determine filename to look for
    // If specifically requested .enc, look for that
    // If specifically requested .png, look for that
    // If generic ID, try based on p param or check existence
    
    try {
      let object: R2ObjectBody | null = null
      let isEncrypted = false

      // 1. Try to find the file based on extension if provided
      if (path.endsWith('.enc')) {
        object = await env.QUICKDROP_BUCKET.get(`${imageId}.enc`)
        if (object) isEncrypted = true
      } else if (path.endsWith('.png')) {
        object = await env.QUICKDROP_BUCKET.get(`${imageId}.png`)
      } else {
        // 2. No extension provided, try to guess or find
        if (isPasswordProtected) {
          object = await env.QUICKDROP_BUCKET.get(`${imageId}.enc`)
          if (object) isEncrypted = true
        } else {
          // Try PNG first (most common)
          object = await env.QUICKDROP_BUCKET.get(`${imageId}.png`)
          
          // Fallback to encrypted if PNG not found
          if (!object) {
            object = await env.QUICKDROP_BUCKET.get(`${imageId}.enc`)
            if (object) isEncrypted = true
          }
        }
      }

      if (!object) {
        return new Response(getErrorHTML('This image has expired or does not exist'), {
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        })
      }

      // If it's encrypted but we aren't asking for raw data (to decrypt),
      // we must serve the password viewer
      if (isEncrypted && !wantsRaw) {
        // We serve the viewer, pointing the JS to fetch the raw .enc file
        // The viewer JS will fetch /abc123.enc
        const rawUrl = `${url.origin}/${imageId}.enc`
        return new Response(getPasswordProtectedViewerHTML(rawUrl, imageId), {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
          }
        })
      }

      // Return raw image (or raw encrypted blob)
      const headers = new Headers()
      headers.set('Cache-Control', 'public, max-age=3600')
      headers.set('Access-Control-Allow-Origin', '*')

      if (isEncrypted) {
        headers.set('Content-Type', 'application/octet-stream')
        headers.set('Content-Disposition', `attachment; filename="${imageId}.enc"`)
      } else {
        headers.set('Content-Type', 'image/png')
        if (object.httpMetadata?.contentDisposition) {
          headers.set('Content-Disposition', object.httpMetadata.contentDisposition)
        }
      }

      return new Response(object.body, { headers })

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
