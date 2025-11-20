# Task Breakdown: Click-to-Toggle Voice Recording

## Overview

**Feature**: Transform voice input from menu-based fixed-duration recording to click-to-toggle user-controlled recording
**Total Task Groups**: 6
**Estimated Complexity**: Medium-High (state machine + animations + process management)

## Task List

### Task Group 1: State Machine Foundation & Configuration

**Dependencies:** None
**Complexity:** Medium
**Risk:** Low (foundational work, well-defined requirements)

- [x] 1.0 Complete state machine foundation
  - [x] 1.1 Write 2-8 focused tests for state machine
    - Test IDLE → RECORDING transition on valid configuration
    - Test IDLE → ERROR transition on missing API key
    - Test RECORDING → PROCESSING transition on user click
    - Test PROCESSING → IDLE transition on completion
    - Test ERROR → IDLE transition after dialog close
    - Skip exhaustive state transition testing
  - [x] 1.2 Define state constants in applet.js
    - Add constants: STATE_IDLE, STATE_RECORDING, STATE_PROCESSING, STATE_ERROR
    - Initialize currentState variable to STATE_IDLE
  - [x] 1.3 Implement setState() function
    - Accept newState parameter
    - Clean up previous state (stop animations, cancel processes)
    - Update this.currentState
    - Trigger appropriate visual changes for new state
    - Use switch statement for state-specific initialization
  - [x] 1.4 Create configuration validation function
    - Check whisperMode setting value
    - If mode === 'openai': validate openaiApiKey is not empty
    - If mode === 'local': validate localUrl is not empty
    - Return boolean: true if valid, false if invalid
  - [x] 1.5 Update settings schema for maximum duration
    - Change recording-duration description to "Maximum Recording Duration"
    - Update tooltip to explain safety limit and auto-stop behavior
    - Change default: 10 → 300 seconds
    - Change min: 3 → 10 seconds
    - Change max: 60 → 600 seconds
    - Change step: 1 → 10 seconds
  - [x] 1.6 Ensure state machine foundation tests pass
    - Run ONLY the 2-8 tests written in 1.1
    - Verify state transitions work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 1.1 pass
- State constants are defined and initialized correctly
- setState() function properly cleans up previous state
- Configuration validation correctly detects missing API keys
- Settings schema reflects new maximum duration behavior

---

### Task Group 2: Click Handlers & Menu Restructure

**Dependencies:** Task Group 1
**Complexity:** Low-Medium
**Risk:** Low (straightforward UI interaction changes)

- [x] 2.0 Complete click handler implementation
  - [x] 2.1 Write 2-8 focused tests for click handlers
    - Test left-click in IDLE state starts recording (with valid config)
    - Test left-click in IDLE state opens settings (with invalid config)
    - Test left-click in RECORDING state stops recording
    - Test left-click in PROCESSING state cancels transcription
    - Test right-click opens settings menu
    - Skip exhaustive click timing and edge case testing
  - [x] 2.2 Implement handleLeftClick() function
    - Use switch statement based on this.currentState
    - IDLE: validate config, start recording or show error
    - RECORDING: stop recording, transition to PROCESSING
    - PROCESSING: cancel transcription, transition to IDLE
    - ERROR: show error dialog
  - [x] 2.3 Override on_applet_clicked() for left-click
    - Replace menu toggle with call to handleLeftClick()
    - Remove existing menu toggle behavior
  - [x] 2.4 Implement _onButtonPressEvent() for right-click detection
    - Check if event.get_button() === 3 (right mouse button)
    - Show settings menu on right-click only
    - Return true to prevent event propagation
  - [x] 2.5 Update menu construction
    - Remove "Start Voice Input" menu item and its separator
    - Keep only "Settings" menu item
    - Update tooltip to reflect new click behavior
  - [x] 2.6 Ensure click handler tests pass
    - Run ONLY the 2-8 tests written in 2.1
    - Verify click behaviors work correctly for each state
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 2.1 pass
- Left-click triggers appropriate action based on current state
- Right-click shows streamlined settings-only menu
- "Start Voice Input" menu item is removed
- Tooltip accurately describes new interaction pattern

---

### Task Group 3: IDLE & RECORDING States (Icon + Animation)

**Dependencies:** Task Groups 1-2
**Complexity:** Medium
**Risk:** Medium (GJS animation API, timing precision)

