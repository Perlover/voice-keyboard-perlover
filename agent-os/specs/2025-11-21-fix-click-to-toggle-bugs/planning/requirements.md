# Requirements: Fix Click-to-Toggle Event Handling Bugs

## Problem Statement

The click-to-toggle voice recording feature (implemented in spec 2025-11-20) does not work at all. When the user left-clicks on the applet icon, absolutely nothing happens - no visual changes, no state transitions, no recording starts.

### User-Reported Symptoms

1. **Left-click does nothing:**
   - No visual changes to icon
   - No animation starts
   - Icon state doesn't change
   - No recording begins
   - Second click also does nothing
   - No text insertion occurs

2. **Right-click works correctly:**
   - Menu opens properly
   - Settings menu item visible and clickable
   - Settings dialog opens when clicked

3. **No error messages:**
   - No errors in `~/.xsession-errors` log
   - No new log messages when clicking (left or right)
   - Applet loads successfully without errors

4. **Configuration is valid:**
   - API key is configured
   - Whisper mode is set correctly
   - Script exists at `/usr/bin/whisper-voice-input` and is executable
   - Settings are properly saved

## Root Cause Analysis

### Investigation Results

After analyzing the code in `/home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js`:

**Critical Bug Found - Event Handler Not Connected:**

1. **Line 640:** `_onButtonPressEvent` is defined to handle button press events
2. **Line 78:** `_init` function completes WITHOUT connecting this handler
3. **Missing:** `this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));`

**Result:** The event handler is never registered, so it never fires when user clicks.

**Why right-click works:** The menu likely has its own fallback mechanism through `PopupMenuManager` that doesn't require the custom event handler.

**Why left-click doesn't work:** Without the event handler connected, `_onButtonPressEvent` never fires, so it can't call the menu toggle OR propagate the event to `on_applet_clicked`.

### Secondary Bug - Event Propagation Logic

Even if Bug 1 is fixed, there's a second issue in `_onButtonPressEvent` (line 640-647):

```javascript
_onButtonPressEvent: function(actor, event) {
    if (event.get_button() === 3) {  // Right mouse button
        this.menu.toggle();
        return true; // Prevent event propagation
    }
    return false;  // ← PROBLEM: returns false for left-click
}
```

**Problem:** Returning `false` for left-click may not properly propagate the event to `on_applet_clicked`. Different Cinnamon/GJS versions interpret `false` differently.

**Correct approach:** Use Clutter event constants for clarity:
- `Clutter.EVENT_STOP` (or `true`) - block propagation
- `Clutter.EVENT_PROPAGATE` (or `false`) - allow propagation

But the SAFEST approach is to not handle left-click at all in `_onButtonPressEvent` and let it naturally reach `on_applet_clicked`.

## Required Fixes

### Fix 1: Connect Event Handler in _init

**Location:** `applet.js`, in `_init` function after line 77 (after menu setup)

**Add this line:**
```javascript
// Connect button press event handler for right-click menu
this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));
```

**Reasoning:**
- Connects the `_onButtonPressEvent` handler to actor's button-press-event signal
- Uses `Lang.bind(this, ...)` to preserve context (required for GJS)
- Should be added after menu is created (line 64-77)

### Fix 2: Improve Event Propagation Logic

**Location:** `applet.js`, `_onButtonPressEvent` function (line 640-647)

**Current code:**
```javascript
_onButtonPressEvent: function(actor, event) {
    // Check if right mouse button (button 3)
    if (event.get_button() === 3) {
        this.menu.toggle();
        return true; // Prevent event propagation
    }
    return false;
}
```

**Replace with:**
```javascript
_onButtonPressEvent: function(actor, event) {
    // Only handle right mouse button (button 3)
    if (event.get_button() === 3) {
        this.menu.toggle();
        return Clutter.EVENT_STOP; // Block propagation for right-click
    }
    // Let other buttons (including left-click) propagate to on_applet_clicked
    return Clutter.EVENT_PROPAGATE;
}
```

**Changes:**
1. Use `Clutter.EVENT_STOP` instead of `true` (more explicit)
2. Use `Clutter.EVENT_PROPAGATE` instead of `false` (ensures event reaches `on_applet_clicked`)
3. Add comment explaining the propagation behavior

**Reasoning:**
- `Clutter.EVENT_STOP` clearly indicates we want to block the event
- `Clutter.EVENT_PROPAGATE` ensures left-click event reaches `on_applet_clicked`
- More maintainable and easier to understand

## Testing Plan

