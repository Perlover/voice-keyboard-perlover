# Specification: Fix Click-to-Toggle Event Handling Bugs

## Goal

Fix two critical bugs preventing the click-to-toggle voice recording feature from working: the missing event handler connection and incorrect event propagation logic that blocks left-click functionality.

## User Stories

- As a user, I want left-clicking the microphone icon to start recording so that the click-to-toggle feature works as designed
- As a developer, I want clear event propagation using Clutter constants so that the code is maintainable and correct

## Specific Requirements

**Bug 1: Missing Event Handler Connection**
- `_onButtonPressEvent` handler is defined at line 640 but never connected to the actor
- Connection must be added in `_init` function after line 78 (after menu setup)
- Use standard GJS pattern: `this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));`
- Connection enables right-click menu and allows left-click events to propagate to `on_applet_clicked`
- Without this connection, no button press events are handled at all

**Bug 2: Incorrect Event Propagation Logic**
- `_onButtonPressEvent` currently returns `true` for right-click (correct) and `false` for left-click (incorrect)
- Boolean return values can be ambiguous across different Cinnamon/GJS versions
- Must use explicit Clutter event constants for clarity and correctness
- Right-click (button 3): return `Clutter.EVENT_STOP` to block propagation and handle menu toggle
- Left-click and other buttons: return `Clutter.EVENT_PROPAGATE` to allow event to reach `on_applet_clicked`
- Clutter constant import already exists at line 10

**Fix 1 Implementation Location**
- File: `/home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js`
- Insert after line 78 in `_init` function (after `this.menu.addMenuItem(settingsItem);`)
- Add comment explaining right-click menu behavior
- Use Lang.bind to preserve context (required for GJS callbacks)

**Fix 2 Implementation Location**
- File: `/home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js`
- Lines 640-647: `_onButtonPressEvent` function
- Replace `return true` with `return Clutter.EVENT_STOP` for right-click
- Replace `return false` with `return Clutter.EVENT_PROPAGATE` for other buttons
- Add comment explaining propagation behavior to `on_applet_clicked`

**Testing Procedure**
- Apply both fixes to `applet.js`
- Copy fixed file to `/usr/share/cinnamon/applets/voice-keyboard@perlover/`
- Restart Cinnamon (Alt+F2, type 'r', press Enter)
- Left-click icon: should start fade animation and enter RECORDING state
- Second left-click: should stop recording and show dot animation (PROCESSING state)
- Right-click: should open settings menu (verify no regression)
- Check `~/.xsession-errors` for any errors during testing

**Acceptance Criteria**
- Left-click starts recording with visible fade animation
- Second left-click stops recording and shows processing animation
- Third left-click (during processing) cancels and returns to IDLE
- Right-click opens settings menu without starting recording
- No errors in `~/.xsession-errors` log during normal operation
- Configuration validation works (settings dialog opens if API key missing)

## Visual Design

No visual assets needed. This is a bugfix that enables existing animations and state transitions that are already implemented.

## Existing Code to Leverage

**Clutter Event Constants (already imported at line 10)**
- `Clutter.EVENT_STOP` - blocks event propagation (use for right-click)
- `Clutter.EVENT_PROPAGATE` - allows event propagation (use for left-click)
- Clutter module already imported, no additional imports needed

**GJS Event Connection Pattern (used elsewhere in codebase)**
- `Lang.bind(this, callback)` - preserves `this` context in callbacks (required for GJS)
- `this.actor.connect('signal-name', Lang.bind(this, handler))` - standard connection pattern
- Connection should occur in `_init` after related UI components are created

**Existing State Machine (lines 14-17, 340-385)**
- `setState()` function handles all state transitions and animation cleanup
- `handleLeftClick()` function contains logic for each state (lines 391-423)
- `on_applet_clicked()` override calls `handleLeftClick()` (lines 632-634)
- All state management logic is correct and working, just blocked by event bugs

**Existing Animations (lines 115-163, 169-251)**
- Recording fade animation using `Clutter.Actor.ease()` (implemented correctly)
- Processing dot animation using rotating bright dot (implemented correctly)
- Both animations start correctly when `setState()` is called
- Animations are not visible only because `handleLeftClick()` never executes

## Out of Scope

- State machine logic changes (already correct)
- Animation implementation changes (already correct)
- Python script modifications (script works correctly)
- Settings schema changes (not needed for bugfix)
- Process monitoring or exit code handling (implementation correct)
- Notification behavior changes (not affected by bugs)
- Menu structure changes (settings menu already correct)
- Tooltip changes (already updated in original implementation)
- Configuration validation logic (already implemented correctly)
- Maximum recording duration behavior (already working)
