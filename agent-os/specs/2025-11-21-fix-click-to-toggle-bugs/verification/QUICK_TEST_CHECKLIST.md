# Quick Test Checklist

## Deploy Applet (Run Once)

```bash
cd /home/perlover/src/voice-keyboard@perlover
./agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/deploy-and-test.sh
```

Then restart Cinnamon: **Alt+F2** → type `r` → **Enter**

---

## Test 2.2: Left-Click Functionality

1. **Open text editor** (gedit or similar)
2. **First left-click** on applet icon
   - [ ] Fade animation starts (30%-100% opacity, 2-second cycle)
3. **Second left-click** (while fading)
   - [ ] Fade stops, dot animation starts (8 rotating dots)
4. **Wait for completion**
   - [ ] Text appears at cursor
   - [ ] Icon returns to normal

---

## Test 2.3: Right-Click (Regression Check)

1. **Right-click** on applet icon
   - [ ] Menu opens with "Settings" item
   - [ ] NO recording starts (no fade animation)
2. **Click "Settings"**
   - [ ] Settings dialog opens

---

## Test 2.4: Configuration Validation

1. **Right-click** → **Settings** → Clear API key → Close
2. **Left-click** on applet icon
   - [ ] Settings dialog opens automatically
   - [ ] Notification: "Settings are not configured"
3. **Restore API key** → Close → **Left-click** again
   - [ ] Recording starts normally (fade animation)

---

## Check Logs (If Issues)

```bash
tail -n 50 ~/.xsession-errors | grep -i "voice-keyboard"
```

---

## Success = All Checkboxes Checked

If ALL tests pass → Mark Task Group 2 complete in `tasks.md`