### Prerequisites
- Applet must be installed in Cinnamon
- Settings must be configured (API key, mode)
- Script must exist at `/usr/bin/whisper-voice-input`

### Test Steps

**Step 1: Apply Fixes**
1. Edit `applet/voice-keyboard@perlover/applet.js`
2. Add Fix 1 (connect event handler) in `_init` after line 77
3. Apply Fix 2 (event propagation) to `_onButtonPressEvent`
4. Save file

**Step 2: Reload Applet**

Option A (recommended):
```bash
# From project directory
sudo cp applet/voice-keyboard@perlover/applet.js /usr/share/cinnamon/applets/voice-keyboard@perlover/
# Then reload Cinnamon: Alt+F2, type 'r', press Enter
```

Option B:
- Right-click on panel → "Troubleshoot" → "Restart Cinnamon"

**Step 3: Test Left-Click Functionality**

1. **Test 1: Start recording**
   - Left-click the applet icon
   - **Expected:** Icon should start fade animation (2-second cycle, 30%-100% opacity)
   - **Expected:** State should change to RECORDING

2. **Test 2: Stop recording**
   - Left-click the applet icon again (while recording)
   - **Expected:** Fade animation stops
   - **Expected:** Processing animation starts (8 rotating dots)
   - **Expected:** State should change to PROCESSING

3. **Test 3: Text insertion**
   - Wait for transcription to complete
   - **Expected:** Recognized text appears at cursor position
   - **Expected:** Icon returns to normal (no animation)
   - **Expected:** State should return to IDLE

4. **Test 4: Configuration error handling**
   - Remove API key from settings
   - Left-click the applet icon
   - **Expected:** Settings dialog opens automatically
   - **Expected:** Notification: "Settings are not configured"

**Step 4: Test Right-Click Functionality (Regression)**

1. Right-click the applet icon
2. **Expected:** Menu opens with "Settings" item
3. Click "Settings"
4. **Expected:** Settings dialog opens

### Acceptance Criteria

- [ ] Left-click on applet icon starts recording (fade animation visible)
- [ ] Second left-click stops recording and starts processing (dot animation visible)
- [ ] Text is inserted at cursor after transcription completes
- [ ] Right-click still opens settings menu (no regression)
- [ ] Configuration validation works (settings dialog opens if API key missing)
- [ ] No errors appear in `~/.xsession-errors` during normal operation

## Out of Scope

The following are **NOT** part of this bugfix:

- State machine logic (already implemented correctly)
- Animation implementations (fade and dot animations already work)
- Python script modifications (script is correct)
- Process monitoring and exit code handling (implementation looks correct)
- Notification behavior (already implemented correctly)
- Settings schema changes (not needed)
- Error handling beyond event connection (existing error handling is sufficient)

## Implementation Notes

### GJS/Cinnamon Constraints

- Must use `Lang.bind(this, callback)` for event handler connection
- Must use Clutter event constants (`EVENT_STOP`, `EVENT_PROPAGATE`) for clarity
- No ES6 syntax (use `function()` not `() =>`)

### Code Location

- **File:** `/home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js`
- **Fix 1 location:** After line 77 in `_init` function
- **Fix 2 location:** Lines 640-647 in `_onButtonPressEvent` function

### Related Files (No Changes Needed)

- `settings-schema.json` - no changes needed
- `scripts/whisper-voice-input` - no changes needed
- `stylesheet.css` - no changes needed

## Risk Assessment

**Risk Level:** Very Low

**Reasoning:**
- Minimal code changes (2 small modifications)
- Changes are isolated to event handling only
- No changes to state machine, animations, or business logic
- Right-click functionality already works (low regression risk)
- Easy to test and verify

## Success Metrics

After fixes are applied:

1. **Functional success:** Left-click starts/stops recording
2. **No regressions:** Right-click menu still works
3. **No errors:** Clean logs during normal operation
4. **User satisfaction:** Feature works as originally designed

## References

- **Original spec:** `agent-os/specs/2025-11-20-click-to-toggle-voice-recording/spec.md`
- **Original tasks:** `agent-os/specs/2025-11-20-click-to-toggle-voice-recording/tasks.md`
- **Affected file:** `applet/voice-keyboard@perlover/applet.js`
- **Cinnamon Applet API:** https://projects.linuxmint.com/reference/git/cinnamon-tutorials/
- **GJS Documentation:** https://gjs-docs.gnome.org/

---

**Status:** Requirements complete, ready for spec writing
**Date:** 2025-11-21
**Priority:** Critical (blocks all functionality)