- [x] 3.0 Complete IDLE and RECORDING state implementation
  - [x] 3.1 Write 2-8 focused tests for IDLE/RECORDING states
    - Test IDLE state displays correct icon with no animation
    - Test RECORDING state starts fade animation
    - Test fade animation timing (2-second cycle)
    - Test fade animation opacity range (100% to 30%)
    - Test animation cleanup on state transition
    - Skip comprehensive animation visual testing
  - [x] 3.2 Implement setIdleIcon() function
    - Set icon to "audio-input-microphone-symbolic"
    - Ensure opacity is 255 (100%)
    - Clear any error overlays
    - Called from setState() when entering IDLE state
  - [x] 3.3 Implement startRecordingAnimation() function
    - Use Clutter.Actor.ease() for opacity animation
    - Fade out: 1000ms to opacity 77 (30% of 255)
    - Use Clutter.AnimationMode.EASE_IN_OUT_QUAD
    - On complete: fade in back to opacity 255
    - Loop continuously while in RECORDING state
    - Store animation reference: this.recordingAnimation
  - [x] 3.4 Implement animation cleanup in setState()
    - Check if this.recordingAnimation exists
    - Call this.recordingAnimation.stop() before state change
    - Set this.recordingAnimation = null
    - Ensure cleanup happens for all state transitions
  - [x] 3.5 Implement startRecording() function
    - Validate configuration first
    - If invalid: open settings dialog, show notification, return
    - If valid: transition to RECORDING state
    - Spawn Python script with environment variables
    - Store process reference: this.recordingProcess
    - Set up process watch via GLib.child_watch_add
  - [x] 3.6 Implement stopRecording() function
    - Kill ffmpeg process if still running
    - Transition to PROCESSING state
    - Keep Python script running for transcription
  - [x] 3.7 Ensure IDLE/RECORDING state tests pass
    - Run ONLY the 2-8 tests written in 3.1
    - Verify icon states and animation behavior
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 3.1 pass
- IDLE state shows normal microphone icon
- RECORDING state shows smooth fade animation (2-second cycle)
- Animation fades between 100% and 30% opacity smoothly
- Animation cleans up properly when leaving RECORDING state
- Recording starts and stops correctly

---

### Task Group 4: PROCESSING & ERROR States (Animations + Dialogs)

**Dependencies:** Task Group 3
**Complexity:** High
**Risk:** High (complex dot animation, modal dialog integration)

- [x] 4.0 Complete PROCESSING and ERROR state implementation
  - [x] 4.1 Write 2-8 focused tests for PROCESSING/ERROR states
    - Test PROCESSING state displays rotating dot animation
    - Test dot animation timing (2-second rotation)
    - Test ERROR state displays warning triangle overlay
    - Test error dialog opens on error icon click
    - Test error dialog close returns to IDLE state
    - Skip detailed animation rendering tests
  - [x] 4.2 Create 8-dot circular loading indicator component
    - Position 8 dots in circle around microphone icon
    - Reduce microphone size if needed to fit dots
    - One bright dot, seven dimmer dots
    - Store dot references in this.loadingDots array
  - [x] 4.3 Implement startProcessingAnimation() function
    - Rotate bright dot counterclockwise through 8 positions
    - Use Clutter.Actor.ease() for rotation/position changes
    - Complete full rotation in 2000ms (250ms per position)
    - Loop continuously while in PROCESSING state
    - Store animation reference: this.processingAnimation
  - [x] 4.4 Implement showErrorIcon() function
    - Keep normal microphone icon
    - Add red warning triangle overlay with exclamation mark
    - Use standard system applet warning pattern
    - Store error message in this.errorMessage
    - No animation (static display)
  - [x] 4.5 Implement showErrorDialog() function
    - Import imports.ui.modalDialog.ModalDialog
    - Create modal dialog with this.errorMessage content
    - Show full error details (API error, stack trace if available)
    - Connect 'closed' event to transition back to IDLE state
    - Use Lang.bind(this, callback) for event handler
  - [x] 4.6 Implement cancelTranscription() function
    - Kill Python process via GLib.spawn_close_pid
    - Clear this.transcriptionProcess reference
    - Transition to IDLE state silently (no notification)
  - [x] 4.7 Update animation cleanup in setState()
    - Stop and clean up this.processingAnimation
    - Hide/remove loading dots when leaving PROCESSING state
    - Remove error overlay when leaving ERROR state
  - [x] 4.8 Ensure PROCESSING/ERROR state tests pass
    - Run ONLY the 2-8 tests written in 4.1
    - Verify animations and error handling work
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 4.1 pass
- PROCESSING state shows 8-dot rotating animation
- Bright dot moves counterclockwise, completing rotation in 2 seconds
- ERROR state shows warning triangle overlay on microphone icon
- Error dialog displays full error details
- Dialog close returns to IDLE state
- Cancellation works silently

---

### Task Group 5: Python Script Modifications (Recording Control & Text Insertion)

**Dependencies:** Task Groups 1-4
**Complexity:** Medium
**Risk:** Medium (process communication, window tracking)

