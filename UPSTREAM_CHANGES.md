# Upstream Changes to Apply to SynthOS

## page-v2.js: Fix initial focus race with chat-collapsed check

The initial `chatInput.focus()` runs before the chat-collapsed localStorage check,
so if the panel was previously collapsed, the input gets focused then immediately
blurred when the panel slides off-screen. The browser moves focus to the body/viewer.

### Fix

In `page-scripts/page-v2.js`:

1. **Remove** the early focus call (around line 100-102):

```diff
-    // 1. Initial focus
-    var chatInput = document.getElementById('chatInput');
-    if (chatInput) chatInput.focus();
+    var chatInput = document.getElementById('chatInput');
```

2. **Add** focus at the very end of the outer IIFE, just before `})();`:

```diff
     })();
+
+    // Initial focus — run after all setup (including chat-collapsed check)
+    if (chatInput && !document.body.classList.contains('chat-collapsed')) {
+        chatInput.focus();
+    }
 })();
```

## REQUIRED_PAGES should be derived from the Customizer's requiredPagesFolder

`REQUIRED_PAGES` in `src/pages.ts` is a hardcoded array (`['builder', 'pages', 'settings', ...]`).
This should instead be dynamically read from the files in the Customizer's `requiredPagesFolder`
directory (strip `.html` extensions to get the page names). Forks that add or rename required pages
(e.g. SynthTabs renames `pages.html` → `tabs.html`) currently have to patch this array, which is
fragile and causes merge conflicts on sync.

### Suggested approach

Replace the static constant with a function that scans the folder at startup:

```ts
// src/pages.ts
export function getRequiredPages(requiredPagesFolder: string): string[] {
    // list *.html files in the folder and strip the extension
}
```

Cache the result in `SynthOSConfig` so it's computed once during init and passed through
to `useApiRoutes` / `usePageRoutes`.

## Customizer: add `tabsListRoute` getter

Added a `tabsListRoute` getter to `Customizer` (default `'/pages'`) so forks can override the
route that the outdated-page redirect targets. SynthTabs overrides this to `'/tabs'`.

**Files changed:**
- `src/customizer/Customizer.ts` — new getter `tabsListRoute` returning `'/pages'`

## usePageRoutes: use Customizer for outdated-page redirect

The outdated-page redirect in `usePageRoutes.ts` was hardcoded to `res.redirect('/pages')`.
Changed to `res.redirect(customizer?.tabsListRoute ?? '/pages')` so forks can control
the redirect destination.

**Files changed:**
- `src/service/usePageRoutes.ts` — line ~122, redirect now uses `customizer.tabsListRoute`
