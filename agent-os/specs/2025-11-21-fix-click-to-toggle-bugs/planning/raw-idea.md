# Fix Critical Bugs in Click-to-Toggle Voice Recording Implementation

**Feature idea:** Fix critical bugs in click-to-toggle voice recording implementation

**Description:**
The current implementation (2025-11-20-click-to-toggle-voice-recording) has critical bugs that prevent basic functionality:

**Bug 1 - Left click doesn't work:**
- `on_applet_clicked` is defined but `_onButtonPressEvent` is NOT connected to actor events in `_init`
- Need to add: `this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));` in `_init`

**Bug 2 - Right click behavior needs verification:**
- `_onButtonPressEvent` returns false for left-click, which may prevent `on_applet_clicked` from being called
- Need to ensure proper event propagation for left-click

**Bug 3 - Script path may be undefined:**
- Settings bind `script-path` but this setting doesn't exist in `settings-schema.json`
- Need to either add the setting or hardcode path to `/usr/bin/whisper-voice-input`

**Bug 4 - Process monitoring callback may have issues:**
- child_watch_add callback needs proper exit code extraction and stdout/stderr reading
- Need to verify GLib.child_watch_add usage is correct

**Current date:** 2025-11-21
