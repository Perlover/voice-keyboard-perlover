# Spec Requirements: Click-to-Toggle Voice Recording

## Initial Description

Change the voice input UX to use click-to-start/click-to-stop recording:

### Current Behavior

- Left click on microphone icon opens a context menu with "Start Voice Input" and "Settings"
- Recording duration is fixed (default 10 seconds)
- Shows notifications during recording

### Desired Behavior

**Left Click:**
- Immediately start voice recording
- Change icon to muted/crossed-out microphone OR make it blink/pulse (blinking preferred)
- Recording continues until user clicks again (no fixed duration)
- When clicked again: stop recording, stop icon animation, transcribe and type text at cursor position
- No notifications should be shown

**Right Click:**
- Open context menu with Settings (no "Start Voice Input" option needed since left click does it)

### Key Changes

1. Left click = toggle recording on/off (not menu)
2. Right click = show settings menu
3. Visual feedback: blinking/pulsing icon during recording
4. Variable recording duration (user-controlled, not timer-based)
5. Remove all notifications
6. Text typed at cursor after recording stops

## Requirements Discussion

### First Round Questions

**Q1: Icon Animation Style**
What kind of animation style do you prefer for the recording state?
- Option A: Smooth opacity fade (icon gradually fades in/out in a continuous loop)
- Option B: Pulse effect (icon scales up/down slightly)
- Option C: Color change (icon changes color/brightness)
- Option D: Rotation animation

**Answer:** Smooth fade animation is acceptable. The icon should gradually fade in/out (not abrupt opacity changes) - smooth dimming and brightening.

**Q2: Icon States**
Should we have distinct icon visuals for different states?
- Idle state: normal microphone icon
- Recording state: animated icon (as discussed in Q1)
- Processing/transcribing state: different icon or animation to show it's working?

**Answer:** Three states needed:
- Idle: normal microphone icon
- Recording: smooth pulsing/fading animation
- Processing: microphone icon with loading indicator overlay - a circle of dots where one bright dot moves counterclockwise through the other dots to show processing is happening

**Q3: Click During Recording**
When user clicks during active recording, should we:
- Stop recording immediately and start transcription
- Wait briefly (e.g., 0.5s) before stopping in case of accidental double-click
- Require a long-press to stop (like mobile voice recording apps)

**Answer:** Stop recording immediately and start transcription.

