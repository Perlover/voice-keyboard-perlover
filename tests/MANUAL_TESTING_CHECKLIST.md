# Manual Testing Checklist for Click-to-Toggle Feature

## Task Group 6.7: Manual Testing Checklist

This checklist covers all critical user workflows for the click-to-toggle voice recording feature.

---

## Test Environment Setup

- [ ] Cinnamon Desktop Environment (version 5.8 or higher)
- [ ] Voice Keyboard Perlover applet installed and added to panel
- [ ] OpenAI API key configured OR local Whisper server running
- [ ] Audio input device working (test with system sound settings)
- [ ] xdotool installed (verify with: `which xdotool`)
- [ ] xclip installed (verify with: `which xclip`)
- [ ] ffmpeg installed (verify with: `which ffmpeg`)

---

## Test 1: Happy Path - Successful Recording and Transcription

**Objective:** Test the complete workflow from idle to recording to transcription to text insertion.

### Steps:
1. [ ] Open a text editor (gedit, kate, or any text input field)
2. [ ] Place cursor in text field
3. [ ] Left-click the microphone icon in panel
4. [ ] **Verify:** Icon begins smooth fade animation (fades to ~30% opacity and back over 2 seconds, continuous loop)
5. [ ] **Verify:** No notification is shown for "Recording started"
6. [ ] Speak clearly: "Hello world this is a test"
7. [ ] Left-click the microphone icon again to stop recording
8. [ ] **Verify:** Icon shows 8-dot rotating animation (one bright dot moves counterclockwise, 2-second full rotation)
9. [ ] **Verify:** No notification is shown for "Recording stopped"
10. [ ] Wait for transcription to complete (5-15 seconds depending on API)
11. [ ] **Verify:** Text appears instantly in text field (not character-by-character)
12. [ ] **Verify:** Text is accurate: "Hello world this is a test" (or close variation)
13. [ ] **Verify:** No notification is shown for successful transcription
14. [ ] **Verify:** Icon returns to normal microphone icon with no animation
15. [ ] **Verify:** State is IDLE (can click to start new recording)

**Expected Result:** Text inserted successfully without any notifications. Smooth animations during recording and processing.

---

## Test 2: Configuration Error - Missing API Key

**Objective:** Test behavior when clicking without API configuration.

### Steps:
1. [ ] Open applet settings (right-click microphone → Settings)
2. [ ] Set Whisper Mode to "OpenAI Whisper API"
3. [ ] Clear the API Key field (leave it empty)
4. [ ] Close settings dialog
5. [ ] Left-click the microphone icon
6. [ ] **Verify:** Icon remains in IDLE state (no animation starts)
7. [ ] **Verify:** Notification appears: "Settings are not configured"
8. [ ] **Verify:** Settings dialog opens automatically
9. [ ] Enter valid API key
10. [ ] Close settings dialog
11. [ ] Left-click the microphone icon again
12. [ ] **Verify:** Recording now starts successfully

**Expected Result:** Configuration error is caught before recording starts, user is prompted to configure settings.

---

## Test 3: Maximum Duration - Auto-stop at Limit

**Objective:** Test that recording automatically stops at maximum duration.

### Steps:
1. [ ] Open applet settings
2. [ ] Set "Maximum Recording Duration" to 10 seconds
3. [ ] Close settings
4. [ ] Open a text editor
5. [ ] Left-click microphone icon to start recording
6. [ ] **Verify:** Icon shows fade animation
7. [ ] Speak continuously for more than 10 seconds
8. [ ] Wait for 10 seconds to pass
9. [ ] **Verify:** Recording automatically stops (without user clicking)
10. [ ] **Verify:** Notification appears: "Maximum recording time reached"
11. [ ] **Verify:** Icon transitions to processing state (8-dot animation)
12. [ ] Wait for transcription to complete
13. [ ] **Verify:** Text is inserted for the full 10 seconds of recording
14. [ ] **Verify:** Icon returns to IDLE state

**Expected Result:** Recording auto-stops at maximum duration, notification shown, transcription proceeds automatically.

