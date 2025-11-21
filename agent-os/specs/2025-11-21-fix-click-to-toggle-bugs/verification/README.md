# Verification Directory - Task Group 2

## Quick Start

**To deploy and test the bugfixes, run:**

```bash
cd /home/perlover/src/voice-keyboard@perlover
./agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/verification/deploy-and-test.sh
```

**Then restart Cinnamon:**
- Press **Alt+F2** → type `r` → press **Enter**

**Then follow the testing instructions in:**
- `TESTING_GUIDE.md` (detailed) or
- `QUICK_TEST_CHECKLIST.md` (quick reference)

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `README.md` | This file - directory overview |
| `TESTING_SUMMARY.md` | Overview of Task Group 2 implementation |
| `TESTING_GUIDE.md` | Comprehensive testing instructions |
| `QUICK_TEST_CHECKLIST.md` | One-page quick reference |
| `SCREENSHOT_GUIDE.md` | Instructions for taking screenshots (optional) |
| `deploy-and-test.sh` | Deployment script (run this first) |
| `screenshots/` | Directory for verification screenshots (optional) |

---

## Testing Workflow

1. **Deploy** → Run `deploy-and-test.sh`
2. **Restart** → Alt+F2 → `r` → Enter
3. **Test** → Follow `QUICK_TEST_CHECKLIST.md`
4. **Document** → (Optional) Take screenshots
5. **Update** → Mark tasks complete in `tasks.md`

---

## What Was Fixed

### Fix 1: Event Handler Connection
- **Location:** Line 81 in applet.js
- **Change:** Added `this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));`
- **Effect:** Enables click event handling

### Fix 2: Event Propagation Logic
- **Location:** Lines 647-650 in applet.js
- **Change:** Use Clutter constants instead of boolean values
  - Right-click: `return Clutter.EVENT_STOP;`
  - Left-click: `return Clutter.EVENT_PROPAGATE;`
- **Effect:** Ensures left-click reaches `on_applet_clicked` handler

---

## Expected Results

After deployment and Cinnamon restart:

- **Left-click** → Fade animation (RECORDING state)
- **Second left-click** → Dot animation (PROCESSING state)
- **After processing** → Text inserted at cursor
- **Right-click** → Menu opens (no recording starts)

---

## Troubleshooting

### Deployment fails
```bash
# Re-run with explicit path
sudo cp /home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js /usr/share/cinnamon/applets/voice-keyboard@perlover/
```

### Left-click does nothing
```bash
# Verify deployment
grep -n "EVENT_PROPAGATE" /usr/share/cinnamon/applets/voice-keyboard@perlover/applet.js
# Should show line 650

# Restart Cinnamon again
# Alt+F2 → r → Enter
```

### Check logs for errors
```bash
tail -f ~/.xsession-errors | grep -i "voice-keyboard"
```

---

## Task Group 2 Status

**Preparation:** COMPLETE
- Deployment script created
- Testing guides created
- Verification structure ready

**Execution:** PENDING USER ACTION
- User needs to run deployment script
- User needs to restart Cinnamon
- User needs to perform manual tests
- User needs to update tasks.md

---

## Next Steps

1. Run `deploy-and-test.sh`
2. Restart Cinnamon
3. Follow `QUICK_TEST_CHECKLIST.md`
4. Update `tasks.md` when all tests pass