If clicked again during transcription: cancel transcription (don't start new recording, just cancel)

**Q4: Click During Transcription**
If the user clicks the icon while transcription is in progress (waiting for API response), should we:
- Ignore the click
- Cancel the transcription
- Queue it for the next recording

**Answer:** Cancel the transcription. Don't start new recording, just cancel.

**Q5: Maximum Recording Duration**
Even with user-controlled recording, should we have a safety maximum duration to prevent:
- Extremely large audio files
- User forgetting recording is active
- Memory/storage issues

I'm thinking 5 minutes as a reasonable maximum with a notification when limit is reached. Should we have a configurable max duration setting?

**Answer:** Set maximum duration to 5 minutes by default. Make this configurable in settings.

**Q6: Recording-Duration Setting**
Currently there's a "recording-duration" setting (3-60 seconds spinbutton). Since we're moving to toggle-based recording, should we:
- Remove this setting entirely
- Repurpose it as "maximum recording duration" (safety limit)
- Keep it as an optional "auto-stop after X seconds" feature

**Answer:** Keep the setting but repurpose it as "maximum recording duration" instead of fixed duration. The maximum duration (5 minutes) should be changeable in settings.

**Q7: API Error Handling**
When transcription fails (API error, network issue, etc.), should we:
- Show error notification despite removing other notifications
- Show error in a temporary tooltip on the icon
- Change icon to error state (e.g., red microphone with X)
- Log error silently (user sees nothing)

**Answer:** Show system notification ONLY on API errors.

Change from current behavior: Previously notifications showed recognized text - now only show notifications for errors.

**Q8: Notification Removal**
You mentioned "remove all notifications". To clarify, should we remove:
- "Recording started" notification
- "Recording stopped" notification
- "Recognized: [text]" notification showing transcribed text
- Error notifications (API failures, missing config, etc.)

Or only remove the informational ones and keep error notifications?

**Answer:**
Keep notifications for:
- API errors
- Maximum recording time reached (5 minutes or user-configured limit)

Remove notifications for:
- "Recording started"
- "Recognized: [text]" success messages

**Q9: Right-Click Menu**
You want right-click to show Settings. Should the menu still include:
- Just "Settings" option (single item menu)
- Settings + other options like "About" or "Help"
- Settings + separator + "Remove from panel" (standard for applets)

**Answer:** Only "Settings" in menu (remove "Start Voice Input"). Disable settings access while recording is in progress.

**Q10: Keyboard Shortcut Integration**
The product roadmap mentions hotkey activation as a planned feature (v1.1). When that's implemented, should the hotkey:
- Only start recording (not toggle)
- Toggle recording on/off (same behavior as left-click)
- Be a separate action from click behavior

**Answer:** If hotkey exists or is added, it should also toggle recording on/off (same behavior as left-click).

**Q11: Text Insertion Delay**
Currently the whisper-voice-input script uses xdotool with a delay between characters. For the new toggle behavior, should we:
- Insert text immediately after transcription completes
- Add a small delay (0.2s) before typing to ensure cursor is ready
- Keep current character-by-character typing with delays
- Type text instantly all at once (if xdotool supports it)

**Answer:** Insert text immediately after transcription completes. Remove the 0.2s delay between typing letters - text should be inserted quickly and instantly (not character by character with delays).

**Q12: Visual Feedback Before Configuration**
If user clicks to start recording but API key/backend isn't configured yet, should we:
- Show error notification immediately
- Start recording anyway and show error when trying to transcribe
- Open settings dialog automatically with a prompt
- Show error tooltip on icon

**Answer:** If API keys not configured, clicking should trigger an error and prompt user to configure settings.

### Follow-up Questions

**Follow-up 1: Recording State Recovery After Errors**
If an error occurs during recording (e.g., API error, network failure), how should the icon state recover?
- Option A: Show error state icon (red triangle with warning symbol overlay) - user must click to acknowledge and return to IDLE
- Option B: Return to IDLE state immediately and only show notification
- Option C: Show error state for 3 seconds, then auto-return to IDLE

Should we use a standard warning triangle overlay pattern (similar to system applets)?

**Answer:**
- Show error state: Red triangle with exclamation mark overlay on top of microphone icon
- Allow user to click the error icon → show modal dialog with error details → dialog closes and icon returns to IDLE state
- Recommendation accepted: Use warning triangle overlay pattern (standard for system applets)

**Follow-up 2: Maximum Duration Notification Behavior**
When the maximum recording duration (5 minutes) is reached, you mentioned showing a notification. Should the system:
- Stop recording automatically and start transcription (as if user clicked)?
- Stop recording and return to IDLE without transcribing?
- Continue recording but show warning notification?

**Answer:** Automatically stop recording and start transcription (as if user clicked).

**Follow-up 3: Settings Dialog Behavior During Processing**
You mentioned disabling settings access during recording. What about during processing/transcription state?
- Option A: Keep settings disabled during both RECORDING and PROCESSING states
- Option B: Allow settings during PROCESSING (only disable during RECORDING)
- Option C: Allow opening settings at any time, but warn if recording/processing will be cancelled

Also, if the user has the settings dialog already open and then clicks to start recording, should the dialog:
- Close automatically?
- Stay open (allow configuration while recording)?
- Block the recording from starting?

**Answer:**
- Allow opening settings at any time (during recording, processing, or idle)
- Recommendation accepted: No UI blocking for settings - simpler implementation, more flexible UX
- If dialog already open when recording starts, user can close it normally

**Follow-up 4: Icon Animation Timing Parameters (recording state)**
For the smooth fade animation during RECORDING state, can you specify:
- Complete fade cycle duration (e.g., 2 seconds for full fade out + fade in)?
- Minimum opacity level (e.g., fade to 30% or complete transparency 0%)?

These parameters affect how noticeable/distracting the animation is.

**Answer:**
- Complete fade cycle: 2 seconds (1 sec fade out + 1 sec fade in)
- Minimum opacity: 30% (not complete transparency)

**Follow-up 5: Processing State Animation Timing**
For the PROCESSING state with the moving dot around the circle:
- How many dots in the circle (e.g., 6, 8, 12)?
- Where should the dots be positioned (around the icon perimeter or overlaid on top)?
- Rotation speed (complete rotation in 1 second, 2 seconds, or slower)?

**Answer:**
- Number of dots: 8 dots in a circle
- Position: Dots arranged around the microphone icon (reduce microphone size if needed to fit)
- Rotation speed: Complete rotation in 2 seconds
- One bright dot moves counterclockwise through the other dots

**Follow-up 6: Text Insertion Focus Handling**
When transcription completes and text is ready to insert, what should happen if:
- The active window has changed since recording started?
- No text input field has focus?
- The application is locked or screen is locked?

Should we:
- Option A: Always attempt to type via xdotool (current behavior)
- Option B: Check if active window changed, and if so, show notification with text + copy to clipboard instead of typing
- Option C: Always show notification + copy to clipboard as fallback along with typing

**Answer:**
- **Option B selected:** If active window changed since recording started:
  - Show notification with recognized text
  - Copy text to clipboard automatically
  - User can paste manually where needed
- User noted this can be enhanced later if needed (future request for full window tracking)

**Follow-up 7: Cancelled Transcription Feedback**
When user clicks during PROCESSING state to cancel transcription, should there be:
- A notification saying "Transcription cancelled"?
- A brief visual feedback (e.g., icon flashes red for 0.5s)?
- Silent return to IDLE state with no feedback?

**Answer:** Silently return to IDLE state (no notification or visual feedback for cancellation).

**Follow-up 8: Configuration Error Details**
When API keys are not configured and user clicks to start recording, you said to "trigger an error and prompt user to configure settings". Should this:
- Show a notification with error message + automatically open settings dialog?
- Show only a notification with instructions (user manually opens settings)?
- Show modal dialog with error details and "Open Settings" button?

**Answer:**
- Automatically open the settings modal dialog
- Show notification stating that settings are not configured
- User can configure API keys directly in the opened dialog

### Existing Code to Reference

No similar existing features identified for reference.

The current implementation in `applet/voice-keyboard@perlover/applet.js` has the click behavior and menu system that will need to be modified. The `scripts/whisper-voice-input` Python script handles the recording and transcription logic.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

No visual assets to analyze.

## Requirements Summary

### Feature Overview

This specification transforms the voice input UX from a menu-based, fixed-duration recording system to an intuitive click-to-toggle interface with user-controlled recording duration. The change prioritizes visual feedback through icon states and animations while minimizing intrusive notifications.

**Core Interaction Pattern:**
- Left-click: Toggle recording on/off (replaces menu-based interaction)
- Right-click: Access settings (streamlined menu)
- Visual states replace notification-heavy feedback
- User controls recording duration directly

### User Interaction Flow

**Happy Path (Successful Recording):**
1. User left-clicks microphone icon (IDLE → RECORDING)
2. Icon begins smooth fade animation (2-second cycle, 30% minimum opacity)
3. User speaks for desired duration (up to 5 minutes)
4. User left-clicks again (RECORDING → PROCESSING)
5. Icon shows rotating dot animation (8 dots, 2-second rotation)
6. Transcription completes, text inserted at cursor
7. Icon returns to IDLE state
8. No notifications shown (success is silent)

**Alternative Path (Configuration Error):**
1. User left-clicks microphone icon
2. System detects missing API configuration
3. Settings dialog opens automatically
4. Notification displays: "Settings are not configured"
5. User configures API keys in dialog
6. User can now start recording

**Alternative Path (Active Window Changed):**
1. User starts recording in Application A
2. During recording, user switches to Application B
3. User stops recording and transcription completes
4. System detects window change
5. Notification shows recognized text
6. Text automatically copied to clipboard
7. User manually pastes where needed

**Alternative Path (Maximum Duration Reached):**
1. User starts recording
2. Recording reaches 5-minute maximum (or configured limit)
3. System automatically stops recording
4. Notification: "Maximum recording time reached"
5. Transcription begins automatically (as if user clicked)
6. Text inserted at cursor

**Alternative Path (Transcription Error):**
1. User completes recording
2. API error occurs during transcription
3. Icon changes to error state (warning triangle overlay)
4. User clicks error icon
5. Modal dialog shows error details
6. User closes dialog
7. Icon returns to IDLE state

**Alternative Path (User Cancellation During Processing):**
1. User stops recording, transcription begins
2. User clicks icon during PROCESSING state
3. Transcription cancelled silently
4. Icon returns to IDLE state
5. No notification or visual feedback

### Visual States & Animations

**State 1: IDLE**
- Icon: Normal microphone icon (audio-input-microphone-symbolic)
- Animation: None
- Interaction: Left-click starts recording, right-click opens menu
- Transitions to: RECORDING (on left-click), ERROR (on configuration failure)

**State 2: RECORDING**
- Icon: Same microphone icon with opacity animation
- Animation: Smooth fade cycle (2 seconds total)
  - 1 second fade out to 30% opacity
  - 1 second fade in to 100% opacity
  - Continuous loop until stopped
- Interaction: Left-click stops recording and starts transcription
- Transitions to: PROCESSING (on left-click or max duration reached)
- Settings access: Allowed (user can open settings during recording)

**State 3: PROCESSING**
- Icon: Microphone icon (may be reduced in size)
- Animation: 8-dot circular loading indicator
  - Dots arranged in circle around microphone
  - One bright dot moves counterclockwise through other dots
  - Complete rotation in 2 seconds
  - Continuous loop until transcription completes
- Interaction: Left-click cancels transcription
- Transitions to: IDLE (on completion), IDLE (on cancellation), ERROR (on transcription failure)
- Settings access: Allowed (user can open settings during processing)

**State 4: ERROR**
- Icon: Normal microphone icon with red warning triangle overlay
- Overlay: Warning triangle with exclamation mark (⚠️) positioned on top of microphone
- Animation: None (static error state)
- Interaction: Left-click opens modal dialog with error details
- Transitions to: IDLE (after user closes error dialog)
- Purpose: Indicates transcription error, API failure, or other exceptions

### Edge Cases & Error Handling

**Edge Case 1: Configuration Missing**
- Trigger: User clicks to start recording without API key configured
- Behavior:
  - Settings dialog opens automatically
  - Notification: "Settings are not configured"
  - Icon remains in IDLE state (recording doesn't start)
- User action: Configure API keys in dialog, then retry

**Edge Case 2: Click During Recording**
- Trigger: User left-clicks while in RECORDING state
- Behavior: Stop recording immediately, transition to PROCESSING state
- No confirmation required (intentional quick toggle)

**Edge Case 3: Click During Processing**
- Trigger: User left-clicks while in PROCESSING state
- Behavior: Cancel transcription, return to IDLE state silently
- No notification or visual feedback for cancellation

**Edge Case 4: Maximum Duration Reached**
- Trigger: Recording reaches configured maximum (default 5 minutes)
- Behavior:
  - Stop recording automatically
  - Show notification: "Maximum recording time reached"
  - Start transcription automatically (as if user clicked)
  - Transition to PROCESSING state

**Edge Case 5: API/Network Error During Transcription**
- Trigger: Transcription fails due to API error, network issue, or timeout
- Behavior:
  - Transition to ERROR state (warning triangle overlay)
  - System notification shows error details
  - User clicks icon to view full error in modal dialog
  - Dialog closes → return to IDLE state

**Edge Case 6: Active Window Changed**
- Trigger: Transcription completes but active window changed since recording started
- Behavior:
  - Show notification with recognized text
  - Copy text to clipboard automatically
  - Do NOT attempt to type via xdotool
  - User manually pastes where needed
- Note: Can be enhanced in future for full window tracking

**Edge Case 7: Settings Dialog Already Open**
- Trigger: User starts recording while settings dialog is open
- Behavior:
  - Recording starts normally
  - Dialog remains open
  - User can close dialog normally (no forced closure)
  - Settings changes still take effect

**Edge Case 8: Screen Locked During Recording**
- Trigger: Screen locks or user logs out while recording active
- Behavior: Follow system behavior for running processes
- Note: Cinnamon applet may be suspended; future enhancement for state persistence

**Edge Case 9: Multiple Rapid Clicks**
- Trigger: User clicks icon multiple times quickly
- Behavior: Each click transitions state sequentially (IDLE → RECORDING → PROCESSING → IDLE)
- No debouncing or double-click detection (immediate response preferred)

**Edge Case 10: Very Short Recordings (Under 1 Second)**
- Trigger: User starts and immediately stops recording
- Behavior: Still send to transcription API
- Note: API may return empty/error; handle gracefully

### Notification Behavior Changes

**Notifications Removed (Previously Shown):**
- "Recording started"
- "Recording stopped"
- "Recognized: [text]" (success message with transcribed text)

**Notifications Retained/Added:**
- API errors (network failures, authentication issues, server errors)
- Maximum recording time reached (5 minutes or configured limit)
- Configuration errors ("Settings are not configured")
- Active window changed (show recognized text when can't type)

**Notification Format:**
- Use existing notification system: `imports.ui.main.notify()`
- Title: "Voice Keyboard Perlover"
- Message: Specific error or status details
- Duration: System default (user-configurable in Cinnamon settings)

### Settings Changes

**Modified Setting: recording-duration**

**Current Definition (settings-schema.json):**
```json
"recording-duration": {
    "type": "spinbutton",
    "default": 10,
    "min": 3,
    "max": 60,
    "step": 1,
    "units": "seconds",
    "description": "Recording Duration",
    "tooltip": "Duration of audio recording in seconds"
}
```

**New Definition:**
```json
"recording-duration": {
    "type": "spinbutton",
    "default": 300,
    "min": 10,
    "max": 600,
    "step": 10,
    "units": "seconds",
    "description": "Maximum Recording Duration",
    "tooltip": "Safety limit for maximum recording duration. Recording will automatically stop and transcribe when this limit is reached. Default: 5 minutes (300 seconds)."
}
```

**Changes:**
- Description: "Recording Duration" → "Maximum Recording Duration"
- Tooltip: Explains new purpose as safety limit, not fixed duration
- Default: 10 → 300 (5 minutes)
- Min: 3 → 10 (prevent very short maximums)
- Max: 60 → 600 (allow up to 10 minutes)
- Step: 1 → 10 (larger increments for better UX)

**Settings Menu Access:**
- Right-click shows menu with only "Settings" option
- "Start Voice Input" option removed (redundant with left-click)
- Settings can be opened during any state (IDLE, RECORDING, PROCESSING)
- Previous requirement to disable settings during recording has been removed
- Settings dialog can remain open while recording/processing happens

### Technical Notes

**State Machine Implementation:**
```
States: IDLE, RECORDING, PROCESSING, ERROR

Transitions:
IDLE + left-click (configured) → RECORDING
IDLE + left-click (not configured) → ERROR (auto-open settings)
RECORDING + left-click → PROCESSING
RECORDING + max duration → PROCESSING (with notification)
PROCESSING + left-click → IDLE (cancel)
PROCESSING + completion → IDLE (success)
PROCESSING + API error → ERROR
ERROR + left-click → show error dialog → IDLE
```

**Animation Implementation (GJS/Clutter):**

Recording state fade animation:
```javascript
// Pseudo-code for smooth fade
this.actor.ease({
    opacity: 77,  // 30% of 255
    duration: 1000,  // 1 second
    mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
    onComplete: () => {
        this.actor.ease({
            opacity: 255,  // 100%
            duration: 1000,
            mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
            onComplete: () => {
                // Loop if still in RECORDING state
            }
        });
    }
});
```

Processing state rotation:
```javascript
// Create 8 dots in circle
// Rotate bright dot counterclockwise
// Complete rotation in 2000ms
```

**Text Insertion Modifications:**

Current behavior (scripts/whisper-voice-input):
```python
# Character-by-character with delay
for char in text:
    subprocess.run(['xdotool', 'type', '--', char])
    time.sleep(0.2)
```

New behavior:
```python
# Instant insertion, all at once
subprocess.run(['xdotool', 'type', '--', text], timeout=10)
```

**Window Focus Detection:**
```python
# Get active window at recording start
initial_window = subprocess.check_output(['xdotool', 'getactivewindow']).decode().strip()

# After transcription, check if window changed
current_window = subprocess.check_output(['xdotool', 'getactivewindow']).decode().strip()

if initial_window != current_window:
    # Copy to clipboard and show notification
    copy_to_clipboard(text)
    show_notification(text)
else:
    # Type normally
    insert_text(text)
```

**Maximum Duration Handling:**
```python
# In recording function
max_duration = int(os.environ.get('RECORDING_DURATION', 300))
# Use ffmpeg with -t flag for duration limit
# When limit reached, process same as normal stop
```

**Configuration Validation:**
```javascript
// In applet.js before starting recording
function validateConfiguration() {
    let mode = this.settings.getValue('whisper-mode');
    if (mode === 'openai') {
        let apiKey = this.settings.getValue('openai-api-key');
        if (!apiKey || apiKey.trim() === '') {
            return false;
        }
    } else if (mode === 'local') {
        let serverUrl = this.settings.getValue('whisper-local-url');
        if (!serverUrl || serverUrl.trim() === '') {
            return false;
        }
    }
    return true;
}
```

**Error State Implementation:**
```javascript
// Show error overlay on icon
function showErrorState(errorMessage) {
    this.errorMessage = errorMessage;
    // Add red warning triangle overlay to icon
    // Change state to ERROR
    // Wait for user click to show modal
}

function onErrorIconClicked() {
    // Show modal dialog with this.errorMessage
    // On dialog close, transition to IDLE
    this.setState(STATE_IDLE);
}
```

### Reusability Opportunities

No similar existing features to reuse. This is a fundamental UX change to existing functionality.

**Existing code to modify:**
- `applet/voice-keyboard@perlover/applet.js` - Click handlers, menu system, icon animations, state machine
- `applet/voice-keyboard@perlover/settings-schema.json` - Update recording-duration setting description and defaults
- `scripts/whisper-voice-input` - Text insertion timing (remove delays), window focus detection, maximum duration handling

**Existing libraries/patterns to leverage:**
- `St.Icon` for icon state management
- `Clutter.AnimationMode` for smooth fade effects (EASE_IN_OUT_QUAD)
- `Clutter.Actor.ease()` for opacity animations
- `GLib.spawn_async_with_pipes` for Python script interaction
- `Settings.AppletSettings` for configuration binding
- `imports.ui.main.notify()` for system notifications
- `imports.ui.modalDialog.ModalDialog` for error detail dialogs

### Scope Boundaries

**In Scope:**
- Change left-click from menu to toggle recording
- Implement four icon states (IDLE, RECORDING, PROCESSING, ERROR) with animations
- Recording state: smooth fade animation (2-second cycle, 30% minimum opacity)
- Processing state: 8-dot circular loading indicator (2-second rotation, counterclockwise)
- Error state: warning triangle overlay with modal dialog for details
- Remove informational notifications (keep only error/limit notifications)
- Add maximum recording duration safety limit (5 minutes default, configurable up to 10 minutes)
- Change right-click menu to only show "Settings"
- Allow settings access during all states (no blocking)
- Update text insertion to be immediate (remove character delays)
- Handle edge cases: click during recording, click during transcription, cancellation
- Window focus detection: copy to clipboard if active window changed
- Repurpose recording-duration setting as maximum duration (update UI and defaults)
- Configuration validation: auto-open settings if API keys missing
- Maximum duration notification and automatic transcription

**Out of Scope:**
- Hotkey activation (future feature in v1.1 roadmap - but design should support it)
- Real-time audio level indicator (future feature in v1.1 roadmap)
- Voice activity detection (future feature in v1.3 roadmap)
- Streaming transcription (future feature in v1.2 roadmap)
- Alternative animation styles beyond smooth fade (pulse, scale, rotation, color change)
- Complex error recovery UI beyond modal dialog
- Undo/redo for transcribed text
- Text preview before insertion
- Recording pause/resume functionality
- Audio waveform visualization
- Recording history or saved transcriptions
- Multiple language detection within single recording
- Custom keyboard shortcuts (wait for v1.1 hotkey feature)
- Advanced window tracking (full window monitoring beyond initial detection)

### Technical Considerations

**GJS/Cinnamon Constraints:**
- No ES6 syntax - use `function()` not arrow functions `() =>`
- No async/await - use callbacks with `Lang.bind(this, callback)`
- Animation must use `Clutter.AnimationMode` and `Clutter.Actor.ease()`
- Settings binding via `this.settings.bind()` pattern
- State management must be explicit (no external state libraries)

**Animation Requirements:**
- Smooth fade animation for RECORDING state (no abrupt opacity changes)
- Use `Clutter.AnimationMode.EASE_IN_OUT_QUAD` for smooth transitions
- Loading indicator animation for PROCESSING state (counterclockwise moving dot)
- Must handle animation cleanup when state changes (cancel ongoing animations)
- Store animation references to allow cancellation: `if (this.recordingAnimation) this.recordingAnimation.stop();`

**State Machine:**
```
States:
- IDLE: Normal microphone icon, no animation
- RECORDING: Fade animation (2s cycle, 30% min opacity)
- PROCESSING: 8-dot rotation animation (2s rotation)
- ERROR: Warning triangle overlay, static

Transitions:
IDLE → RECORDING (on valid click)
IDLE → ERROR (on configuration error) → auto-open settings
RECORDING → PROCESSING (on click or max duration)
PROCESSING → IDLE (on completion or cancellation)
PROCESSING → ERROR (on transcription failure)
ERROR → IDLE (after error dialog closed)
```

**Python Script Modifications:**

1. Text insertion (instant, no delays):
```python
# Remove character-by-character loop
# Use single xdotool command
subprocess.run(['xdotool', 'type', '--', text], timeout=10)
```

2. Window focus detection:
```python
# Store initial window at recording start
initial_window = subprocess.check_output(['xdotool', 'getactivewindow'])

# After transcription, compare
current_window = subprocess.check_output(['xdotool', 'getactivewindow'])
if initial_window != current_window:
    copy_to_clipboard(text)
    show_notification(text)
else:
    insert_text(text)
```

3. Maximum duration handling:
```python
# Use ffmpeg -t flag for duration limit
max_duration = int(os.environ.get('RECORDING_DURATION', 300))
ffmpeg_command = ['ffmpeg', '-f', 'pulse', '-t', str(max_duration), ...]
```

4. Exit codes for different scenarios:
```python
# 0 = success
# 1 = configuration error
# 2 = recording error
# 3 = transcription error
# 4 = cancelled by user
# 5 = timeout/max duration
```

**Settings Schema Updates:**

Change in `settings-schema.json`:
```json
"recording-duration": {
    "type": "spinbutton",
    "default": 300,
    "min": 10,
    "max": 600,
    "step": 10,
    "units": "seconds",
    "description": "Maximum Recording Duration",
    "tooltip": "Safety limit for maximum recording duration. Recording will automatically stop and transcribe when this limit is reached. Default: 5 minutes (300 seconds)."
}
```

**Error Handling Requirements:**

1. Configuration validation before recording:
```javascript
function validateConfiguration() {
    let mode = this.whisperMode;  // bound via settings
    if (mode === 'openai' && !this.openaiApiKey) return false;
    if (mode === 'local' && !this.whisperLocalUrl) return false;
    return true;
}

function onLeftClick() {
    if (!this.validateConfiguration()) {
        this.openSettingsDialog();
        Main.notify('Voice Keyboard Perlover', 'Settings are not configured');
        return;
    }
    // Start recording...
}
```

2. Error state management:
```javascript
function showError(message) {
    this.currentState = STATE_ERROR;
    this.errorMessage = message;
    this.showErrorOverlay();  // Add warning triangle to icon
    Main.notify('Voice Keyboard Perlover', message);
}

function onErrorIconClick() {
    // Show modal dialog with full error details
    let dialog = new ModalDialog.ModalDialog();
    // ... configure dialog with this.errorMessage
    dialog.open();
    dialog.connect('closed', Lang.bind(this, function() {
        this.setState(STATE_IDLE);
    }));
}
```

3. Transcription cancellation:
```javascript
function cancelTranscription() {
    if (this.transcriptionProcess) {
        // Kill Python process
        GLib.spawn_close_pid(this.transcriptionProcess.pid);
        this.transcriptionProcess = null;
    }
    this.setState(STATE_IDLE);
    // No notification for cancellation (silent)
}
```

**Notification Strategy:**

Show notifications ONLY for:
- API errors: "Transcription failed: [error details]"
- Maximum duration reached: "Maximum recording time reached"
- Configuration errors: "Settings are not configured"
- Window changed: "[Recognized text]" (with clipboard copy)

Do NOT show notifications for:
- Recording started
- Recording stopped
- Successful transcription (text just appears)
- User cancellation

**Click Handler Implementation:**

```javascript
// Override base applet click handlers
on_applet_clicked: function(event) {
    // Left click handler
    this.handleLeftClick();
},

_onButtonPressEvent: function(actor, event) {
    // Detect right-click for menu
    if (event.get_button() === 3) {  // Right mouse button
        this._openSettingsMenu();
        return true;
    }
    return false;
},

handleLeftClick: function() {
    switch(this.currentState) {
        case STATE_IDLE:
            if (!this.validateConfiguration()) {
                this.openSettingsDialog();
                Main.notify('Voice Keyboard Perlover', 'Settings are not configured');
                return;
            }
            this.startRecording();
            break;
        case STATE_RECORDING:
            this.stopRecording();
            break;
        case STATE_PROCESSING:
            this.cancelTranscription();
            break;
        case STATE_ERROR:
            this.showErrorDialog();
            break;
    }
}
```

**Animation Cleanup Pattern:**

```javascript
function setState(newState) {
    // Clean up previous state animations
    if (this.currentAnimation) {
        this.currentAnimation.stop();
        this.currentAnimation = null;
    }

    this.currentState = newState;

    // Start new state animations
    switch(newState) {
        case STATE_IDLE:
            this.setIdleIcon();
            break;
        case STATE_RECORDING:
            this.startRecordingAnimation();
            break;
        case STATE_PROCESSING:
            this.startProcessingAnimation();
            break;
        case STATE_ERROR:
            this.showErrorIcon();
            break;
    }
}
```

**Existing Code Patterns to Follow:**
- Use `global.logError()` for error logging in GJS
- Use `print(..., file=sys.stderr)` for error logging in Python
- Use `this.settings.getValue('key')` and `setValue('key', value)` for settings access
- Follow existing notification pattern: `imports.ui.main.notify('Title', 'Message')`
- Use existing icon path structure for different icon states
- Follow existing `GLib.spawn_async_with_pipes` pattern for Python script execution
- Use `Lang.bind(this, callback)` for all callbacks to preserve context
- Follow existing process management patterns for spawning/killing Python script

**Future Compatibility Notes:**

1. Hotkey support (v1.1): Design state machine to support both click and hotkey triggers
2. Real-time indicators (v1.1): Recording state can be extended with audio level overlay
3. Streaming transcription (v1.2): Processing state can show partial results
4. Voice activity detection (v1.3): Can auto-trigger recording start/stop

**Testing Checklist:**

Before implementation complete:
- [ ] Left-click starts recording (IDLE → RECORDING)
- [ ] Icon fades smoothly during recording (2s cycle, 30% min)
- [ ] Left-click during recording stops and starts transcription
- [ ] Processing state shows 8-dot rotation animation (2s counterclockwise)
- [ ] Text inserts instantly without character delays
- [ ] Right-click shows menu with only "Settings"
- [ ] Settings can be opened during any state
- [ ] Configuration validation opens settings automatically if keys missing
- [ ] Maximum duration stops recording and shows notification
- [ ] Window change detection copies to clipboard and shows notification
- [ ] Click during processing cancels silently
- [ ] API errors show error state with warning triangle overlay
- [ ] Error icon click shows modal dialog with details
- [ ] Dialog close returns to IDLE state
- [ ] No notifications for start/stop/success
- [ ] Settings dialog updates maximum duration properly
- [ ] All state transitions work correctly
- [ ] Animations clean up properly on state changes
