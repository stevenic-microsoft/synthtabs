# Migration Rules — Manual v1→v2 Page Fixes

Tracking issues and reference material for migrating v1 pages to v2 for a single-user migration.

---

## Nebula Dusk Theme CSS Reference

The theme (`default-themes/nebula-dusk.css`) provides ALL of these. Pages must NOT duplicate them.

### CSS Variables (`:root`)
```
--bg-primary: #1a1a2e
--bg-secondary: #16213e
--bg-tertiary: #0f0f23
--accent-primary: #667eea
--accent-secondary: #764ba2
--accent-tertiary: #f093fb
--accent-glow: rgba(138,43,226,0.3)
--text-primary: #e0e0e0
--text-secondary: #b794f6
--border-color: rgba(138,43,226,0.3)
--header-min-height: 58px
--header-padding-vertical: 14px
--header-padding-horizontal: 20px
--header-line-height: 1.25
```

### Shared Selectors (remove from pages)
These are ALL handled by the theme. Remove exact matches AND their pseudo-class/element variants that are clearly shared (`:hover`, `:focus`, `::placeholder`, `:active`, `:disabled`):

- `*` (reset + scrollbar-width/scrollbar-color)
- `body`
- `.chat-panel`
- `.chat-header`
- `.chat-messages`
- `.chat-message`, `.chat-message p`, `.chat-message p strong`, `.chat-message p code`
- `.link-group`, `.link-group a`, `.link-group a:hover`
- `form`
- `.chat-input`, `.chat-input:focus`, `.chat-input::placeholder`, `.chat-input:disabled`
- `.chat-submit`, `.chat-submit:hover`, `.chat-submit:active`, `.chat-submit:disabled`
- `.viewer-panel` (includes `::before` and `@keyframes nebula-pulse` — theme provides these!)
- `.viewer-panel.full-viewer`
- `.loading-overlay`
- `.spinner`
- `@keyframes spin`
- All `::-webkit-scrollbar*` rules and `scrollbar-width`/`scrollbar-color`
- `#loadingOverlay { position: absolute; }`
- `.chat-toggle` and related (`.chat-toggle-dots`, `.chat-toggle-dot`, `body.chat-collapsed *`)
- All `.modal-*` classes
- All `.form-*` classes
- All `.brainstorm-*` classes

### Viewer Panel Defaults (important!)
```css
.viewer-panel {
    flex: 1;
    min-width: 0;
    padding: 20px 20px 20px 44px;
    display: flex;
    flex-direction: column;
    justify-content: center;    /* ← centers content vertically */
    align-items: center;        /* ← centers content horizontally */
    overflow: hidden;           /* ← NO scrolling by default */
    position: relative;
}
```
**Pages with top-aligned or scrollable content must override these.** See "Common Overrides" below.

---

## V2 Page Structure Reference (from builder.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SynthOS - Page Title</title>
    <script src="/api/theme-info.js"></script>
    <link rel="stylesheet" href="/api/theme.css">
    <style>
        /* Only page-specific styles here */
    </style>
</head>
<body>
    <div class="chat-panel">
        <div class="chat-header">SynthOS</div>
        <div class="chat-messages" id="chatMessages">
            <!-- chat messages preserved -->
        </div>
        <div class="link-group">
            <a href="#" id="saveLink">Save</a>
            <a href="/pages" id="pagesLink">Pages</a>
            <a href="#" id="resetLink">Reset</a>
        </div>
        <form action="/" method="POST" id="chatForm">
            <input type="text" class="chat-input" id="chatInput" name="message" placeholder="Type a message...">
            <button type="submit" class="chat-submit">Send</button>
        </form>
    </div>
    <div class="viewer-panel" id="viewerPanel">
        <!-- page content -->
        <div id="loadingOverlay" class="loading-overlay"><div class="spinner"></div></div>
    </div>
    <div id="thoughts" style="display: none;">...</div>
    <script>
        /* Only page-specific JS here */
    </script>