---

## Test 4: Window Change Detection - Clipboard Copy

**Objective:** Test that text is copied to clipboard when active window changes.

### Steps:
1. [ ] Open a text editor (Application A)
2. [ ] Left-click microphone icon to start recording
3. [ ] Speak: "This is a clipboard test"
4. [ ] While recording or during transcription, switch to another application (Application B) - use Alt+Tab or click another window
5. [ ] Wait for transcription to complete
6. [ ] **Verify:** Notification appears showing: "Window changed - text copied to clipboard: This is a clipboard test"
7. [ ] **Verify:** Text is NOT typed into Application B
8. [ ] Go back to Application A or any text field
9. [ ] Press Ctrl+V to paste
10. [ ] **Verify:** Clipboard contains "This is a clipboard test"
11. [ ] **Verify:** Icon returns to IDLE state

**Expected Result:** Window change detected, text copied to clipboard with notification, text NOT auto-typed.

---

## Test 5: User Cancellation During Processing

**Objective:** Test that clicking during processing cancels transcription silently.

### Steps:
1. [ ] Open a text editor
2. [ ] Left-click microphone to start recording
3. [ ] Speak: "Testing cancellation feature"
4. [ ] Left-click microphone to stop recording
5. [ ] **Verify:** Icon shows processing animation (8 rotating dots)
6. [ ] Immediately left-click microphone again (before transcription completes)
7. [ ] **Verify:** Processing animation stops immediately
8. [ ] **Verify:** Icon returns to IDLE state
9. [ ] **Verify:** NO notification is shown for cancellation
10. [ ] **Verify:** No text is inserted
11. [ ] **Verify:** Can start new recording immediately

**Expected Result:** Transcription cancelled silently, no notification, immediate return to IDLE.

---

## Test 6: API Error Handling

**Objective:** Test error state and error dialog on transcription failure.

### Steps:

**Option A: Trigger network error (easiest)**
1. [ ] Temporarily disconnect from internet
2. [ ] Left-click microphone to start recording
3. [ ] Speak something
4. [ ] Left-click to stop recording
5. [ ] Wait for API call to fail (timeout after ~30 seconds)
6. [ ] **Verify:** Notification appears: "Transcription failed"
7. [ ] **Verify:** Icon shows red warning triangle overlay on microphone icon
8. [ ] **Verify:** Icon is in ERROR state (no animation, static display)
9. [ ] Left-click the error icon
10. [ ] **Verify:** Modal dialog appears with error details
11. [ ] Read error message (should mention network/connection error)
12. [ ] Click "Close" button in dialog
13. [ ] **Verify:** Dialog closes
14. [ ] **Verify:** Icon returns to IDLE state
15. [ ] **Verify:** Warning triangle overlay is removed
16. [ ] Reconnect to internet
17. [ ] Test recording again to verify normal operation

**Option B: Use invalid API key**
1. [ ] Open settings and enter invalid API key (e.g., "invalid-key-123")
2. [ ] Start and stop recording
3. [ ] Wait for API error
4. [ ] Follow steps 6-17 above

**Expected Result:** Error state displayed with warning overlay, error notification shown, dialog shows details, clean return to IDLE.

---

## Test 7: Right-Click Menu - Settings Only

**Objective:** Verify right-click menu shows only Settings option.

### Steps:
1. [ ] Right-click the microphone icon
2. [ ] **Verify:** Context menu appears
3. [ ] **Verify:** Menu contains only "Settings" option (with gear icon)
4. [ ] **Verify:** Menu does NOT contain "Start Voice Input" option
5. [ ] **Verify:** No separator lines in menu
6. [ ] Click "Settings"
7. [ ] **Verify:** Settings dialog opens
8. [ ] Close settings dialog

**Expected Result:** Streamlined menu with only Settings option.

---

## Test 8: Settings Access During All States

**Objective:** Verify settings can be opened during recording and processing.

