# Voice Keyboard Perlover

A Cinnamon panel applet that combines keyboard layout switching with voice input capabilities powered by OpenAI Whisper or local Whisper servers.

## Author's Note

Hello everyone! This app was put together in roughly 2-3 hours, almost entirely with Claude Code. I started from a prompt I drafted while chatting with ChatGPT, and when things did not behave the way I needed, I plugged in [Agent-OS](https://github.com/buildermethods/agent-os) — a bundle of planning helpers for Claude Code, Codex, and similar agents that makes project planning precise. After that I polished the project into what you see now: on Linux Cinnamon it drops a microphone icon into the tray; you can focus any window, click the icon, speak for up to five minutes (configurable), and the text is sent either to OpenAI Whisper using your API key or to your own Whisper server built on the open-source Whisper stack. The self-hosted path exists but has not been tested. I never touched a traditional text editor while building this project, including this README — I dictated everything to ChatGPT and asked it to translate to English. Consider this app a small proof-of-concept for vibe coding.

## Features

- **Keyboard Layout Switcher**: Display current keyboard layout and switch between layouts
- **Voice Input**: Record audio and transcribe it using Whisper technology
- **Multiple Whisper Backends**:
  - OpenAI Whisper-1 API (fast, accurate, affordable)
  - OpenAI GPT-4o Audio (advanced, emotion detection)
  - Local Whisper server (e.g., faster-whisper-server with large-v3)
- **Automatic Text Insertion**: Recognized text is automatically typed into the active window
- **Configurable Settings**:
  - Recording duration (10-600 seconds)
  - Language selection (auto-detect, Russian, English, Spanish, German, French, Chinese, Japanese)
  - Model selection (Whisper-1, GPT-4o Audio, or local models)
  - API key or local server URL
- **Visual Notifications**: System notifications for recording status and recognized text

## Requirements

- **Operating System**: Ubuntu 24.04 (Noble) or Linux Mint 22.2
- **Desktop Environment**: Cinnamon 5.8 or later
- **Dependencies**:
  - `python3`
  - `python3-requests`
  - `xdotool`
  - `ffmpeg`
  - `pulseaudio`

## Installation

### From .deb Package (Recommended)

**One-command installation (builds and installs with all dependencies):**
```bash
make deb-install
```

**Or step-by-step:**

1. Build the package:
   ```bash
   make deb
   ```

2. Install the package with dependencies:
   ```bash
   sudo apt install ../voice-keyboard-perlover_*_all.deb
   ```

   Note: Use `apt install` (not `dpkg -i`) to automatically install all dependencies.

### Manual Installation

```bash
sudo make install
```

## Setup

### 1. Add Applet to Panel

1. Right-click on your Cinnamon panel
2. Select "Applets"
3. Find "Keyboard + Voice Input" in the list
4. Click "Add to panel"

**Note**: If the applet doesn't appear immediately, restart Cinnamon by pressing `Ctrl+Alt+Esc` or log out and log back in.

### 2. Configure Voice Input

Right-click the applet icon and select "Configure":

#### Option A: Using OpenAI Whisper API

1. Set **Whisper mode** to "OpenAI API"
2. Enter your **OpenAI API Key** (get it from https://platform.openai.com/api-keys)
3. Choose **OpenAI Model**:
   - **Whisper-1** (recommended): Fast, accurate, $0.006/minute
   - **GPT-4o Audio**: Advanced model with emotion detection and better context understanding, $0.06/minute (10x more expensive)
4. Select your preferred **Language** (or leave as "Auto-detect")
5. Set **Recording duration** (default: 300 seconds)

**Which model to choose:**
- **Whisper-1**: Best for simple voice-to-text transcription. Fast and cost-effective.
- **GPT-4o Audio**: Use when you need:
  - Better understanding of context and intent
  - Emotion and tone detection
  - More accurate transcription of complex speech
  - Better handling of accents and background noise

  Note: GPT-4o Audio is 10x more expensive but provides significantly better quality.

#### Option B: Using Local Whisper Server

1. Set **Whisper mode** to "Local Server"
2. Enter your **Local Whisper Server URL** (e.g., `http://localhost:9000/asr`)
3. Select your preferred **Language**
4. Set **Recording duration**

##### Setting up a Local Whisper Server

You can use [faster-whisper-server](https://github.com/fedirz/faster-whisper-server) for fast, private, offline voice recognition.

**Why use a local server:**
- ✅ Complete privacy - audio never leaves your machine
- ✅ No API costs - unlimited free transcription
- ✅ Works offline - no internet connection required
- ✅ Faster processing - especially with GPU acceleration
- ✅ Support for all Whisper models (tiny to large-v3)

**Installation with Docker (Recommended):**

1. **CPU-only version** (works on any machine):
   ```bash
   docker run -d \
     --name whisper-server \
     -p 8000:8000 \
     -e MODEL=large-v3 \
     fedirz/faster-whisper-server:latest-cpu
   ```

2. **GPU-accelerated version** (requires NVIDIA GPU with CUDA):
   ```bash
   docker run -d \
     --name whisper-server \
     --gpus all \
     -p 8000:8000 \
     -e MODEL=large-v3 \
     fedirz/faster-whisper-server:latest-cuda
   ```

3. **Configure the applet:**
   - Whisper mode: `Local Server`
   - Local Whisper Server URL: `http://localhost:8000/v1/audio/transcriptions`

**Available models:**
- `tiny` - Fastest, lowest accuracy (39M parameters)
- `base` - Fast, decent accuracy (74M parameters)
- `small` - Balanced (244M parameters)
- `medium` - Good accuracy (769M parameters)
- `large-v3` - **Best accuracy** (1550M parameters, recommended)

**System requirements:**
- CPU-only: 4GB RAM minimum, 8GB recommended
- GPU (CUDA): NVIDIA GPU with 4GB+ VRAM for large-v3

**Verify server is running:**
```bash
curl http://localhost:8000/health
```

**Alternative installation (without Docker):**
```bash
# Install with pip
pip install faster-whisper-server

# Run server
faster-whisper-server \
  --host 0.0.0.0 \
  --port 8000 \
  --model large-v3
```

## Usage

### Voice Input Methods

1. **Click the microphone icon** in the panel
2. **Or** click the applet and select "Start Voice Input" from the menu

### Workflow

1. Click to start recording
2. See notification: "Recording started, please speak..."
3. Speak clearly for the configured duration
4. Wait for transcription (local is faster, OpenAI may take a few seconds)
5. See notification: "Recognized: [your text]"
6. Text is automatically typed into the active window

### Keyboard Layout Switching

- Click the applet to see available layouts
- Select a layout from the menu to switch
- Current layout is displayed on the panel

## Troubleshooting

### Applet doesn't appear in the list

- Restart Cinnamon: Press `Ctrl+Alt+Esc` or run `cinnamon --replace &` in terminal
- Or log out and log back in

### "ERROR: python3-requests is not installed"

```bash
sudo apt-get install python3-requests
```

### "ERROR: Failed to record audio"

- Check if PulseAudio is running: `pulseaudio --check`
- Test microphone: `ffmpeg -f pulse -i default -t 3 test.wav`
- Check microphone permissions

### "ERROR: Cannot connect to local Whisper server"

- Verify the server is running
- Check the URL in settings (default: `http://localhost:9000/asr`)
- Test manually: `curl -X POST -F "audio_file=@test.wav" http://localhost:9000/asr`

### "ERROR: OpenAI API error: 401"

- Verify your API key is correct
- Check you have credits at https://platform.openai.com/account/billing

### Text isn't typed correctly

- Ensure `xdotool` is installed: `sudo apt-get install xdotool`
- The active window must accept text input
- Some applications may not support xdotool input

## Development

### Project Structure

```
voice-keyboard-perlover/
├── applet/
│   └── voice-keyboard@perlover/
│       ├── metadata.json          # Applet metadata
│       ├── applet.js              # Main applet code (GJS)
│       ├── settings-schema.json   # Configuration schema
│       ├── stylesheet.css         # Applet styling
│       └── icon.svg               # Applet icon
├── scripts/
│   └── whisper-voice-input        # Python voice input script
├── debian/                        # Debian packaging files
│   ├── control
│   ├── rules
│   ├── install
│   ├── postinst
│   ├── prerm
│   ├── changelog
│   ├── compat
│   └── copyright
├── Makefile                       # Build automation
├── README.md                      # This file
└── LICENSE                        # MIT License
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/perlover/voice-keyboard-perlover.git
cd voice-keyboard-perlover

# Build .deb package
make deb

# Or install directly
sudo make install
```

### Makefile Targets

- `make help` - Show available targets
- `make install` - Install to system
- `make uninstall` - Remove from system
- `make deb` - Build .deb package
- `make deb-clean` - Clean build artifacts
- `make clean` - Clean all generated files

## Uninstallation

### Using dpkg

```bash
sudo dpkg -r voice-keyboard-perlover
```

### Manual Uninstallation

```bash
sudo make uninstall
```

**Note**: User settings in `~/.cinnamon/configs/voice-keyboard@perlover/` are preserved. Delete them manually if needed.

## Privacy & Security

- **OpenAI Mode**: Audio is sent to OpenAI servers for transcription
- **Local Mode**: Audio stays on your machine
- **API Key Storage**: Stored in Cinnamon config files (not encrypted)
- **Temporary Files**: Audio recordings are stored in `/tmp` and deleted after use

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Author

**perlover** - [GitHub](https://github.com/perlover)

## Acknowledgments

- OpenAI for the Whisper API
- Cinnamon desktop environment team
- faster-whisper-server project
- All contributors to the dependencies

## Links

- **Repository**: https://github.com/perlover/voice-keyboard-perlover
- **Issues**: https://github.com/perlover/voice-keyboard-perlover/issues
- **OpenAI Whisper**: https://platform.openai.com/docs/guides/speech-to-text
- **faster-whisper-server**: https://github.com/fedirz/faster-whisper-server