</body>
</html>
```

**Key differences from v1:**
- `<script src="/api/theme-info.js">` and `<link href="/api/theme.css">` in `<head>` (after `<title>`)
- No shared CSS in `<style>` blocks
- No shared JS (chatInput focus, chatForm submit, saveLink/resetLink handlers, chat scroll, toggle IIFE, focus IIFE)
- `loadingOverlay` goes inside `.viewer-panel`
- Server auto-injects `page-info.js`, `page-helpers.js`, `page-script.js` — don't add manually

---

## Common Overrides for Page-Specific Layouts

### Top-aligned content with scrolling (tabs, lists, dashboards)
```css
.viewer-panel {
    justify-content: flex-start;
    align-items: stretch;
    overflow-y: auto;
}
```

### Full-bleed content (no padding)
```css
.viewer-panel {
    padding: 0;
}
/* or use the built-in class: */
/* <div class="viewer-panel full-viewer" id="viewerPanel"> */
```

---

## JS Migration: Shared Code to Remove

Remove these blocks from `<script>` tags (page-script.js handles them now):

1. `document.getElementById("chatInput").focus()`
2. `chatForm` submit event listener (the one with setTimeout + loading overlay)
3. `saveLink` click handler
4. `resetLink` click handler
5. `window.onload` that ONLY scrolls chatMessages — keep other onload logic!
6. Chat panel toggle IIFE (references `synthos-chat-collapsed`)
7. Focus management IIFE (references `stopImmediatePropagation`)
8. `// Basic chat functionality` comment

---

## JS Migration: Data API Conversion

v1 used global tables: `/api/data/:table`
v2 uses page-scoped tables: `/api/data/:page/:table`

Use `synthos.data.*` helpers (auto-scope via `window.pageInfo.name`):

| v1 pattern | v2 replacement |
|---|---|
| `fetch('/api/data/TABLE')` | `synthos.data.list('TABLE')` |
| `fetch('/api/data/TABLE/ID')` | `synthos.data.get('TABLE', 'ID')` |
| `fetch('/api/data/TABLE', {method:'POST', body:JSON.stringify(row)})` | `synthos.data.save('TABLE', row)` |
| `fetch('/api/data/TABLE/ID', {method:'DELETE'})` | `synthos.data.remove('TABLE', 'ID')` |

**Important:** `synthos.data.get()` returns the object directly (or `null` if not found), NOT a Response object. No need for `.json()`.

---

## Pages Migrated

### dad (Messages to Dad)
**Status:** DONE
**Tables:** `dad-conversations`, `dad-profile`, `papa-letters`
**Issues found & fixed:**
1. Viewer-panel centered content → added `justify-content: flex-start; align-items: stretch; overflow-y: auto`
2. No scrolling on long tabs → same fix (`overflow-y: auto`)
3. Duplicate `.viewer-panel::before` / `@keyframes nebula-pulse` → removed (theme provides these)
4. Data tables work — files at `.synthos/pages/dad/<table>/`

### em-strategic_plan (2026 Goals Calendar)
**Status:** DONE
**Tables:** NONE (uses localStorage: `elementsGoals2026`, `keyDates2026`, `lsmData2026`)
**Changes:**
1. Removed all shared CSS (`:root`, `*`, `body`, `.chat-panel`, `.chat-header`, `.chat-messages`, `.chat-message` base, `.link-group`, `form`, `.chat-input`, `.chat-submit`, `.viewer-panel`, `.viewer-panel::before`, `@keyframes nebula-pulse`, `.loading-overlay`, `.spinner`, `@keyframes spin`, scrollbar rules)
2. Preserved page-specific `.chat-message.truncated` style
3. Added theme-info.js + theme.css refs
4. Removed shared JS (chatInput focus, chatForm submit, saveLink, resetLink, window.onload scroll)
5. Added viewer-panel overrides: `justify-content: flex-start; align-items: stretch; overflow-y: auto`
6. Moved `loadingOverlay` inside `.viewer-panel`
7. Updated `pageVersion` to 2 in page.json
8. Replaced hardcoded `#667eea`/`#764ba2` in `.copy-btn.copied` with CSS variables
