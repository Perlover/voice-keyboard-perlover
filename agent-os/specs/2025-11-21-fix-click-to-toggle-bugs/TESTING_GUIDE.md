# Testing Guide: Click-to-Toggle Voice Recording Bugfixes

## Overview

This guide will help you manually test the click-to-toggle functionality fixes for the Voice Keyboard applet. Task Group 1 (bugfixes) has been completed, and the fixed code is ready for deployment and testing.

## Fixes Applied in Task Group 1

The following bugfixes have been implemented in `applet.js`:

### Fix 1: Event Handler Connection (Line 81)
```javascript
// Connect button press event handler for right-click menu
this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));
```
This connects the button press event handler that was previously defined but never connected.

### Fix 2: Event Propagation Logic (Lines 647-650)
```javascript
if (event.get_button() === 3) {
    this.menu.toggle();
    return Clutter.EVENT_STOP; // Prevent event propagation
}
// Let other buttons (including left-click) propagate to on_applet_clicked
return Clutter.EVENT_PROPAGATE;
```
This uses explicit Clutter constants for clear event propagation behavior.

## Deployment Instructions

### Step 1: Deploy Fixed Applet to System

Run the following command to copy the fixed applet to the system location:

```bash
sudo cp /home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js /usr/share/cinnamon/applets/voice-keyboard@perlover/
```

### Step 2: Restart Cinnamon

Choose one of the following methods to reload Cinnamon:

**Method A: Quick Restart (Recommended)**
1. Press `Alt+F2`
2. Type `r` (lowercase)
3. Press `Enter`
4. Wait 2-3 seconds for Cinnamon to restart

**Method B: Using Panel Menu**
1. Right-click on any panel
2. Click "Troubleshoot"
3. Click "Restart Cinnamon"

**Method C: Log Out and Back In**
- If the above methods don't work, log out and log back in

### Step 3: Verify Applet is Running

After restart, check that the microphone icon is visible in your panel. If not:
1. Right-click the panel
2. Click "Applets"
3. Search for "Voice Keyboard"
4. Enable it if disabled
5. Drag it to your desired position on the panel

## Manual Testing Procedures

### Test 2.1: Deploy Fixed Applet

- [ ] Deployment completed (Step 1 above)
- [ ] Cinnamon restarted (Step 2 above)
- [ ] Applet visible in panel (Step 3 above)

### Test 2.2: Left-Click Functionality

**Test 2.2.1: Start Recording (First Left-Click)**

1. Open a text editor (gedit, Text Editor, or any application with text input)
2. Place your cursor in a text area
3. Left-click on the Voice Keyboard applet icon (microphone icon)

**Expected Results:**
- [ ] Icon starts fade animation (opacity fades 30%-100% in a 2-second cycle)
- [ ] Animation is smooth and continuous
- [ ] Icon continues to fade in and out while recording
- [ ] No error notifications appear

**If fade animation is NOT visible:**
- Check `~/.xsession-errors` log for errors:
  ```bash
  tail -n 50 ~/.xsession-errors | grep -i "voice-keyboard"
  ```
- Verify applet.js was deployed correctly:
  ```bash
  grep -n "EVENT_PROPAGATE" /usr/share/cinnamon/applets/voice-keyboard@perlover/applet.js
  ```
  Should show line 650 with `return Clutter.EVENT_PROPAGATE;`

**Test 2.2.2: Stop Recording (Second Left-Click)**

1. While the icon is still fading (recording in progress)
2. Left-click on the applet icon again

**Expected Results:**
- [ ] Fade animation stops immediately
- [ ] Processing animation starts (8 dots rotating around the icon)
- [ ] Dots animation is smooth and visible
- [ ] Processing continues until transcription completes

**Test 2.2.3: Text Insertion (After Processing)**

1. Wait for the processing animation to complete (usually 2-10 seconds)
2. Look at your text editor where you placed the cursor

**Expected Results:**
- [ ] Processing animation stops
- [ ] Icon returns to normal (no animation)
- [ ] Recognized text appears at cursor position in your text editor
- [ ] Text matches what you said during recording

**Note:** If no text appears:
- Check if API key is configured correctly
- Check if `whisper-voice-input` script is working:
  ```bash
  /usr/bin/whisper-voice-input
  ```
  It should record for 10 seconds and attempt transcription

### Test 2.3: Right-Click Functionality (Regression Check)

**Purpose:** Verify that right-click menu still works correctly after our fixes

**Test 2.3.1: Menu Opens on Right-Click**

1. Right-click on the Voice Keyboard applet icon

**Expected Results:**
- [ ] Menu opens immediately
- [ ] Menu contains "Settings" item
- [ ] Menu does NOT start recording (no fade animation)

**Test 2.3.2: Settings Dialog Opens**

1. Right-click on the applet icon
2. Click "Settings" in the menu

**Expected Results:**
- [ ] Settings dialog opens
- [ ] Dialog shows all configuration options:
  - Whisper Mode (OpenAI / Local)
  - OpenAI API Key
  - Local Whisper URL
  - Language
  - Recording Duration
- [ ] Settings can be modified and saved

**Test 2.3.3: No Errors in Logs**

1. After testing right-click, check logs:
   ```bash
   tail -n 100 ~/.xsession-errors | grep -i "error"
   ```

**Expected Results:**
- [ ] No errors related to voice-keyboard applet
- [ ] No JavaScript exceptions
- [ ] No event handler errors

