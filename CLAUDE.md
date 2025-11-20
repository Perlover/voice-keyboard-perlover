# Voice Keyboard Perlover - Claude Development Guide

This document provides context for Claude Code (or other AI assistants) when working on this project.

## Project Overview

**Voice Keyboard Perlover** is a Cinnamon desktop environment applet that provides voice-to-text input using OpenAI Whisper API or local Whisper servers. The project consists of a Cinnamon applet (written in GJS), a Python script for audio recording and transcription, and Debian packaging for easy installation on Ubuntu 24.04 and Linux Mint 22.2.

## Project Structure

```
voice-keyboard-perlover/
├── applet/voice-keyboard@perlover/     # Cinnamon applet (GJS/JavaScript)
│   ├── applet.js                       # Main applet logic
│   ├── metadata.json                   # Applet metadata
│   ├── settings-schema.json            # Configuration schema
│   ├── stylesheet.css                  # Applet styling
│   └── icon.svg                        # Applet icon
├── scripts/
│   └── whisper-voice-input             # Python script for voice input
├── debian/                             # Debian packaging files
│   ├── control                         # Package metadata and dependencies
│   ├── rules                           # Build rules
│   ├── changelog                       # Package changelog
│   ├── install                         # Installation instructions
│   ├── postinst                        # Post-installation script
│   ├── prerm                           # Pre-removal script
│   └── copyright                       # License information
├── Makefile                            # Build automation
├── README.md                           # User documentation
├── QUICKSTART.md                       # Quick start guide
├── CONTRIBUTING.md                     # Contributor guidelines
├── LICENSE                             # MIT License
└── test-voice-input.sh                 # Testing script
```

## Technology Stack

### Frontend (Cinnamon Applet)
- **Language**: GJS (GNOME JavaScript bindings)
- **Framework**: Cinnamon Applet API
- **Key Libraries**:
  - `imports.ui.applet` - Base applet functionality
  - `imports.ui.popupMenu` - Menu system
  - `imports.gi.St` - UI toolkit (Shell Toolkit)
  - `imports.gi.GLib` - Process spawning and environment
  - `imports.gi.Gio` - I/O operations
  - `imports.ui.settings` - Settings management

### Backend (Voice Input Script)
- **Language**: Python 3
- **Key Libraries**:
  - `requests` - HTTP requests for Whisper APIs
  - `subprocess` - Running ffmpeg for audio recording
  - `tempfile` - Temporary file management
- **External Tools**:
  - `ffmpeg` - Audio recording via PulseAudio/PipeWire
  - `xdotool` - Automatic text insertion

### Packaging
- **System**: Debian/Ubuntu packaging (dpkg)
- **Build Tool**: debhelper (compat level 13)
- **Target Platforms**: Ubuntu 24.04 (Noble), Linux Mint 22.2

## Key Components

### 1. Cinnamon Applet (`applet.js`)

**Purpose**: Display microphone icon in panel, provide menu for voice input, handle settings.

**Key Functions**:
- `_init()` - Initialize applet, load settings, create UI
- `_startVoiceInput()` - Launch Python script with environment variables
- `on_applet_clicked()` - Handle clicks on applet icon

**Important Notes**:
- Uses `IconApplet` base class (simpler than `TextIconApplet`)
- Settings bound via `Settings.AppletSettings`
- Process spawning uses `GLib.spawn_async_with_pipes()`
- Must use `Lang.bind()` for callbacks to preserve `this` context

**Common Issues**:
- Avoid complex keyboard layout integration (causes GJS errors)
- Always import `Util` from `imports.misc.util`
- Use symbolic icon names (e.g., `audio-input-microphone-symbolic`)

### 2. Voice Input Script (`scripts/whisper-voice-input`)

**Purpose**: Record audio, transcribe using Whisper, type result.

**Key Functions**:
- `record_audio()` - Record using ffmpeg from PulseAudio
- `transcribe_openai()` - Send audio to OpenAI Whisper API
- `transcribe_local()` - Send audio to local Whisper server
- `type_text()` - Use xdotool to type recognized text

**Configuration** (via environment variables):
- `WHISPER_MODE` - "openai" or "local"
- `OPENAI_API_KEY` - OpenAI API key (if mode=openai)
- `WHISPER_LOCAL_URL` - Local server URL (if mode=local)
- `WHISPER_LANGUAGE` - Language code (auto/ru/en/es/de/fr/zh/ja)
- `RECORDING_DURATION` - Seconds to record (default: 10)

**Audio Recording**:
- Uses ffmpeg with `-f pulse` (works with PulseAudio and PipeWire)
- Format: 16kHz, mono, PCM s16le WAV
- Temporary files in `/tmp`, auto-deleted

**API Integration**:
- OpenAI: `https://api.openai.com/v1/audio/transcriptions`
- Model: `whisper-1`
- Authorization: Bearer token
- Timeout: 30 seconds

### 3. Debian Packaging

**Key Files**:
- `debian/control` - Dependencies: `cinnamon (>= 5.8), python3, python3-requests, xdotool, ffmpeg, pulseaudio | pipewire-pulse`
- `debian/rules` - Uses dh with custom install override
- `debian/changelog` - Version: 1.0.0-1, Distribution: noble

**Installation Locations**:
- Applet: `/usr/share/cinnamon/applets/voice-keyboard@perlover/`
- Script: `/usr/bin/whisper-voice-input`