### Steps:
1. [ ] Left-click to start recording (IDLE → RECORDING)
2. [ ] **Verify:** Icon shows fade animation
3. [ ] Right-click microphone icon while recording
4. [ ] **Verify:** Context menu appears
5. [ ] Click "Settings"
6. [ ] **Verify:** Settings dialog opens
7. [ ] **Verify:** Recording continues (fade animation still active)
8. [ ] Leave settings dialog open
9. [ ] Left-click microphone to stop recording (RECORDING → PROCESSING)
10. [ ] **Verify:** Icon shows processing animation (8 dots)
11. [ ] **Verify:** Settings dialog remains open
12. [ ] Close settings dialog
13. [ ] Wait for transcription to complete or click to cancel
14. [ ] **Verify:** Normal workflow continues

**Expected Result:** Settings can be accessed during any state without blocking recording/processing.

---

## Test 9: Animation Smoothness and Timing

**Objective:** Verify animation quality and timing specifications.

### Steps:

**Recording Animation:**
1. [ ] Start recording
2. [ ] Observe fade animation closely
3. [ ] **Verify:** Animation is smooth (no jumps or stutters)
4. [ ] **Verify:** Fade cycle takes approximately 2 seconds (1s fade out + 1s fade in)
5. [ ] **Verify:** Icon fades to about 30% opacity at lowest point (visible but dimmed)
6. [ ] **Verify:** Animation loops continuously while recording
7. [ ] Stop recording
8. [ ] **Verify:** Fade animation stops cleanly
9. [ ] **Verify:** Icon opacity resets to 100%

**Processing Animation:**
1. [ ] Stop recording to enter processing state
2. [ ] Observe dot rotation animation
3. [ ] **Verify:** Animation is smooth (no jumps or stutters)
4. [ ] **Verify:** Exactly 8 dots arranged in circle around microphone
5. [ ] **Verify:** One dot is bright (fully opaque), seven dots are dim (~30% opacity)
6. [ ] **Verify:** Bright dot moves counterclockwise (not clockwise)
7. [ ] **Verify:** Full rotation takes approximately 2 seconds
8. [ ] **Verify:** Dot movement is smooth, not jerky
9. [ ] Wait for completion or cancel
10. [ ] **Verify:** Dots disappear cleanly, no remnants left

**Expected Result:** Animations meet timing and visual quality specifications.

---

## Test 10: Multiple Rapid State Transitions

**Objective:** Test system stability with rapid clicking.

### Steps:
1. [ ] Left-click microphone (IDLE → RECORDING)
2. [ ] Immediately left-click again (RECORDING → PROCESSING)
3. [ ] Immediately left-click again (PROCESSING → IDLE via cancellation)
4. [ ] **Verify:** All transitions work correctly
5. [ ] **Verify:** No animation artifacts or stuck states
6. [ ] **Verify:** Icon returns to IDLE cleanly
7. [ ] Repeat sequence 2-3 more times
8. [ ] **Verify:** System remains stable
9. [ ] **Verify:** No error notifications appear
10. [ ] Perform final normal recording to verify functionality

**Expected Result:** System handles rapid state transitions without errors or visual glitches.

---

## Test 11: Local Whisper Server Mode

**Objective:** Test local mode configuration and operation (if available).