- [x] 5.0 Complete Python script modifications
  - [x] 5.1 Write 2-8 focused tests for Python script changes
    - Test instant text insertion (no character delays)
    - Test active window tracking (window ID comparison)
    - Test maximum duration handling
    - Test clipboard copy on window change
    - Test exit codes for different scenarios
    - Skip exhaustive edge case testing
  - [x] 5.2 Remove character-by-character typing delays
    - Replace type_text() loop with single xdotool command
    - Use: subprocess.run(['xdotool', 'type', '--', text], timeout=10)
    - Remove time.sleep(0.2) between characters
    - Remove initial delay before typing
  - [x] 5.3 Implement active window tracking
    - At recording start: capture window ID via xdotool getactivewindow
    - Store initial_window_id
    - After transcription: capture current window ID
    - Compare window IDs to detect change
  - [x] 5.4 Implement window change handling
    - If window IDs don't match: copy text to clipboard
    - Use xclip or similar: subprocess.run(['xclip', '-selection', 'clipboard'], input=text.encode())
    - Print notification message to stdout for applet
    - Do NOT call type_text() if window changed
  - [x] 5.5 Repurpose recording-duration as maximum duration
    - Use RECORDING_DURATION env var as max limit, not fixed duration
    - Implement user-controlled recording (wait for SIGTERM to stop)
    - When max duration reached: stop recording, exit with code 5
    - Applet handles timeout by starting transcription automatically
  - [x] 5.6 Implement exit code system
    - Exit 0: success (text typed)
    - Exit 1: configuration error (missing API key)
    - Exit 2: recording error (ffmpeg failure)
    - Exit 3: transcription error (API failure)
    - Exit 4: cancelled by user
    - Exit 5: timeout/max duration reached
  - [x] 5.7 Update applet process monitoring
    - Monitor exit codes in GLib.child_watch_add callback
    - Handle each exit code appropriately
    - Exit 5: show "Maximum recording time reached" notification
    - Exit 3: transition to ERROR state with error message
    - Exit 0: silently return to IDLE (success)
  - [x] 5.8 Ensure Python script tests pass
    - Run ONLY the 2-8 tests written in 5.1
    - Verify text insertion and window tracking work
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 5.1 pass
- Text types instantly without character delays
- Active window change detection works correctly
- Text copies to clipboard when window changes
- Maximum duration stops recording and returns exit code 5
- Exit codes communicate different scenarios to applet
- Applet handles exit codes appropriately

---

### Task Group 6: Notification Behavior & Integration Testing

**Dependencies:** Task Groups 1-5 (COMPLETED)
**Complexity:** Low-Medium
**Risk:** Low (removing code, testing integration)

- [x] 6.0 Complete notification updates and integration testing
  - [x] 6.1 Review tests from Task Groups 1-5
    - Review database layer tests (Task 1.1): ~2-8 tests
    - Review click handler tests (Task 2.1): ~2-8 tests
    - Review IDLE/RECORDING tests (Task 3.1): ~2-8 tests
    - Review PROCESSING/ERROR tests (Task 4.1): ~2-8 tests
    - Review Python script tests (Task 5.1): ~2-8 tests
    - Total existing tests: approximately 10-40 tests
  - [x] 6.2 Remove notifications for successful operations
    - Remove "Recording started" notification in startRecording()
    - Remove "Recording stopped" notification in stopRecording()
    - Remove "Recognized: [text]" notification on success
    - Keep notifications ONLY for errors and limits
  - [x] 6.3 Add/update error and limit notifications
    - Configuration error: "Settings are not configured" (with auto-open)
    - Maximum duration: "Maximum recording time reached"
    - API error: "Transcription failed: [error details]"
    - Window changed: Show recognized text in notification
  - [x] 6.4 Analyze integration test coverage gaps
    - Identify critical end-to-end workflows lacking coverage
    - Focus on full user interaction flows (IDLE → RECORDING → PROCESSING → IDLE)
    - Prioritize error scenarios (API failures, window changes, cancellations)
    - Focus ONLY on gaps related to click-to-toggle feature
  - [x] 6.5 Write up to 10 additional strategic tests maximum
    - Add integration tests for complete recording workflows
    - Test error recovery scenarios (API failure → error dialog → IDLE)
    - Test cancellation flow (RECORDING → click → PROCESSING → click → IDLE)
    - Test window change detection end-to-end
    - Test maximum duration auto-stop and notification
    - Do NOT write comprehensive coverage for all scenarios
    - Skip performance tests, accessibility tests unless business-critical
  - [x] 6.6 Run feature-specific tests only
    - Run ONLY tests related to click-to-toggle feature
    - Expected total: approximately 20-50 tests maximum
    - Verify all critical user workflows pass
    - Do NOT run the entire application test suite
  - [x] 6.7 Manual testing checklist
    - Test full happy path: click → record → click → transcribe → text appears
    - Test configuration error: click without API key → settings open
    - Test maximum duration: record past limit → auto-stop → notification
    - Test window change: record → switch window → clipboard copy
    - Test cancellation: click during processing → silent return to IDLE
    - Test API error: trigger error → error icon → dialog → IDLE
    - Test right-click menu: verify only "Settings" appears
    - Test animations: verify smooth fade during recording, rotating dots during processing

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 20-50 tests total)
- No more than 10 additional tests added when filling in testing gaps
- Informational notifications removed (start, stop, success)
- Error notifications present and actionable
- Manual testing checklist completed successfully
- All critical user workflows function correctly

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1**: State Machine Foundation & Configuration
   - Establishes the core state machine architecture
   - Updates settings schema for new maximum duration behavior
   - Provides foundation for all subsequent tasks

