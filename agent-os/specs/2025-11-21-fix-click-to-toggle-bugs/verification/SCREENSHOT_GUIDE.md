# Screenshot Guide for Verification

## Purpose

Take screenshots during testing to document that the animations and UI behaviors work correctly. This provides visual evidence that the bugfixes are successful.

## Screenshots to Capture

### 1. IDLE State (Before Any Clicks)
**Filename:** `01-idle-state.png`
**What to capture:** Applet icon in normal state (no animation)
**Command to take screenshot:**
```bash
gnome-screenshot -a -f /home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/01-idle-state.png
```
Then select the applet icon area.

---

### 2. RECORDING State (Fade Animation)
**Filename:** `02-recording-fade-animation.png`
**What to capture:** Applet icon during fade animation (after first left-click)
**When:** Immediately after first left-click, while icon is fading
**Expected:** Icon should appear semi-transparent (fading between 30%-100% opacity)

**Command:**
```bash
gnome-screenshot -a -f /home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/02-recording-fade-animation.png
```

---

### 3. PROCESSING State (Dot Animation)
**Filename:** `03-processing-dot-animation.png`
**What to capture:** Applet icon during dot animation (after second left-click)
**When:** Immediately after second left-click, while processing
**Expected:** Icon should show rotating dots around it

**Command:**
```bash
gnome-screenshot -a -f /home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/03-processing-dot-animation.png
```

---

### 4. Text Insertion Result
**Filename:** `04-text-insertion-result.png`
**What to capture:** Text editor showing inserted text after processing completes
**When:** After processing completes and text is inserted
**Expected:** Transcribed text visible in text editor

**Command:**
```bash
gnome-screenshot -a -f /home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/04-text-insertion-result.png
```

---

### 5. Right-Click Menu
**Filename:** `05-right-click-menu.png`
**What to capture:** Menu that appears on right-click
**When:** Right-click on applet icon
**Expected:** Menu with "Settings" item

**Command:**
```bash
gnome-screenshot -a -f /home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/05-right-click-menu.png
```

---

### 6. Settings Dialog
**Filename:** `06-settings-dialog.png`
**What to capture:** Settings dialog (opened from right-click menu)
**When:** After clicking "Settings" from menu
**Expected:** Full settings dialog with all configuration options

**Command:**
```bash
gnome-screenshot -a -f /home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/06-settings-dialog.png
```

---

### 7. Configuration Validation
**Filename:** `07-config-validation-notification.png`
**What to capture:** Notification showing "Settings are not configured"
**When:** After removing API key and left-clicking applet icon
**Expected:** Notification message visible on screen

**Command:**
```bash
gnome-screenshot -a -f /home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/07-config-validation-notification.png
```

---

## Quick Screenshot Commands

If you prefer to use a GUI screenshot tool:
1. Press **PrtScn** (Print Screen) key
2. Select area to capture
3. Save to: `/home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/`

## Alternative: Screen Recording

If animations are difficult to capture in screenshots, consider recording a short video:

```bash
# Install simplescreenrecorder if not already installed
sudo apt install simplescreenrecorder

# Then record your testing session
simplescreenrecorder
```

Save video as: `voice-keyboard-testing-session.mp4` in the screenshots directory.

---

## Notes

- Screenshots are OPTIONAL but recommended for documentation
- Focus on capturing the key visual states (fade animation, dot animation, menu)
- If animations are too fast to screenshot, video recording is acceptable
- Screenshots help verify the visual aspects of the bugfixes

---

## Screenshots Directory

All screenshots should be saved to:
```
/home/perlover/src/voice-keyboard@perlover/agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/screenshots/
```

This directory will be created automatically if it doesn't exist.
