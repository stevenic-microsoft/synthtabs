# synthos-themes

## purpose

SynthOS theme system: file structure, loading/fallback chain, CSS custom properties, light/dark mode, and the theme-info/theme.css serving pipeline.

## rules

1. **Each theme is a paired `.json` + `.css` file.** The JSON file defines `mode` (`"light"` or `"dark"`) and a `colors` map of CSS custom property values. The CSS file defines shared shell element styles using those custom properties.
2. **Use the two-step fallback for theme loading.** Both `loadThemeInfo()` and `loadTheme()` check user-local themes first (`.synthos/themes/<name>.<ext>`), then fall back to package defaults (`default-themes/<name>.<ext>`). User copies shadow package files.
3. **Never modify `default-themes/` and expect immediate results.** On `init`, themes are copied from `default-themes/` to `.synthos/themes/`. The local copy shadows the source. After editing `default-themes/`, delete `.synthos/themes/` (or the whole `.synthos/` folder) and re-run to pick up changes.
4. **Use CSS custom properties for all colors in page-specific styles.** Theme JSON defines properties like `accent-primary`, `accent-secondary`, `text-primary`, `bg-primary`. Reference them as `var(--accent-primary)` etc. in `<style>` blocks. Never hardcode Nebula Dusk hex values.
5. **`theme-info.js` runs synchronously in `<head>`.** Served at `/api/theme-info.js`, it sets `window.themeInfo` with the theme's metadata/colors and adds a `light-mode` or `dark-mode` class to `<html>`. This must load before any page CSS to enable `.light-mode` overrides.
6. **`theme.css` handles all shared shell elements.** The CSS file styles: `.chat-panel`, `.chat-header`, `.chat-messages`, `.chat-message`, `.link-group`, `form`, `.chat-input`, `.chat-submit`, `.loading-overlay`, `.spinner`, `.viewer-panel`, scrollbars, buttons, and modal dialogs. Page-specific `<style>` blocks must not redefine these selectors.
7. **Add `.light-mode` CSS overrides for all page-specific styles.** The `<html>` element gets `dark-mode` or `light-mode` class. Pages should include `.light-mode .my-element { ... }` overrides at the end of their `<style>` block so they work in both themes. Exception: canvas-based scenes keep their canvas dark; only UI chrome adapts.
8. **Never put `padding` in inline `style=` on `.viewer-panel`.** Some pages have `style="..."` on the viewer-panel div. Inline styles override theme CSS. The theme's viewer-panel padding must not be overridden. This is a recurring gotcha in `pages.html`, `settings.html`, and `json_tools.html`.
9. **Use the `ThemeInfo` interface for typed theme data.** `ThemeInfo` in `src/themes.ts` has `mode: 'light' | 'dark'` and `colors: Record<string, string>`. The theme block in `transformPage.ts` sends this to the LLM so it generates theme-aware content.
10. **List themes via `listThemes()`.** It collects `.css` filenames from both user and default folders, deduplicates, and returns sorted names (without `.css` extension). Used by `GET /api/themes`.
11. **Default theme is `nebula-dusk`.** The `DefaultSettings` object in `settings.ts` sets `theme: 'nebula-dusk'`. The settings loading uses `settings.theme ?? 'nebula-dusk'` as fallback.
12. **Theme names follow `kebab-case`.** Current themes: `nebula-dusk` (dark) and `nebula-dawn` (light). New themes should follow this naming convention.

## patterns

### Loading theme info for transformation

```typescript
import { loadThemeInfo } from '../themes';

const themeInfo = await loadThemeInfo(themeName ?? 'nebula-dusk', config);
// themeInfo: { mode: 'dark', colors: { 'accent-primary': '#667eea', ... } }

// Pass to transformPage:
const result = await transformPage({ ...args, themeInfo });
```

### Theme JSON file structure

```json
{
    "mode": "dark",
    "colors": {
        "accent-primary": "#667eea",
        "accent-secondary": "#764ba2",
        "accent-tertiary": "#f093fb",
        "text-primary": "#e0e0e0",
        "text-secondary": "#b794f6",
        "bg-primary": "#1a1a2e",
        "bg-secondary": "#16213e",
        "bg-tertiary": "#0f0f23",
        "border-color": "rgba(138, 43, 226, 0.3)",
        "accent-glow": "rgba(102, 126, 234, 0.15)"
    }
}
```

### Adding .light-mode overrides to a page

```html
<style>
    /* Default (dark mode) styles */
    .my-widget {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }

    /* Light mode overrides */
    .light-mode .my-widget {
        background: #ffffff;
        color: #1a1a2e;
        border: 1px solid #e0e0e0;
    }
</style>
```

### Serving theme-info.js

```typescript
// In useApiRoutes.ts — serves as self-executing JS
app.get('/api/theme-info.js', async (req, res) => {
    const settings = await loadSettings(config.pagesFolder);
    const themeName = settings.theme ?? 'nebula-dusk';
    const info = await loadThemeInfo(themeName, config);
    const js = `window.themeInfo=${JSON.stringify(info)};document.documentElement.classList.add(window.themeInfo.mode+"-mode");`;
    res.set('Content-Type', 'application/javascript');
    res.send(js);
});
```

## pitfalls

- **Inline `style=` on `.viewer-panel` beats theme CSS.** This is the most common theme bug. Check `pages.html`, `settings.html`, `json_tools.html`, and any new page for inline styles that override theme padding or background.
- **Local theme copies shadow source files.** Editing `default-themes/nebula-dusk.css` has no effect if `.synthos/themes/nebula-dusk.css` exists. Must delete the local copy first. This bites during development every time.
- **Three pages need no `.light-mode` overrides.** `builder.html`, `pages.html`, and `split-application.html` use only accent-color CSS variables and work in both modes without overrides. Don't add unnecessary overrides to these.
- **Canvas-based pages keep dark canvases.** `solar_system.html` and `space_invaders.html` keep their canvas backgrounds dark in light mode. Only surrounding UI chrome (headers, panels, text) adapts. Don't force light backgrounds on `<canvas>` elements.
- **The theme block in `transformPage.ts` is large.** The theme context injected into the LLM prompt includes all CSS custom properties, shared class descriptions, and "Do NOT" instructions. Changes to the theme block can significantly impact transformation quality — test thoroughly.

## instructions

Use this expert when working with SynthOS themes: creating new themes, modifying theme CSS/JSON, fixing theme-related display issues, or working with the theme loading/serving pipeline.

Pair with: `synthos-pages.md` for how theme context flows into page transformation, `cheerio-transforms.md` for CSS manipulation during migrations.

## research

Deep Research prompt:

"Write a project-specific expert for the SynthOS theme system. Cover: theme file structure (paired .json + .css files), the ThemeInfo interface (mode + colors map), the two-step loading fallback chain (user .synthos/themes/ → default-themes/), the init-time copy from default-themes to .synthos/themes and its shadowing implications, CSS custom properties naming convention, the theme-info.js serving endpoint (sets window.themeInfo, adds mode class to html), theme.css serving for shared shell elements, light-mode/dark-mode CSS override patterns, the inline style gotcha on viewer-panel divs, canvas-based page exceptions, the theme context block injected into transformPage prompts, listThemes() deduplication, and default theme configuration."
