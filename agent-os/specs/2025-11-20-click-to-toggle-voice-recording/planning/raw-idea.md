# Feature: Click-to-Toggle Voice Recording

## Raw Idea (User's Original Description)

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

## Translation Notes

This feature changes the core UX pattern from:
- Menu-based interaction -> Direct toggle interaction
- Fixed duration recording -> User-controlled duration
- Notification-based feedback -> Visual icon feedback (blinking/pulsing)
- Left/right click separation -> Clear action separation (record vs configure)