### Test 2.4: Configuration Validation (Edge Case)

**Purpose:** Verify that missing API key is detected and handled correctly

**Test 2.4.1: Remove API Key**

1. Right-click applet icon
2. Click "Settings"
3. Select "OpenAI" mode
4. Clear the API Key field (leave it empty)
5. Close settings dialog

**Test 2.4.2: Verify Validation on Left-Click**

1. Left-click on the applet icon

**Expected Results:**
- [ ] Settings dialog opens automatically (instead of starting recording)
- [ ] Notification appears with message "Settings are not configured"
- [ ] No recording starts
- [ ] No fade animation appears

**Test 2.4.3: Restore API Key**

1. Enter your API key back into the settings
2. Close settings dialog
3. Left-click the applet icon again
4. Verify recording starts normally (fade animation appears)

## Testing Checklist Summary

Complete all items in this checklist:

- [ ] 2.1 Deploy fixed applet
  - [ ] Copied applet.js to system location
  - [ ] Restarted Cinnamon
  - [ ] Applet visible in panel

- [ ] 2.2 Test left-click functionality
  - [ ] First left-click starts fade animation (RECORDING state)
  - [ ] Second left-click stops fade, starts dot animation (PROCESSING state)
  - [ ] Text is inserted at cursor after processing completes
  - [ ] Icon returns to normal (IDLE state)

- [ ] 2.3 Test right-click functionality
  - [ ] Right-click opens settings menu
  - [ ] Settings menu item is clickable
  - [ ] Settings dialog opens correctly
  - [ ] No errors in ~/.xsession-errors log

- [ ] 2.4 Test configuration validation
  - [ ] Removed API key from settings
  - [ ] Left-click opened settings dialog automatically
  - [ ] Notification showed "Settings are not configured"
  - [ ] Restored API key and verified normal operation

## Troubleshooting

### Issue: Left-click does nothing (no animation)

**Possible Causes:**
1. Applet.js not deployed correctly
2. Cinnamon not restarted
3. Event handler connection failed

**Solutions:**
```bash
# 1. Verify deployment
sudo cp /home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js /usr/share/cinnamon/applets/voice-keyboard@perlover/

# 2. Check file contents
grep -A2 "button-press-event" /usr/share/cinnamon/applets/voice-keyboard@perlover/applet.js

# 3. Restart Cinnamon again
# Press Alt+F2, type 'r', press Enter

# 4. Check logs for errors
tail -f ~/.xsession-errors | grep -i "voice-keyboard"
```

### Issue: Right-click doesn't open menu

**Solutions:**
```bash
# Check if menu is properly initialized
grep -A5 "PopupMenu.PopupMenuSection" /usr/share/cinnamon/applets/voice-keyboard@perlover/applet.js

# Restart Cinnamon
# Press Alt+F2, type 'r', press Enter
```

### Issue: Animation visible but no text appears

**This is NOT part of this bugfix test** - if clicks work and animations appear, the event handling fixes are successful.

But for completeness:
```bash
# Test the Python script directly
/usr/bin/whisper-voice-input

# Check if API key is set
cinnamon-settings applets voice-keyboard@perlover

# Verify xdotool is installed
which xdotool
```

## Expected Test Duration

- Deployment: 1-2 minutes
- Test 2.2 (Left-click): 3-5 minutes
- Test 2.3 (Right-click): 2-3 minutes
- Test 2.4 (Validation): 2-3 minutes
- Total: ~10-15 minutes

## Success Criteria

Testing is SUCCESSFUL if:
1. Left-click starts visible fade animation (RECORDING)
2. Second left-click shows dot animation (PROCESSING)
3. Right-click opens settings menu (no regression)
4. Configuration validation prevents recording when API key is missing
5. No errors appear in `~/.xsession-errors` during normal operation

## Reporting Results

After completing all tests, document your results:

### Test Results Template

```
## Test Execution Date: [DATE]

### Test 2.1: Deployment
- [ ] Deployed successfully
- Notes: ___________

### Test 2.2: Left-Click
- [ ] Fade animation works
- [ ] Dot animation works
- [ ] Text insertion works
- Notes: ___________

### Test 2.3: Right-Click
- [ ] Menu opens
- [ ] Settings dialog opens
- [ ] No errors in logs
- Notes: ___________

### Test 2.4: Validation
- [ ] Settings dialog opens when API key missing
- [ ] Notification appears
- Notes: ___________

### Overall Result: [PASS / FAIL]
```

## Next Steps After Testing

### If All Tests Pass:
1. Mark Task Group 2 as complete in tasks.md
2. Document any observations in verification notes
3. Take screenshots of animations if possible (optional)
4. Consider this bugfix complete and ready for use

### If Any Test Fails:
1. Document which test failed and error details
2. Check `~/.xsession-errors` for error messages
3. Verify deployment was successful
4. Report issues for further investigation

## Additional Notes

- These tests verify the EVENT HANDLING fixes only
- State machine logic was already correct (not changed)
- Animation implementations were already correct (not changed)
- Python script functionality is out of scope for these tests
- Focus on verifying that clicks trigger the correct visual responses

---

**Testing Guide Created:** 2025-11-21
**For Spec:** Fix Click-to-Toggle Event Handling Bugs
**Task Group:** 2 (Test and Verify Fixes)