### Prerequisites:
- [ ] Local Whisper server running (e.g., faster-whisper-server)
- [ ] Server URL known (e.g., http://localhost:9000/asr)

### Steps:
1. [ ] Open settings
2. [ ] Set Whisper Mode to "Local Whisper Server"
3. [ ] **Verify:** OpenAI API Key field is hidden
4. [ ] **Verify:** Local Server URL field is visible
5. [ ] Enter server URL
6. [ ] Close settings
7. [ ] Perform complete recording workflow (Test 1)
8. [ ] **Verify:** Recording works with local server
9. [ ] **Verify:** Text is transcribed and inserted correctly
10. [ ] If server is stopped, start recording and verify error handling

**Expected Result:** Local mode works identically to OpenAI mode, configuration fields change based on mode.

---

## Test 12: Very Short Recording (Edge Case)

**Objective:** Test behavior with very short recordings (under 2 seconds).

### Steps:
1. [ ] Open text editor
2. [ ] Left-click microphone to start recording
3. [ ] Immediately say one word: "Test"
4. [ ] Immediately left-click to stop (total recording time < 2 seconds)
5. [ ] Wait for transcription
6. [ ] **Verify:** Transcription completes without error
7. [ ] **Verify:** Text is inserted (may be "Test" or may be empty if too short)
8. [ ] **Verify:** System returns to IDLE state properly
9. [ ] **Verify:** Next recording works normally

**Expected Result:** Very short recordings handled gracefully, even if transcription is empty or inaccurate.

---

## Test 13: Long Recording (Multiple Sentences)

**Objective:** Test longer recordings with multiple sentences.

### Steps:
1. [ ] Open settings and set maximum duration to 60 seconds
2. [ ] Open text editor
3. [ ] Start recording
4. [ ] Speak multiple sentences (20-30 seconds):
   "This is a longer test recording. It contains multiple sentences. We want to verify that the system handles longer audio properly. The transcription should be accurate and complete."
5. [ ] Stop recording
6. [ ] Wait for transcription (may take longer for longer audio)
7. [ ] **Verify:** All or most text is transcribed accurately
8. [ ] **Verify:** Text appears instantly (not character-by-character)
9. [ ] **Verify:** Punctuation is included (if API supports it)
10. [ ] **Verify:** No timeout errors

**Expected Result:** Long recordings transcribed successfully with good accuracy.

---

## Test 14: Language Settings (if multilingual support configured)

**Objective:** Test language detection and transcription in different languages.

### Steps:
1. [ ] Open settings
2. [ ] Note current language setting
3. [ ] If set to "Auto", try recording in different language
4. [ ] If set to specific language (e.g., "ru"), try recording in that language
5. [ ] **Verify:** Transcription is in correct language
6. [ ] Change language setting to different language
7. [ ] Record in that new language
8. [ ] **Verify:** Transcription uses new language setting

**Expected Result:** Language setting is respected by transcription API.

---

## Test 15: Icon Tooltip

**Objective:** Verify tooltip describes new click behavior.

### Steps:
1. [ ] Hover mouse over microphone icon
2. [ ] Wait for tooltip to appear
3. [ ] **Verify:** Tooltip says: "Voice Keyboard - Left-click to start/stop recording, Right-click for settings"
4. [ ] **Verify:** Tooltip does NOT mention menu or "Start Voice Input"

**Expected Result:** Tooltip accurately describes click-to-toggle behavior.

---

## Notification Verification Summary

**Notifications that SHOULD be shown:**
- [ ] "Settings are not configured" (configuration error)
- [ ] "Maximum recording time reached" (timeout)
- [ ] "Transcription failed" (API error)
- [ ] "Window changed - text copied to clipboard: [text]" (window change)
- [ ] "Recording failed" (recording error)

**Notifications that should NOT be shown:**
- [ ] "Recording started" (REMOVED)
- [ ] "Recording stopped" (REMOVED)
- [ ] "Recognized: [text]" on success (REMOVED)
- [ ] Any notification on cancellation (REMOVED)

---

## Final Verification

After completing all tests:

- [ ] All critical workflows function correctly
- [ ] Animations are smooth and meet timing specifications
- [ ] Error handling is robust and informative
- [ ] Notifications follow new behavior (errors only, no success notifications)
- [ ] State transitions are clean with no visual artifacts
- [ ] Settings are accessible during all states
- [ ] Text insertion is instant (no character delays)
- [ ] Window change detection works correctly
- [ ] Maximum duration safety limit works
- [ ] Icon returns to IDLE properly after all operations

---

## Known Issues or Limitations

Document any issues found during testing:

1. _____________________________________
2. _____________________________________
3. _____________________________________

---

## Test Results

**Date:** _____________________
**Tester:** _____________________
**Cinnamon Version:** _____________________
**Applet Version:** _____________________

**Overall Result:** [ ] PASS  [ ] FAIL  [ ] PASS WITH MINOR ISSUES

**Notes:**
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