**Important**:
- Use `pulseaudio | pipewire-pulse` for audio dependency (modern Ubuntu uses PipeWire)
- No `debian/compat` file (use `debhelper-compat (= 13)` in control instead)

## Development Workflow

### Building Package
```bash
make deb           # Build .deb package
make deb-install   # Build and install with dependencies
make deb-clean     # Clean build artifacts
```

### Testing Without Package
```bash
sudo make install     # Install files directly
sudo make uninstall   # Remove files
./test-voice-input.sh # Test voice input script
```

### After Code Changes
1. Edit files in `applet/` or `scripts/`
2. Run `make deb-clean && make deb` to rebuild
3. Run `sudo apt install --reinstall ../voice-keyboard-perlover_1.0.0-1_all.deb`
4. Restart Cinnamon: `Ctrl+Alt+Esc`
5. Re-add applet to panel if needed

### Debugging
- Check Cinnamon logs: `tail -f ~/.xsession-errors`
- Look for: `[voice-keyboard@perlover]` errors
- Use `global.logError()` in GJS code
- Use `print(..., file=sys.stderr)` in Python script

## Settings System

**Configuration File**: `settings-schema.json`

**Setting Types**:
- `combobox` - Dropdown selection (e.g., whisper-mode, language)
- `entry` - Text input (e.g., API key, server URL)
- `spinbutton` - Numeric input with min/max (e.g., recording-duration)

**Dependencies**: Use `"dependency": "whisper-mode=openai"` to show/hide fields based on other settings.

**Access in Applet**:
```javascript
this.settings.bind("setting-name", "propertyName");
// Access via: this.propertyName
```

## Common Tasks

### Adding a New Setting
1. Add to `settings-schema.json`:
   ```json
   "new-setting": {
       "type": "entry",
       "default": "default value",
       "description": "Setting description",
       "tooltip": "Help text"
   }
   ```
2. Bind in `applet.js`:
   ```javascript
   this.settings.bind("new-setting", "newSetting");
   ```
3. Use in code: `this.newSetting`

### Changing OpenAI API Integration
- Edit `transcribe_openai()` in `scripts/whisper-voice-input`
- URL is hardcoded: `https://api.openai.com/v1/audio/transcriptions`
- Model is hardcoded: `whisper-1`

### Supporting New Whisper Server Format
- Edit `transcribe_local()` in `scripts/whisper-voice-input`
- Handle different JSON response formats
- Check for `text`, `transcription`, or `results[0].transcript`

### Updating Version
1. Edit `debian/changelog` - add new entry at top
2. Edit `applet/voice-keyboard@perlover/metadata.json` - update `version`
3. Edit `Makefile` - update `VERSION` variable
4. Rebuild package

## Important Constraints

### GJS/Cinnamon Applet
- **No ES6 syntax** - Use `function()` not `() =>`
- **No async/await** - Use callbacks with `Lang.bind()`
- **No Node.js modules** - Only Cinnamon/GNOME imports
- **No jQuery** - Use native St/Clutter UI toolkit
- Use `_("string")` for translatable strings (gettext)

### Python Script
- **Python 3 only** - Use `#!/usr/bin/env python3`
- **Minimal dependencies** - Only stdlib + requests
- **Error handling** - Print to stderr, return non-zero on error
- **Cleanup** - Always remove temporary files

### Debian Packaging
- **Architecture: all** - No compiled binaries
- **Standards-Version: 4.6.2** - Current Debian policy
- **Compat level: 13** - Modern debhelper
- **No `debian/compat` file** - Use Build-Depends only

## Testing Checklist

Before committing changes:
- [ ] Applet loads without errors in Cinnamon
- [ ] Menu opens and items are clickable
- [ ] Settings dialog opens and saves changes
- [ ] Voice input works with OpenAI mode
- [ ] Voice input works with Local mode
- [ ] Text is typed correctly into active window
- [ ] Notifications appear for recording start/end
- [ ] Python script syntax is valid (`python3 -m py_compile`)
- [ ] JSON files are valid (`python3 -m json.tool`)
- [ ] Package builds without errors (`make deb`)
- [ ] Package installs cleanly (`sudo apt install`)
- [ ] No errors in `~/.xsession-errors` log

## Coding Conventions

### GJS (applet.js)
- Indentation: 4 spaces
- Naming: camelCase for functions, _privateMethod for private
- Comments: JSDoc-style for functions
- Error handling: try/catch with global.logError()

### Python (whisper-voice-input)
- Follow PEP 8 style guide
- Docstrings for all functions
- Type hints optional but encouraged
- Use f-strings for formatting

### Shell Scripts
- Use bash shebang: `#!/bin/bash`
- Set `-e` for error handling
- Quote all variables: `"$variable"`

## Resources

- Cinnamon Applet Tutorial: https://projects.linuxmint.com/reference/git/cinnamon-tutorials/
- GJS Documentation: https://gjs-docs.gnome.org/
- OpenAI Whisper API: https://platform.openai.com/docs/guides/speech-to-text
- Debian Packaging: https://www.debian.org/doc/manuals/maint-guide/

## License

This project is licensed under the MIT License. See LICENSE file for details.

---

**Last Updated**: 2024-11-20
**Cinnamon Version**: 5.8 - 6.4
**Ubuntu Version**: 24.04 (Noble)
**Linux Mint Version**: 22.2
