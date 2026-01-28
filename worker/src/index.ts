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
function getViewerHTML(imageUrl: string, imageId: string, ocrText?: string): string {
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

    ${ocrText && ocrText.trim().length > 0 ? `
    <div class="glass" style="margin-top: 32px; max-width: 700px; width: 100%; padding: 24px; border-radius: 16px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          <i class="ph-bold ph-text-aa"></i> Extracted Text
        </h3>
        <button onclick="copyOCRText()" class="btn btn-secondary" style="padding: 8px 16px; font-size: 14px;">
          <i class="ph-bold ph-copy"></i> Copy Text
        </button>
      </div>
      <pre id="ocr-text" style="
        background: rgba(255, 255, 255, 0.03);
        padding: 16px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: var(--text-main);
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-x: auto;
        border: 1px solid var(--border-color);
      ">${ocrText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>

    <script>
      function copyOCRText() {
        const text = document.getElementById('ocr-text').textContent;
        navigator.clipboard.writeText(text).then(() => {
          const btn = event.target.closest('button');
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<i class="ph-bold ph-check"></i> Copied!';
          btn.style.background = 'rgba(16, 185, 129, 0.2)';
          btn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          btn.style.color = '#10b981';

          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
          }, 2000);
        });
      }
    </script>
    ` : ''}

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
  <title>QuickDrop - Stop Leaking Private Screenshots | Privacy-First Screenshot Sharing</title>
  <meta name="description" content="Gyazo keeps your screenshots forever. QuickDrop deletes them after 24h. Self-hosted, encrypted, open-source screenshot sharing for developers who value privacy.">
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
      background: rgba(5, 5, 5, 0.95);
      backdrop-filter: blur(20px);
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
    .nav-links { display: flex; gap: 32px; align-items: center; }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: var(--text-main); }

    .hero {
      padding: 180px 0 120px;
      text-align: center;
      position: relative;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 100px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 32px;
    }

    h1 {
      font-size: 80px;
      font-weight: 800;
      line-height: 1.05;
      margin-bottom: 32px;
      letter-spacing: -3px;
    }

    .gradient-text {
      background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 22px;
      color: var(--text-muted);
      max-width: 680px;
      margin: 0 auto 56px;
      line-height: 1.6;
    }

    .cta-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .download-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 20px;
      justify-content: center;
      font-size: 13px;
      color: var(--text-muted);
    }

    .problem-section {
      padding: 120px 0;
      background: rgba(239, 68, 68, 0.03);
      border-top: 1px solid rgba(239, 68, 68, 0.1);
      border-bottom: 1px solid rgba(239, 68, 68, 0.1);
    }

    .problem-header {
      text-align: center;
      margin-bottom: 72px;
    }

    .problem-header h2 {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 20px;
      letter-spacing: -1.5px;
    }

    .problem-header p {
      font-size: 20px;
      color: var(--text-muted);
      max-width: 700px;
      margin: 0 auto;
    }

    .problem-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
    }

    .problem-card {
      padding: 36px;
      background: rgba(20, 20, 22, 0.4);
      border-radius: 20px;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .problem-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(239, 68, 68, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ef4444;
      font-size: 28px;
      margin-bottom: 24px;
    }

    .problem-card h3 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #fca5a5;
    }

    .problem-card p {
      color: var(--text-muted);
      line-height: 1.7;
      font-size: 15px;
    }

    .comparison-section {
      padding: 120px 0;
    }

    .comparison-header {
      text-align: center;
      margin-bottom: 64px;
    }

    .comparison-header h2 {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 16px;
      letter-spacing: -1.5px;
    }

    .comparison-table {
      max-width: 900px;
      margin: 0 auto;
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
    }

    .comparison-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .comparison-table th {
      background: rgba(99, 102, 241, 0.1);
      padding: 20px 24px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border-color);
    }

    .comparison-table td {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
      font-size: 15px;
    }

    .comparison-table tr:last-child td {
      border-bottom: none;
    }

    .comparison-table td:first-child {
      font-weight: 500;
      color: var(--text-main);
    }

    .check { color: #10b981; }
    .cross { color: #ef4444; }

    .features-section { padding: 120px 0; }
    .features-header { text-align: center; margin-bottom: 80px; }
    .features-header h2 { font-size: 48px; font-weight: 700; margin-bottom: 20px; letter-spacing: -1.5px; }
    .features-header p { color: var(--text-muted); font-size: 20px; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 32px;
    }

    .feature-card {
      padding: 40px;
      border-radius: 20px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .feature-card:hover {
      transform: translateY(-6px);
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 20px 60px rgba(99, 102, 241, 0.2);
    }

    .icon-box {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(99, 102, 241, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      font-size: 28px;
      margin-bottom: 24px;
    }

    .feature-card h3 { font-size: 20px; font-weight: 600; margin-bottom: 12px; }
    .feature-card p { color: var(--text-muted); font-size: 15px; line-height: 1.7; }

    .cta-section {
      padding: 120px 0;
      text-align: center;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
      border-top: 1px solid rgba(99, 102, 241, 0.2);
      border-bottom: 1px solid rgba(99, 102, 241, 0.2);
    }

    .cta-section h2 {
      font-size: 56px;
      font-weight: 700;
      margin-bottom: 24px;
      letter-spacing: -2px;
    }

    .cta-section p {
      font-size: 20px;
      color: var(--text-muted);
      margin-bottom: 48px;
    }

    footer {
      padding: 80px 0 40px;
      border-top: 1px solid var(--border-color);
    }

    .footer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 48px;
      margin-bottom: 48px;
    }

    .footer-col h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .footer-col a {
      display: block;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      margin-bottom: 12px;
      transition: color 0.2s;
    }

    .footer-col a:hover {
      color: var(--primary);
    }

    .footer-bottom {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid var(--border-color);
      color: var(--text-muted);
      font-size: 14px;
    }

    .footer-bottom a {
      color: var(--text-main);
      text-decoration: none;
      font-weight: 600;
    }

    .footer-bottom a:hover {
      color: var(--primary);
    }

    @media (max-width: 968px) {
      h1 { font-size: 56px; }
      .hero { padding: 140px 0 80px; }
      .grid { grid-template-columns: 1fr; }
      .comparison-table {
        font-size: 13px;
      }
      .comparison-table th, .comparison-table td {
        padding: 14px 16px;
      }
    }

    @media (max-width: 640px) {
      h1 { font-size: 40px; letter-spacing: -1.5px; }
      .subtitle { font-size: 18px; }
      .problem-header h2, .features-header h2, .comparison-header h2, .cta-section h2 {
        font-size: 32px;
      }
      .cta-group { flex-direction: column; width: 100%; }
      .btn { width: 100%; justify-content: center; }
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
        <a href="#why">Why QuickDrop</a>
        <a href="#features">Features</a>
        <a href="https://github.com/binodacharya/quickdrop" target="_blank">
          <i class="ph-bold ph-github-logo"></i> GitHub
        </a>
      </div>
    </div>
  </nav>

  <section class="hero">
    <div class="container">
      <div class="badge">
        <i class="ph-fill ph-warning-circle"></i>
        Gyazo keeps your screenshots forever
      </div>

      <h1>
        Stop Leaking<br>
        <span class="gradient-text">Private Screenshots</span>
      </h1>

      <p class="subtitle">
        Screenshot tools like Gyazo and Imgur store your private images indefinitely with guessable links.
        QuickDrop auto-deletes after 24 hours, uses self-hosted storage, and encrypts everything client-side.
      </p>

      <div class="cta-group">
        <a href="https://a62def6f.quickdrop-app.pages.dev" target="_blank" class="btn btn-primary" style="padding: 16px 40px; font-size: 17px;">
          <i class="ph-bold ph-rocket-launch"></i>
          Launch Web App
        </a>
        <a href="https://github.com/binodacharya/quickdrop" target="_blank" class="btn btn-secondary" style="padding: 16px 40px; font-size: 17px;">
          <i class="ph-bold ph-github-logo"></i>
          View on GitHub
        </a>
      </div>

      <div class="download-badge">
        <span><i class="ph-fill ph-check-circle" style="color: #10b981"></i> No Installation Required</span>
        <span>•</span>
        <span>Works in Any Browser</span>
        <span>•</span>
        <span>Free & Open Source</span>
      </div>
    </div>
  </section>

  <section id="why" class="problem-section">
    <div class="container">
      <div class="problem-header">
        <h2>Why Developers Are Leaving Gyazo</h2>
        <p>Sharing screenshots shouldn't mean sacrificing your privacy or paying $120/year for basic features.</p>
      </div>

      <div class="problem-grid">
        <div class="problem-card">
          <div class="problem-icon"><i class="ph-fill ph-lock-open"></i></div>
          <h3>Guessable Links</h3>
          <p>Short URLs like gyazo.com/abc123 can be discovered by anyone. Your "private" screenshots with API keys, internal dashboards, and sensitive data could be exposed.</p>
        </div>

        <div class="problem-card">
          <div class="problem-icon"><i class="ph-fill ph-infinity"></i></div>
          <h3>Forever Storage</h3>
          <p>Your screenshots stay online indefinitely. No auto-delete, no expiry. Once uploaded, they're there forever unless you manually clean them up.</p>
        </div>

        <div class="problem-card">
          <div class="problem-icon"><i class="ph-fill ph-image"></i></div>
          <h3>Promotional Use</h3>
          <p>Gyazo's ToS states they may use your screenshots for promotional purposes. Your proprietary content, their marketing material.</p>
        </div>

        <div class="problem-card">
          <div class="problem-icon"><i class="ph-fill ph-currency-dollar"></i></div>
          <h3>Expensive Plans</h3>
          <p>CloudApp costs $120/year. Droplr $89/year. Teams pay thousands for basic screenshot sharing. QuickDrop is free with R2 costing ~$0.10/month.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="comparison-section">
    <div class="container">
      <div class="comparison-header">
        <h2>How QuickDrop Compares</h2>
      </div>

      <div class="comparison-table">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Gyazo</th>
              <th>CloudApp</th>
              <th>QuickDrop</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Auto-Expiry</td>
              <td><span class="cross"><i class="ph-fill ph-x-circle"></i> Manual delete</span></td>
              <td><span class="check"><i class="ph-fill ph-check-circle"></i> Custom</span></td>
              <td><span class="check"><i class="ph-fill ph-check-circle"></i> 24h default</span></td>
            </tr>
            <tr>
              <td>Client-Side Encryption</td>
              <td><span class="cross"><i class="ph-fill ph-x-circle"></i> No</span></td>
              <td><span class="cross"><i class="ph-fill ph-x-circle"></i> No</span></td>
              <td><span class="check"><i class="ph-fill ph-check-circle"></i> AES-256-GCM</span></td>
            </tr>
            <tr>
              <td>OCR Text Search</td>
              <td><span class="cross"><i class="ph-fill ph-x-circle"></i> No</span></td>
              <td><span class="check"><i class="ph-fill ph-check-circle"></i> Yes</span></td>
              <td><span class="check"><i class="ph-fill ph-check-circle"></i> Tesseract.js</span></td>
            </tr>
            <tr>
              <td>Self-Hosted Option</td>
              <td><span class="cross"><i class="ph-fill ph-x-circle"></i> No</span></td>
              <td><span class="cross"><i class="ph-fill ph-x-circle"></i> No</span></td>
              <td><span class="check"><i class="ph-fill ph-check-circle"></i> R2 / S3</span></td>
            </tr>
            <tr>
              <td>Pricing</td>
              <td>Free / $3/mo</td>
              <td>$120/year</td>
              <td><strong>Free Forever</strong></td>
            </tr>
            <tr>
              <td>Open Source</td>
              <td><span class="cross"><i class="ph-fill ph-x-circle"></i> No</span></td>
              <td><span class="cross"><i class="ph-fill ph-x-circle"></i> No</span></td>
              <td><span class="check"><i class="ph-fill ph-check-circle"></i> MIT License</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section id="features" class="features-section">
    <div class="container">
      <div class="features-header">
        <h2>Privacy-First Screenshot Sharing</h2>
        <p>Everything you need, nothing you don't. Built for developers who value privacy.</p>
      </div>

      <div class="grid">
        <div class="glass feature-card">
          <div class="icon-box"><i class="ph-fill ph-clock-countdown"></i></div>
          <h3>24h Auto-Expiry</h3>
          <p>Screenshots are automatically deleted from R2 after 24 hours. Cloudflare Workers cron runs daily at midnight UTC. No forgotten screenshots lingering forever.</p>
        </div>

        <div class="glass feature-card">
          <div class="icon-box"><i class="ph-fill ph-lock-key"></i></div>
          <h3>Client-Side Encryption</h3>
          <p>Enable password protection and your screenshots are encrypted with AES-256-GCM BEFORE upload. We never see your password or plaintext images. Zero-knowledge architecture.</p>
        </div>

        <div class="glass feature-card">
          <div class="icon-box"><i class="ph-fill ph-text-aa"></i></div>
          <h3>OCR Text Extraction</h3>
          <p>Tesseract.js extracts text from screenshots automatically. Search your entire history by any word, even if it's in an image. Perfect for finding old error messages.</p>
        </div>

        <div class="glass feature-card">
          <div class="icon-box"><i class="ph-fill ph-lightning"></i></div>
          <h3>Instant Clipboard Replace</h3>
          <p>Take screenshot → Auto-upload → Link copied. QuickDrop replaces the image in your clipboard with a shareable URL in under 1 second. Just paste (⌘V).</p>
        </div>

        <div class="glass feature-card">
          <div class="icon-box"><i class="ph-fill ph-hard-drives"></i></div>
          <h3>Self-Hosted on R2</h3>
          <p>You control your data. QuickDrop stores screenshots on YOUR Cloudflare R2 bucket ($0.01/GB = ~$0.10/month for 1000 screenshots). GDPR-compliant by default.</p>
        </div>

        <div class="glass feature-card">
          <div class="icon-box"><i class="ph-fill ph-code"></i></div>
          <h3>Open Source (MIT)</h3>
          <p>Check our code on GitHub, contribute features, or fork for your own needs. No vendor lock-in. Built by developers, for developers.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta-section">
    <div class="container">
      <h2>Take Control of Your Screenshots</h2>
      <p>Stop worrying about private screenshots leaking online. Start using QuickDrop today.</p>

      <div class="cta-group">
        <a href="https://a62def6f.quickdrop-app.pages.dev" target="_blank" class="btn btn-primary" style="padding: 18px 48px; font-size: 18px;">
          <i class="ph-bold ph-rocket-launch"></i>
          Launch Web App
        </a>
      </div>

      <div class="download-badge">
        <span>Free Forever • No Installation • No Tracking</span>
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <h4>Product</h4>
          <a href="#features">Features</a>
          <a href="https://github.com/binodacharya/quickdrop#readme" target="_blank">Documentation</a>
          <a href="https://github.com/binodacharya/quickdrop/releases" target="_blank">Releases</a>
        </div>

        <div class="footer-col">
          <h4>Resources</h4>
          <a href="https://github.com/binodacharya/quickdrop" target="_blank">GitHub</a>
          <a href="https://github.com/binodacharya/quickdrop/issues" target="_blank">Report Issue</a>
          <a href="https://github.com/binodacharya/quickdrop/blob/main/CONTRIBUTING.md" target="_blank">Contributing</a>
        </div>

        <div class="footer-col">
          <h4>Legal</h4>
          <a href="https://github.com/binodacharya/quickdrop/blob/main/LICENSE" target="_blank">MIT License</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
        </div>

        <div class="footer-col">
          <h4>Developer</h4>
          <a href="https://binodacharya.com" target="_blank">Binod Acharya</a>
          <a href="https://twitter.com/binodacharya" target="_blank">Twitter</a>
          <a href="https://github.com/binodacharya" target="_blank">GitHub Profile</a>
        </div>
      </div>

      <div class="footer-bottom">
        <p>© 2026 QuickDrop. Built with <i class="ph-fill ph-heart" style="color: #ef4444"></i> by <a href="https://binodacharya.com" target="_blank">Binod Acharya</a>. Open source under MIT License.</p>
      </div>
    </div>
  </footer>

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
          'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, X-Amz-Content-SHA256, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      })
    }

    // Handle API Upload (POST /api/upload)
    if (path === '/api/upload' && request.method === 'POST') {
      try {
        const formData = await request.formData()
        const image = formData.get('image') as File
        const expiryHours = formData.get('expiryHours')

        if (!image) {
          return new Response(JSON.stringify({ error: 'No image provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          })
        }

        // Calculate expiry time (default: 24h)
        const hours = expiryHours ? Number(expiryHours) : 24
        const expiresAt = Date.now() + hours * 60 * 60 * 1000

        // Generate ID
        const id = Math.random().toString(36).substring(2, 8)
        const key = `${id}.png`

        // Upload to R2
        await env.QUICKDROP_BUCKET.put(key, await image.arrayBuffer(), {
          httpMetadata: { contentType: 'image/png' },
          customMetadata: {
            originalName: image.name,
            uploadedAt: Date.now().toString(),
            expiresAt: expiresAt.toString()
          }
        })

        const link = `${url.origin}/${id}`
        
        return new Response(JSON.stringify({ id, link, success: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      } catch (error) {
        console.error('Upload failed:', error)
        return new Response(JSON.stringify({ error: 'Upload failed' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
      }
    }

    // Root path - redirect to web app
    if (path === '/' || path === '') {
      return new Response(JSON.stringify({
        message: 'QuickDrop API',
        endpoints: {
          upload: '/api/upload',
          viewer: '/{imageId}',
        },
        webApp: 'https://quickdrop-app.pages.dev',
        landing: 'https://quickdrop-landing.pages.dev'
      }), {
        headers: {
          'Content-Type': 'application/json',
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

      // If user wants raw image, return it directly
      if (wantsRaw) {
        const headers = new Headers()
        // Use shorter cache with must-revalidate to respect cache-busting
        headers.set('Cache-Control', 'public, max-age=300, must-revalidate')
        headers.set('Access-Control-Allow-Origin', '*')

        // Add ETag based on upload time for cache validation
        const uploadedAt = object.customMetadata?.uploadedAt || object.uploaded.getTime().toString()
        headers.set('ETag', `"${imageId}-${uploadedAt}"`)

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
      }

      // Serve viewer HTML for regular images (non-encrypted, non-raw)
      const imageRawUrl = `${url.origin}/${imageId}.png`

      // Try to get OCR text from custom metadata (if we stored it)
      const ocrText = object.customMetadata?.ocrText || ''

      return new Response(getViewerHTML(imageRawUrl, imageId, ocrText), {
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

    const now = Date.now()

    let deletedCount = 0
    let scannedCount = 0
    let cursor: string | undefined

    try {
      // Paginate through all objects in the bucket
      do {
        const listed = await env.QUICKDROP_BUCKET.list({
          cursor,
          limit: 1000, // Process 1000 objects at a time
          include: ['customMetadata']
        })

        scannedCount += listed.objects.length

        // Delete expired objects based on custom expiresAt metadata
        for (const object of listed.objects) {
          // Get full object with metadata
          const obj = await env.QUICKDROP_BUCKET.get(object.key)
          if (!obj) continue

          // Check custom expiry time if available
          const expiresAtStr = obj.customMetadata?.expiresAt
          if (expiresAtStr) {
            const expiresAt = Number(expiresAtStr)
            if (now > expiresAt) {
              await env.QUICKDROP_BUCKET.delete(object.key)
              deletedCount++
              console.log(`[Cleanup] Deleted expired image: ${object.key} (expired at: ${new Date(expiresAt).toISOString()})`)
            }
          } else {
            // Fallback: delete images older than 24 hours if no expiresAt metadata
            const EXPIRY_HOURS = 24
            const expiryTime = now - EXPIRY_HOURS * 60 * 60 * 1000
            if (object.uploaded.getTime() < expiryTime) {
              await env.QUICKDROP_BUCKET.delete(object.key)
              deletedCount++
              console.log(`[Cleanup] Deleted expired image (no metadata): ${object.key} (uploaded: ${object.uploaded.toISOString()})`)
            }
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