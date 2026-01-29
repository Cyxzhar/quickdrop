# QuickDrop Production URLs

## Production Deployments

| Service | Production URL | Status |
|---------|---------------|--------|
| **Landing Page** | https://quickdrop-landing.pages.dev | ✅ Latest |
| **Web App** | https://quickdrop-app.pages.dev | ✅ Latest |
| **API/Worker** | https://quickdrop-worker.binodalgopro123.workers.dev | ✅ Active |

## URL Structure

### Landing Page Links
All "Launch App" buttons on the landing page point to:
- `https://quickdrop-app.pages.dev`

### Web App Links
The About link in the web app points to:
- `https://quickdrop-landing.pages.dev`

### API Endpoint
The web app uploads to:
- `https://quickdrop-worker.binodalgopro123.workers.dev/api/upload`

## Cache Control

HTML files now have `Cache-Control: public, max-age=0, must-revalidate` to ensure users always get the latest version.

## Clear Browser Cache

If you see old UI:
1. **Hard Refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
2. **Clear Cache**: Browser Settings → Clear browsing data → Cached images and files
3. **Incognito/Private**: Test in incognito mode to bypass cache

## Preview URLs (Ignore These)

Preview URLs are generated for each deployment but should NOT be bookmarked:
- `https://[hash].quickdrop-app.pages.dev` ← Preview only
- `https://[hash].quickdrop-landing.pages.dev` ← Preview only

Always use the production URLs above.

## Latest Deployments

- Web App: Dropdown styling, modal fixes, gallery redesign
- Landing: Phosphor Icons, advanced animations, mobile responsive
- Both: Consistent design system, unified colors, professional UI/UX

