# QuickDrop Deployment Guide

## Cloudflare Pages Deployment

QuickDrop consists of three separate deployments:

### 1. Landing Page (`web/`)
**Project Name:** `quickdrop-landing`
- **Build directory:** `web/public`
- **Build command:** None (static files)
- **Environment:** Production

### 2. Web App (`web-app/`)
**Project Name:** `quickdrop-app`
- **Build directory:** `web-app`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 18+

### 3. Worker/API (`worker/`)
**Project Name:** `quickdrop-worker`
- Deploy using Wrangler CLI
- See `worker/README.md` for details

## Updating Deployments

### Method 1: Automatic (Git Integration)
Cloudflare Pages automatically rebuilds when you push to the `main` branch:

```bash
git add .
git commit -m "Update"
git push origin main
```

### Method 2: Manual Deploy (Wrangler CLI)

#### Install Wrangler:
```bash
npm install -g wrangler
```

#### Deploy Landing Page:
```bash
cd web
wrangler pages deploy public --project-name=quickdrop-landing
```

#### Deploy Web App:
```bash
cd web-app
npm run build
wrangler pages deploy dist --project-name=quickdrop-app
```

#### Deploy Worker:
```bash
cd worker
wrangler deploy
```

## Cloudflare Pages Configuration

### Build Settings
Go to Cloudflare Dashboard → Pages → Project → Settings → Builds & deployments

#### For `quickdrop-app`:
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `web-app`

#### For `quickdrop-landing`:
- **Framework preset:** None
- **Build command:** (leave empty)
- **Build output directory:** `public`
- **Root directory:** `web`

### Environment Variables
No environment variables needed for static sites.

## Clearing Cache

If you see old content after deployment:

1. **Cloudflare Dashboard** → Pages → Project → Deployments
2. Select latest deployment → **View deployment**
3. Click **Purge cache**

Or use the Wrangler CLI:
```bash
wrangler pages deployment tail --project-name=quickdrop-app
```

## Custom Domains

### Setup:
1. Cloudflare Dashboard → Pages → Project → Custom domains
2. Add domain: `app.yourdomain.com`
3. Update DNS records as instructed
4. Enable HTTPS (automatic)

### Recommended Setup:
- Landing: `quickdrop.com` or `quickdrop.pages.dev`
- Web App: `app.quickdrop.com` or `quickdrop-app.pages.dev`
- Worker: `quickdrop-worker.yourusername.workers.dev`

## Troubleshooting

### Old content still showing
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Purge Cloudflare cache (see above)
3. Check if the correct branch is deployed
4. Verify build output directory is correct

### Build failing
1. Check Node version (requires 18+)
2. Verify `package.json` scripts are correct
3. Check build logs in Cloudflare Dashboard
4. Test build locally: `npm run build`

### 404 errors
1. Verify build output directory contains `index.html`
2. Check `wrangler.toml` configuration
3. Ensure `pages_build_output_dir` is correct

## Monitoring

View deployment logs:
```bash
wrangler pages deployment list --project-name=quickdrop-app
```

View real-time logs:
```bash
wrangler tail --project-name=quickdrop-app
```

## Support

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Issues](https://github.com/binodacharya/quickdrop/issues)
