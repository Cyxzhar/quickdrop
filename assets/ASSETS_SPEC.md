# QuickDrop Visual Assets Specification

This document contains the specifications and prompts for the visual assets generated for QuickDrop.

## 1. App Icon & Branding
- **Colors:** 
  - Primary: `#3B82F6` (Blue)
  - Secondary: `#8B5CF6` (Purple)
  - Accent: `#F59E0B` (Amber)
- **Concept:** Screenshot selection frame + lightning bolt (speed).
- **Files:** 
  - `assets/icons/app_icon.svg` (Master)
  - `assets/icons/tray_icon_black.svg`
  - `assets/icons/tray_icon_white.svg`

## 2. Landing Page Hero
- **Prompt (Midjourney):** `/imagine modern landing page hero image for screenshot sharing app, left side shows macOS desktop with notification popup "Link copied!" in modern UI design, right side has bold typography "Screenshot to Link in 1 Second" with checkmark icons and download buttons, clean white background with soft blue gradients, professional SaaS product photography style, ultra detailed, 2400x1400 pixels, --ar 12:7 --style raw --v 6`
- **Implementation:** Integrated as SVG mockup in `web/public/index.html`.

## 3. Product Hunt Featured Image
- **Dimensions:** 1270x760 px
- **Prompt:** `/imagine Product Hunt featured image, blue to purple gradient background, app icon centered (screenshot frame with lightning bolt), tagline "Screenshot to Link in 1 Second" in modern sans-serif font, three badge icons at bottom (free, no account, privacy), clean professional SaaS aesthetic, high contrast, vibrant colors, 1270x760 pixels --ar 5:3 --style raw --v 6`

## 4. Reddit Comparison GIF
- **Concept:** Side-by-side comparison of old 6-step workflow vs QuickDrop 1-step workflow.
- **Timers:** 30s vs 1s.
- **Style:** Red border for "Before", Green border for "After".

## 5. Tutorial Screens
- **01_installation:** Drag DMG to Applications.
- **02_first_launch:** Tray icon highlight.
- **03_screenshot:** Keyboard shortcut Cmd+Shift+4.
- **04_link_copied:** Notification highlight.

## Integration Code
```typescript
// App Icon (macOS)
app.dock.setIcon(path.join(__dirname, '../../resources/icon.png'))

// Tray Icon
const tray = new Tray(path.join(__dirname, '../../resources/tray.png'))
```
