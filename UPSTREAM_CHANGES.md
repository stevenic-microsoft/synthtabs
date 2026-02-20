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
