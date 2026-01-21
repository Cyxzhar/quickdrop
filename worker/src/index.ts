/**
 * QuickDrop Cloudflare Worker
 * Serves images from R2 bucket with auto-expiry
 * 
 * Design: Lovable.dev inspired (Dark, Glassmorphism, Modern Typography)
 */

export interface Env {
  QUICKDROP_BUCKET: R2Bucket
}

// Common CSS for all pages
const COMMON_CSS = `
  :root {
    --bg-dark: #050505;
    --bg-card: rgba(20, 20, 22, 0.6);
    --border-color: rgba(255, 255, 255, 0.08);
    --primary: #6366f1;
    --primary-glow: rgba(99, 102, 241, 0.4);
    --text-main: #ffffff;
    --text-muted: #a1a1aa;
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    background-color: var(--bg-dark);
    color: var(--text-main);
    font-family: var(--font-sans);
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
  }

  /* Smooth Gradients Background */
  body::before {
    content: '';
    position: fixed;
    top: -20%;
    left: -10%;
    width: 60%;
    height: 60%;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
    z-index: -1;
    pointer-events: none;
  }
  
  body::after {
    content: '';
    position: fixed;
    bottom: -20%;
    right: -10%;
    width: 60%;
    height: 60%;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
    z-index: -1;
    pointer-events: none;
  }

  /* Utility Classes */
  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; width: 100%; }
  .flex-center { display: flex; align-items: center; justify-content: center; }
  .glass {
    background: var(--bg-card);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 15px;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border: 1px solid transparent;
  }
  .btn-primary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
  }
  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-main);
    border: 1px solid var(--border-color);
  }
  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  .glow-text {
    background: linear-gradient(to right, #818cf8, #c084fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

// HTML template for the image viewer page
function getViewerHTML(imageUrl: string, imageId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickDrop - ${imageId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/@phosphor-icons/web"></script>
  <meta property="og:title" content="Shared via QuickDrop">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:type" content="image">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${imageUrl}">
  <style>
    ${COMMON_CSS}
    
    .viewer-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    
    .image-card {
      padding: 12px;
      border-radius: 24px;
      max-width: 100%;
      box-shadow: 0 20px 80px -20px rgba(0, 0, 0, 0.8);
      position: relative;
      overflow: hidden;
    }
    
    .image-card img {
      display: block;
      max-width: 100%;
      max-height: 75vh;
      border-radius: 16px;
    }

    .meta-bar {
      margin-top: 32px;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .info-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 100px;
      background: rgba(245, 158, 11, 0.1);
      color: #fbbf24;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .brand-footer {
      margin-top: 40px;
      color: var(--text-muted);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .brand-footer a {
      color: var(--text-main);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }
    
    .brand-footer a:hover {
      color: var(--primary);
    }
  </style>
</head>
<body>
  <div class="viewer-layout">
    <div class="glass image-card">
      <img src="${imageUrl}" alt="Shared screenshot">
    </div>

    <div class="meta-bar">
      <a href="${imageUrl}" download="${imageId}.png" class="btn btn-primary">
        <i class="ph-bold ph-download-simple"></i> Download
      </a>
      <a href="${imageUrl}" target="_blank" class="btn btn-secondary">
        <i class="ph-bold ph-arrow-square-out"></i> Open Original
      </a>
    </div>

    <div style="margin-top: 24px;">
       <div class="info-badge">
         <i class="ph-fill ph-clock-countdown"></i>
         Expires in 24 hours
       </div>
    </div>

    <div class="brand-footer">
      <span>Shared via</span>
      <a href="https://quickdrop.app" class="flex-center" style="gap: 6px;">
        <i class="ph-fill ph-lightning" style="color: var(--primary);"></i> QuickDrop
      </a>
    </div>
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
  <title>QuickDrop - Secured</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/@phosphor-icons/web"></script>
  <style>
    ${COMMON_CSS}
    
    .auth-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 40px;
      border-radius: 24px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }

    .lock-icon {
      width: 64px;
      height: 64px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 20px;
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 24px;
    }

    h2 { font-size: 24px; margin-bottom: 8px; font-weight: 700; }
    p { color: var(--text-muted); margin-bottom: 32px; font-size: 15px; }

    .input-group { position: relative; margin-bottom: 16px; }
    
    input {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-color);
      padding: 14px 16px;
      border-radius: 12px;
      color: white;
      font-family: inherit;
      font-size: 16px;
      transition: all 0.2s;
    }
    
    input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      background: rgba(0, 0, 0, 0.4);
    }

    .full-width { width: 100%; justify-content: center; }

    #status {
      min-height: 24px;
      margin-top: 16px;
      font-size: 14px;
      font-weight: 500;
    }

    .error-msg { color: #ef4444; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .success-msg { color: #10b981; }

    #image-wrapper { display: none; width: 100%; animation: fadeUp 0.5s ease-out; }
    
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .decrypted-card {
      padding: 12px;
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    
    .decrypted-card img {
      width: 100%;
      border-radius: 12px;
      display: block;
    }
  </style>
</head>
<body>
  <div class="auth-layout" id="main-container">
    <div class="glass auth-card">
      <div class="lock-icon">
        <i class="ph-fill ph-lock-key"></i>
      </div>
      <h2>Protected Content</h2>
      <p>This screenshot is password protected. Enter the key to unlock it.</p>
      
      <div class="input-group">
        <input type="password" id="password" placeholder="Enter password..." onkeyup="if(event.key==='Enter') decryptAndShow()">
      </div>
      
      <button onclick="decryptAndShow()" class="btn btn-primary full-width">
        <i class="ph-bold ph-lock-open"></i> Unlock
      </button>
      
      <div id="status"></div>
    </div>
  </div>
  
  <div class="auth-layout" id="image-wrapper">
    <div class="container" style="max-width: 900px;">
      <div class="glass decrypted-card">
        <img id="decrypted-image">
      </div>
      
      <div class="flex-center" style="gap: 16px;">
        <a id="download-link" class="btn btn-primary">
          <i class="ph-bold ph-download-simple"></i> Download
        </a>
        <button onclick="location.reload()" class="btn btn-secondary">
          <i class="ph-bold ph-lock-key"></i> Lock Again
        </button>
      </div>
    </div>
  </div>

  <script>
    async function decryptAndShow() {
      const password = document.getElementById('password').value;
      const status = document.getElementById('status');
      
      if (!password) {
        status.innerHTML = '<span class="error-msg"><i class="ph-bold ph-warning-circle"></i> Password required</span>';
        return;
      }

      status.innerHTML = '<span style="color: var(--text-muted)">Decrypting...</span>';

      try {
        const response = await fetch('${imageUrl}');
        if (!response.ok) throw new Error('Failed to load');
        const data = new Uint8Array(await response.arrayBuffer());

        if (data.length < 28) throw new Error('Invalid format');
        
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const ciphertext = data.slice(28);

        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(password),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv }, key, ciphertext
        );

        const blob = new Blob([decrypted], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        
        document.getElementById('decrypted-image').src = url;
        document.getElementById('download-link').href = url;
        document.getElementById('download-link').download = '${imageId}.png';
        
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('image-wrapper').style.display = 'flex';
        
      } catch (error) {
        console.error(error);
        status.innerHTML = '<span class="error-msg"><i class="ph-bold ph-x-circle"></i> Incorrect password</span>';
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
  <meta name="description" content="Transform screenshots into shareable links instantly.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/@phosphor-icons/web"></script>
  <style>
    ${COMMON_CSS}

    nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 50;
      border-bottom: 1px solid var(--border-color);
      background: rgba(5, 5, 5, 0.8);
      backdrop-filter: blur(12px);
    }
    nav .container {
      height: 70px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-links { display: flex; gap: 32px; }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: var(--text-main); }

    .hero {
      padding: 160px 0 100px;
      text-align: center;
      position: relative;
    }
    
    h1 {
      font-size: 72px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
      letter-spacing: -2px;
    }
    
    .subtitle {
      font-size: 20px;
      color: var(--text-muted);
      max-width: 600px;
      margin: 0 auto 48px;
    }

    .features { padding: 100px 0; }
    .features-header { text-align: center; margin-bottom: 64px; }
    .features-header h2 { font-size: 42px; font-weight: 700; margin-bottom: 16px; letter-spacing: -1px; }
    .features-header p { color: var(--text-muted); font-size: 18px; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }

    .card {
      padding: 32px;
      border-radius: 20px;
      transition: transform 0.3s ease;
    }
    .card:hover { transform: translateY(-4px); border-color: rgba(99, 102, 241, 0.3); }
    
    .icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(99, 102, 241, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      font-size: 24px;
      margin-bottom: 20px;
    }

    h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .card p { color: var(--text-muted); font-size: 15px; }

    .download-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      justify-content: center;
      font-size: 13px;
      color: var(--text-muted);
    }

    footer {
      border-top: 1px solid var(--border-color);
      padding: 60px 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }
    footer a { color: var(--text-main); text-decoration: none; }
    
    @media (max-width: 768px) {
      h1 { font-size: 48px; }
      .hero { padding: 120px 0 60px; }
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="container">
      <div class="logo">
        <i class="ph-fill ph-lightning" style="color: var(--primary);"></i>
        QuickDrop
      </div>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="https://github.com/quickdrop/quickdrop-app">GitHub</a>
      </div>
    </div>
  </nav>

  <section class="hero">
    <div class="container">
      <h1>Screenshot to Link<br><span class="glow-text">in 1 Second</span></h1>
      <p class="subtitle">Transform screenshots into shareable links instantly. No apps to open, no files to find, just pure speed.</p>
      
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <button id="download-btn" class="btn btn-primary" style="padding: 16px 32px; font-size: 18px;">
          <i class="ph-bold ph-download-simple"></i>
          <span id="download-text">Download for Mac</span>
        </button>
        <div class="download-badge">
          <span><i class="ph-fill ph-check-circle" style="color: #10b981"></i> Free Forever</span>
          <span>•</span>
          <span>v1.0.0</span>
          <span>•</span>
          <span>Open Source</span>
        </div>
      </div>
    </div>
  </section>

  <section id="features" class="features">
    <div class="container">
      <div class="features-header">
        <h2>Designed for Speed</h2>
        <p>Everything you need to share faster, and nothing you don't.</p>
      </div>
      
      <div class="grid">
        <div class="glass card">
          <div class="icon-box"><i class="ph-fill ph-lightning"></i></div>
          <h3>Instant Upload</h3>
          <p>Detects new screenshots automatically and uploads them instantly. The link is copied to your clipboard before you can blink.</p>
        </div>
        <div class="glass card">
          <div class="icon-box"><i class="ph-fill ph-shield-check"></i></div>
          <h3>Privacy First</h3>
          <p>We don't want your data. All uploads automatically expire and delete themselves after 24 hours. No traces left behind.</p>
        </div>
        <div class="glass card">
          <div class="icon-box"><i class="ph-fill ph-lock-key"></i></div>
          <h3>End-to-End Security</h3>
          <p>Optional password protection with client-side encryption. We can't see your images even if we wanted to.</p>
        </div>
        <div class="glass card">
          <div class="icon-box"><i class="ph-fill ph-globe"></i></div>
          <h3>Universal Sharing</h3>
          <p>Links work everywhere—Slack, Discord, Linear, or SMS. Recipients get a beautiful viewing experience on any device.</p>
        </div>
        <div class="glass card">
          <div class="icon-box"><i class="ph-fill ph-copy"></i></div>
          <h3>Clipboard Magic</h3>
          <p>QuickDrop silently replaces the raw image in your clipboard with a shareable URL. Just Paste (Cmd+V) and you're done.</p>
        </div>
        <div class="glass card">
          <div class="icon-box"><i class="ph-fill ph-code"></i></div>
          <h3>Open Source</h3>
          <p>Built by developers, for developers. Check our code on GitHub, contribute features, or self-host your own instance.</p>
        </div>
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <p>Built with <i class="ph-fill ph-heart" style="color: #ef4444"></i> by the QuickDrop community</p>
      <p style="margin-top: 8px; opacity: 0.6; font-size: 13px;">Released under MIT License</p>
    </div>
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/@phosphor-icons/web"></script>
  <style>
    ${COMMON_CSS}
    .error-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
    }
    h1 { font-size: 120px; font-weight: 800; line-height: 1; margin: 0; opacity: 0.2; }
    p { margin-top: 24px; color: var(--text-muted); font-size: 18px; margin-bottom: 40px; }
  </style>
</head>
<body>
  <div class="error-layout">
    <h1>404</h1>
    <p>${message}</p>
    <a href="/" class="btn btn-primary">
      <i class="ph-bold ph-house"></i> Go Home
    </a>
  </div>
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