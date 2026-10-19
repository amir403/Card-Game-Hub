---
name: Expo web font loading
description: Web-preview font loading behavior for the Expo card-game app.
---

The card-game app should keep loading Inter on iOS and Android, but skip runtime Google-font loading on web and use the browser's system font fallback.

**Why:** Expo web's FontFaceObserver timed out after 12 seconds while loading the Inter assets, leaving the preview blank. The rest of the app rendered normally when web font loading was bypassed.

**How to apply:** If revisiting typography or the root font gate, preserve native Inter loading and test the web preview separately; do not re-enable Inter loading on web without verifying the timeout is resolved.
