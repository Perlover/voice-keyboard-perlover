# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Voice Keyboard Perlover** is a Cinnamon desktop applet providing voice-to-text input using OpenAI Whisper API or local Whisper servers. Two main components:
- **Cinnamon Applet** (`applet/voice-keyboard@perlover/applet.js`) - GJS/JavaScript UI
- **Python Script** (`scripts/whisper-voice-input`) - Audio recording and transcription

Target: Ubuntu 24.04 (Noble), Linux Mint 22.2, Cinnamon 5.8-6.4

## Build and Development Commands

```bash
# Build .deb package
make deb

# Build and install with dependencies (recommended)
make deb-install

# Clean build artifacts
make deb-clean

# Direct install without packaging (for quick testing)
sudo make install
sudo make uninstall
```

## Testing

```bash
# Run all automated tests
./tests/run-all-tests.sh

# Run Python tests only (works without Cinnamon)
python3 tests/test_python_script_modifications.py

# Run individual GJS tests (requires Cinnamon desktop)
gjs tests/state-machine-tests.js
gjs tests/click-handler-tests.js
gjs tests/idle-recording-tests.js
gjs tests/processing-error-tests.js
gjs tests/integration-tests.js

# Validate files
python3 -m py_compile scripts/whisper-voice-input
python3 -m json.tool applet/voice-keyboard@perlover/settings-schema.json
```

## Debugging

```bash
# Check Cinnamon logs (look for [voice-keyboard@perlover])
tail -f ~/.xsession-errors

# Restart Cinnamon after changes
# Press Ctrl+Alt+Esc
```

## Architecture

### State Machine (applet.js)

The applet uses a 4-state finite state machine:

```
STATE_IDLE → STATE_RECORDING → STATE_PROCESSING → STATE_IDLE
                                      ↓
                                STATE_ERROR
```

Key state transitions:
- Left-click in IDLE: validates config, starts recording via Python script
- Left-click in RECORDING: sends SIGTERM to stop recording, triggers transcription
- Left-click in PROCESSING: cancels transcription
- Left-click in ERROR: shows error dialog with details

### Communication Flow

1. Applet spawns Python script with environment variables (config)
2. Script records via ffmpeg until SIGTERM or max duration
3. Script transcribes via OpenAI API or local server
4. Script pastes text using xclip + xdotool (CLIPBOARD + PRIMARY + Shift+Insert)
5. Script exits with status code, applet handles result

### Python Script Exit Codes

The script communicates results via exit codes:
- `0` - Success (text pasted via clipboard)
- `1` - Configuration error
- `2` - Recording error (ffmpeg)
- `3` - Transcription error (API)
- `4` - Cancelled by user
- `5` - Timeout reached (max duration)

### Settings Schema

Settings defined in `settings-schema.json`, bound in applet via:
```javascript
this.settings.bind("setting-name", "propertyName");
```

Use `"dependency": "whisper-mode=openai"` to conditionally show/hide settings.

## Critical GJS Constraints

**MUST follow these rules in applet.js:**

1. **No ES6 syntax** - Use `function()` not `() =>`
2. **No async/await** - Use callbacks with `Lang.bind(this, function() {...})`
3. **No Node.js modules** - Only Cinnamon/GNOME imports
4. **Preserve `this` context** - Always use `Lang.bind()` for callbacks
5. **Use symbolic icons** - e.g., `audio-input-microphone-symbolic`
6. **Process spawning** - Use `GLib.spawn_async_with_pipes()` with `GLib.child_watch_add()`
7. **No scale animations** - Avoid `this.actor.ease()` with scale transforms; causes Cinnamon HotCorner/Expo layout conflicts
8. **GC-safe animations** - Use `GLib.timeout_add()` instead of `this.actor.ease()` to prevent crashes during garbage collection

Example async process pattern:
```javascript
let [success, pid, stdin_fd, stdout_fd, stderr_fd] = GLib.spawn_async_with_pipes(
    null, [command], envp,
    GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
    null
);
GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(pid, status) {
    GLib.spawn_close_pid(pid);
    // handle completion
}));
```

## Python Script Constraints

- Python 3 only with minimal dependencies (stdlib + requests)
- Uses ffmpeg with `-f pulse` for audio (works with PulseAudio and PipeWire)
- Audio format: M4A/AAC at 16kHz mono for fast API uploads
- Text pasting: xclip to both CLIPBOARD and PRIMARY selections, then xdotool Shift+Insert
- Environment variables for config: `WHISPER_MODE`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `WHISPER_LOCAL_URL`, `WHISPER_LANGUAGE`, `RECORDING_DURATION`

## Version Updates

When releasing a new version, update these files:
1. `debian/changelog` - Add new entry at top
2. `applet/voice-keyboard@perlover/metadata.json` - Update `version`
3. `Makefile` - Update `VERSION` variable
