# Next Session Plan - QuickDrop Development

**Last Updated:** 2026-01-29
**Status:** Clean codebase, ready for Phase 2 features

---

## 🎯 Current State Summary

### ✅ What's Working
- **Upload & Storage:** Screenshots upload to R2, shareable links generated
- **OCR Extraction:** Tesseract.js extracts text before upload (sent to worker)
- **AI Analysis:** Perplexity API processes OCR text, generates metadata
- **Database:** D1 SQLite with full-text search index (FTS5)
- **Search API:** `/api/search?q=term` returns ranked results
- **Image Tools:** Annotation editor, QR code generator
- **Auto-Expiry:** Links delete after 24h (configurable)
- **Modern UI:** Glassmorphism dark theme

### ⚠️ Known Issues
1. **AI Processing:** Some screenshots failing in queue (check logs)
2. **No Search UI:** Search API exists but users can't access it
3. **No AI Metadata Display:** Users don't see AI-generated titles/tags
4. **No Collections:** Can't organize screenshots into folders

### 📊 Technical Details
- **Database ID:** `e40ebb63-e7d8-4434-949b-113701bf6451`
- **Perplexity API:** Configured with $5 monthly credit
- **Model:** `sonar` (text-only, $0.005/request)
- **Worker:** `quickdrop-worker.binodalgopro123.workers.dev`
- **Web App:** `quickdrop-app.pages.dev`
- **Landing:** `quickdrop-landing.pages.dev`

---

## 🚀 Immediate Next Steps (Priority Order)

### 1. TEST & FIX AI Processing (1-2 hours)
**Goal:** Ensure AI analysis works reliably

**Tasks:**
- [ ] Upload screenshot with readable text
- [ ] Run test script: `/tmp/test-quickdrop.sh`
- [ ] Check AI queue for errors:
  ```bash
  cd worker
  npx wrangler d1 execute quickdrop-db --remote \
    --command="SELECT * FROM ai_queue WHERE error IS NOT NULL LIMIT 5;"
  ```
- [ ] Debug and fix any Perplexity API issues
- [ ] Verify AI metadata is being saved to database

**Success Criteria:**
- Upload → OCR → AI processing → Metadata in database
- Search API returns results with AI titles/tags

---

### 2. Build Search UI (4-6 hours)
**Goal:** Make the search API usable from the web app

**Files to Create:**
- `web-app/src/components/SearchBar.tsx`
- `web-app/src/components/SearchResults.tsx`

**Files to Modify:**
- `web-app/src/App.tsx` - Add search bar to header
- `web-app/src/App.css` - Search styling

**Features:**
- Search bar in header (always visible)
- Real-time search as you type (debounced)
- Results show: thumbnail, AI title, tags, category
- Click result to open full viewer
- Filter by category dropdown
- Empty state: "No results found"

**API Integration:**
```typescript
const searchResults = await fetch(
  `${API_URL}/api/search?q=${query}&category=${category}`
).then(r => r.json())
```

**Success Criteria:**
- Type "error" → See screenshots with "error" in title/text
- Click category filter → See only bug reports
- Click result → Opens image viewer

---

### 3. Display AI Metadata in Gallery (2-3 hours)
**Goal:** Show users the value of AI analysis

**Modifications:**
- Update gallery card in `web-app/src/App.tsx`
- Show AI-generated title (if available)
- Show tags as colored chips
- Show category badge
- Make tags clickable (trigger search)

**Design:**
```
┌─────────────────────────────┐
│  [Thumbnail]                │
│                             │
│  📊 Bug Report              │ ← AI category badge
│  MongoDB Error Port 27017   │ ← AI title (editable)
│  #database #error #mongodb  │ ← AI tags (clickable)
│                             │
│  [Copy] [Share] [Edit]      │
└─────────────────────────────┘
```

**Worker Changes:**
- Return AI metadata in upload response
- Add `/api/screenshot/{id}` endpoint for fetching metadata

**Success Criteria:**
- Upload → See AI title appear automatically
- Tags are clickable and trigger search
- Category badge shows correct icon/color

---

### 4. Build Collections System (8-12 hours)
**Goal:** Let users organize screenshots into folders

**Database (Already in schema):**
- `collections` table
- `collection_items` table

**API Endpoints (New):**
```
POST   /api/collections              - Create collection
GET    /api/collections              - List user's collections
GET    /api/collections/{id}         - Get collection details
PUT    /api/collections/{id}         - Update collection
DELETE /api/collections/{id}         - Delete collection
POST   /api/collections/{id}/items   - Add screenshot to collection
DELETE /api/collections/{id}/items/{screenshot_id} - Remove from collection
```

**UI Components (New):**
- `web-app/src/components/Collections.tsx` - Collections sidebar
- `web-app/src/components/CollectionCard.tsx` - Collection preview
- `web-app/src/components/CollectionDetail.tsx` - Collection full view

**Features:**
- Create collection: Name, color, icon
- Drag-and-drop screenshots into collections
- AI auto-suggestions: "Add to Bug Reports?"
- View all screenshots in collection
- Share collection publicly (Phase 3)