2. **Task Group 2**: Click Handlers & Menu Restructure
   - Builds on state machine to implement user interaction
   - Simplifies menu structure
   - Enables basic click-to-toggle behavior

3. **Task Group 3**: IDLE & RECORDING States
   - Implements first two visual states
   - Adds recording animation and process management
   - Validates state machine with real recording workflow

4. **Task Group 4**: PROCESSING & ERROR States
   - Completes all four visual states
   - Adds complex dot animation
   - Implements error handling UI

5. **Task Group 5**: Python Script Modifications
   - Updates backend to support new interaction model
   - Implements instant text insertion
   - Adds window tracking and clipboard functionality

6. **Task Group 6**: Notification Behavior & Integration Testing
   - Removes old notifications, adds new ones
   - Validates complete feature with integration tests
   - Ensures all workflows function end-to-end

---

## Technical Notes

### GJS/Cinnamon Constraints
- **No ES6 syntax**: Use `function() {}` not `() => {}`
- **No async/await**: Use callbacks with `Lang.bind(this, callback)`
- **Animation cleanup**: Always stop animations before state transitions
- **Process management**: Use GLib.spawn_* for Python script interaction

### Animation Specifications
- **RECORDING fade**: 2-second cycle, 100% → 30% → 100%, EASE_IN_OUT_QUAD
- **PROCESSING rotation**: 8 dots, 2-second full rotation, counterclockwise
- **Animation storage**: Store references (`this.recordingAnimation`) for cleanup

### State Machine
```
States: IDLE, RECORDING, PROCESSING, ERROR

Transitions:
IDLE + left-click (valid config) → RECORDING
IDLE + left-click (invalid config) → ERROR state + auto-open settings
RECORDING + left-click → PROCESSING
RECORDING + max duration → PROCESSING + notification
PROCESSING + left-click → IDLE (silent cancellation)
PROCESSING + completion → IDLE (success)
PROCESSING + API error → ERROR
ERROR + left-click → show dialog → IDLE (on dialog close)
```

### Exit Codes
- **0**: Success (text typed)
- **1**: Configuration error
- **2**: Recording error
- **3**: Transcription error
- **4**: Cancelled by user
- **5**: Timeout/max duration reached

### Files to Modify
- `applet/voice-keyboard@perlover/applet.js` - State machine, click handlers, animations
- `applet/voice-keyboard@perlover/settings-schema.json` - Maximum duration settings
- `scripts/whisper-voice-input` - Text insertion, window tracking, exit codes

---

## Risk Mitigation

### High-Risk Areas
1. **8-dot rotation animation** (Task 4.2-4.3): Complex Clutter animation
   - Mitigation: Start with simple rotation, iterate on smoothness
   - Fallback: Use simpler spinner animation if rotation is too complex

2. **Process management** (Task 3.5-3.6, 5.5-5.7): Recording control timing
   - Mitigation: Test with various recording durations
   - Fallback: Use simpler timer-based approach if SIGTERM proves unreliable

3. **Window tracking** (Task 5.3-5.4): xdotool reliability
   - Mitigation: Add error handling for missing xdotool
   - Fallback: Always show notification as fallback if tracking fails

### Testing Strategy
- Each task group writes 2-8 focused tests maximum during development
- Task Group 6 adds up to 10 integration tests to fill critical gaps
- Total test count: approximately 20-50 tests for entire feature
- Focus on user workflows, not exhaustive coverage
- Manual testing checklist for final validation

---

## Future Compatibility

This implementation is designed to support planned features:

- **v1.1 Hotkey activation**: State machine supports both click and hotkey triggers
- **v1.1 Audio level indicator**: RECORDING state can overlay audio level on animation
- **v1.2 Streaming transcription**: PROCESSING state can show partial results
- **v1.3 Voice activity detection**: Can auto-trigger state transitions

---

**Last Updated**: 2025-11-20
**Feature Version**: 1.1.0
**Estimated Implementation Time**: 2-3 days (full-time development)
