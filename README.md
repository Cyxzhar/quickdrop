# QuickDrop - Smart Visual Knowledge Manager

**Transform screenshots into searchable, organized knowledge with AI-powered analysis.**

QuickDrop isn't just another screenshot sharing tool. It's a visual knowledge management system that automatically analyzes, tags, and organizes your screenshots, making them instantly searchable and retrievable months later.

## 🎯 The Problem We Solve

Everyone takes hundreds of screenshots:
- Developers: Error messages, code snippets, documentation
- Students: Lecture slides, notes, diagrams
- Designers: Inspiration, mockups, feedback
- Researchers: Data, charts, papers

**The pain:** You can never find them when you need them. They're scattered, unnamed, lost.

**Our solution:** Every screenshot becomes searchable knowledge with AI-generated titles, tags, and categories.

## ✨ Key Features

### Current (v0.1 - Smart Foundation)
- ✅ **Instant Upload** - Screenshot to shareable link in seconds
- ✅ **OCR Text Extraction** - Automatic text recognition with intelligent filtering
- ✅ **AI Analysis** - Perplexity AI generates titles, tags, and categories
- ✅ **Smart Search** - Full-text search across OCR text and AI metadata
- ✅ **Auto-Expiry** - Links automatically delete after 24 hours (configurable)
- ✅ **Image Editing** - Annotate, draw, crop before sharing
- ✅ **QR Code Generation** - Share via QR codes
- ✅ **Modern UI** - Dark theme with glassmorphism design

### Coming Soon (v0.2-0.3)
- 🔄 **Collections & Folders** - Organize screenshots into projects
- 🔄 **Public Knowledge Base** - Share collections publicly, discover others' knowledge
- 🔄 **Advanced Filters** - Search by category, date, tags
- 🔄 **URL Detection** - Make detected URLs clickable
- 🔄 **Browser Extension** - Right-click upload from anywhere
- 🔄 **Desktop App** - Native macOS/Windows screenshot capture

## 🏗️ Architecture

```
QuickDrop/
├── web/              Landing page (Cloudflare Pages)
├── web-app/          Main application (React + TypeScript + Vite)
├── worker/           API + AI processing (Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts        # Main worker (upload, search, viewer)
│   │   └── ai-vision.ts    # Perplexity AI integration
│   └── schema.sql          # D1 database schema
└── assets/           Generated assets (icons, images)
```

### Tech Stack
- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Cloudflare Workers (serverless)
- **Database:** Cloudflare D1 (SQLite at edge)
- **Storage:** Cloudflare R2 (S3-compatible)
- **AI:** Perplexity API (text analysis)
- **OCR:** Tesseract.js (client-side)
- **Image Editing:** Fabric.js (canvas manipulation)

## 🚀 Deployment

### Production URLs
- **Landing:** https://quickdrop-landing.pages.dev
- **Web App:** https://quickdrop-app.pages.dev
- **API Worker:** https://quickdrop-worker.binodalgopro123.workers.dev

### Local Development

**1. Web App (Frontend)**
```bash
cd web-app
npm install
npm run dev
# Open http://localhost:5173
```

**2. Worker (Backend)**
```bash
cd worker
npx wrangler dev
# API runs on http://localhost:8787
```

**3. Landing Page**
```bash
cd web
npx wrangler pages dev public --port 8788
```

### Deploy to Production

**Deploy Web App:**
```bash
cd web-app
npm run build
npx wrangler pages deploy dist --project-name=quickdrop-app --branch=main
```

**Deploy Worker:**
```bash
cd worker
npx wrangler deploy
```

**Deploy Landing:**
```bash
cd web
npx wrangler pages deploy public --project-name=quickdrop-landing --branch=main
```

## 🔑 Configuration

### Perplexity API Key
Get your free $5/month credit at: https://www.perplexity.ai/settings/api

```bash
cd worker
npx wrangler secret put PERPLEXITY_API_KEY
# Paste your key when prompted
```

### Database Setup
```bash
cd worker
npx wrangler d1 execute quickdrop-db --remote --file=schema.sql
```

## 📊 Database Schema

**Core Tables:**
- `screenshots` - Image metadata + AI-generated fields
- `screenshots_fts` - Full-text search index
- `users` - User profiles
- `collections` - Organized screenshot groups
- `ai_queue` - Background AI processing queue
- `comments`, `likes`, `follows` - Social features (coming soon)

**AI Fields:**
- `ai_title` - "MongoDB Connection Error Port 27017"
- `ai_tags` - "database,error,mongodb,nodejs,backend"
- `ai_category` - bug-report, tutorial, note, code, design, data
- `ai_description` - Detailed 2-3 sentence summary

## 🧪 Testing AI Features

Upload a screenshot with readable text, then:

```bash
# Check database
cd worker
npx wrangler d1 execute quickdrop-db --remote \
  --command="SELECT id, ai_title, ai_tags FROM screenshots LIMIT 3;"

# Trigger AI processing
curl -X POST https://quickdrop-worker.binodalgopro123.workers.dev/api/process-ai

# Search
curl "https://quickdrop-worker.binodalgopro123.workers.dev/api/search?q=error"
```

## 💰 Cost Breakdown

**Cloudflare (Free Tier):**
- Workers: 100,000 requests/day
- Pages: Unlimited bandwidth
- R2: 10GB storage + 1M Class A operations/month
- D1: 5GB storage + 5M reads/day

**Perplexity AI:**
- Free: $5/month credit
- Cost: $0.005/request
- Capacity: ~1,000 AI analyses/month

**Total:** $0/month for personal use, scales affordably

## 🎨 Design System

**Colors:**
- Primary: `#6366f1` (Indigo)
- Secondary: `#8b5cf6` (Purple)
- Background: `#050505` (Almost black)
- Card: `rgba(20, 20, 22, 0.6)` (Glass)

**Typography:**
- Font: Inter
- Headings: 900 weight, gradient text
- Body: 400-600 weight

**Effects:**
- Glassmorphism: `backdrop-filter: blur(20px)`
- Smooth animations: `cubic-bezier(0.16, 1, 0.3, 1)`
- Gradient glows: `radial-gradient` with low opacity

## 📝 License

MIT License - Binod Acharya

## 🔗 Links

- Documentation: See `ROADMAP.md` for future plans
- URL Reference: See `URL_REFERENCE.md` for all deployment URLs
- Issues: Report bugs in project issues