**Success Criteria:**
- Create "Bug Reports" collection
- Drag 3 screenshots into it
- View collection shows all 3 screenshots
- Delete collection → Screenshots remain in gallery

---

## 📝 Development Guidelines

### Code Quality Checklist
- [ ] Remove `console.log` (keep `console.error` and `console.warn`)
- [ ] Add TypeScript types for all API responses
- [ ] Handle loading states (skeleton screens)
- [ ] Handle error states (friendly messages)
- [ ] Add input validation (search, collection names)
- [ ] Test on mobile (responsive design)

### Before Each Deployment
```bash
# Build
cd web-app && npm run build

# Deploy web-app
npx wrangler pages deploy dist --project-name=quickdrop-app --branch=main

# Deploy worker
cd ../worker && npx wrangler deploy

# Test
curl "https://quickdrop-worker.binodalgopro123.workers.dev/api/search?q=test"
```

### Git Workflow
```bash
# After significant changes
git add -A
git commit -m "descriptive message"

# At end of session
git push origin main
```

---

## 🐛 Known Bugs to Fix

1. **Clipboard Error**
   - Sometimes shows "Upload failed" even though upload succeeded
   - Reason: Clipboard write fails when window loses focus
   - Status: Fixed in code, needs testing

2. **OCR Quality**
   - Still getting some gibberish despite filtering
   - Possible improvement: Better OCR preprocessing
   - Priority: Low (AI can handle imperfect OCR)

3. **Mobile Layout**
   - Some buttons too small on mobile
   - Dropzone not obvious on touch devices
   - Priority: Medium

---

## 💡 Ideas for Future

### Quick Wins (Easy to add)
- Copy AI title to clipboard button
- Show OCR confidence score
- Export collection as ZIP
- Keyboard shortcuts (Cmd+K for search)
- Dark/light theme toggle

### Medium Effort
- Batch upload (select multiple files)
- Duplicate detection (same screenshot uploaded twice)
- Link preview (when sharing on Slack/Discord)
- Custom expiry times (1h, 7d, 30d, never)

### Big Features (Phase 3+)
- User authentication (email/password)
- Public collections (share with world)
- Comments on screenshots
- Browser extension
- Desktop app (Electron or Tauri)

---

## 📚 Resources & Links

### Documentation
- README.md - Setup and overview
- ROADMAP.md - Long-term plan
- URL_REFERENCE.md - Deployment URLs

### APIs
- Perplexity Docs: https://docs.perplexity.ai
- Cloudflare D1: https://developers.cloudflare.com/d1
- Cloudflare Workers: https://developers.cloudflare.com/workers

### Codebase
- Worker: `worker/src/index.ts` - Main API
- AI Service: `worker/src/ai-vision.ts` - Perplexity integration
- Web App: `web-app/src/App.tsx` - React application
- Database: `worker/schema.sql` - D1 schema

---

## 🎯 Session Goals Template

**For each work session, aim to complete 1-2 features fully rather than starting many.**

### Example Session Plan:
1. **Start:** Read NEXT_SESSION.md
2. **Test:** Run existing features, check for bugs
3. **Code:** Implement 1 priority feature
4. **Test:** Verify it works in production
5. **Document:** Update this file with progress
6. **Commit:** Push to git
7. **Deploy:** Deploy to production

### Time Estimates:
- Bug fix: 30min - 1h
- Small feature (search bar): 2-3h
- Medium feature (collections UI): 4-6h
- Large feature (auth system): 8-12h

---

## ✅ Progress Tracker

### Phase 1: Smart Foundation ✅ COMPLETE
- [x] Upload and shareable links
- [x] OCR text extraction
- [x] AI metadata generation
- [x] D1 database with FTS5
- [x] Search API
- [x] Image editor
- [x] Clean codebase

### Phase 2: Essential Features 🔄 IN PROGRESS
- [ ] Search UI (0%)
- [ ] Display AI metadata (0%)
- [ ] Collections system (0%)
- [ ] Mobile optimization (0%)

### Phase 3: Public Knowledge Network ⏸️ PLANNED
- [ ] User authentication
- [ ] Public collections
- [ ] Discovery feed
- [ ] Social features

---

## 📞 Quick Commands Reference

```bash
# Navigate to project
cd "/Users/binodacharya/Desktop/Desktop-MyProjects/QuickDrop App"

# Start development
cd web-app && npm run dev

# Check database
cd worker
npx wrangler d1 execute quickdrop-db --remote --command="SELECT COUNT(*) FROM screenshots;"

# Test AI processing
curl -X POST https://quickdrop-worker.binodalgopro123.workers.dev/api/process-ai

# Search
curl "https://quickdrop-worker.binodalgopro123.workers.dev/api/search?q=error"

# Deploy everything
cd web-app && npm run build && npx wrangler pages deploy dist --project-name=quickdrop-app --branch=main
cd ../worker && npx wrangler deploy
```

---

**Remember:** Focus on making existing features work perfectly before adding new ones. Quality > Quantity.

**Next Session Start Here:** Test AI processing first, then build Search UI.
