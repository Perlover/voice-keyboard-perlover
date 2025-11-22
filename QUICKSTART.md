# Quick Start Guide

## Installation (2 steps)

1. **Build and install (with all dependencies):**
   ```bash
   make deb-install
   ```

   Or alternatively:
   ```bash
   make deb
   sudo apt install ../voice-keyboard-perlover_*_all.deb
   ```

2. **Add to panel:**
   - Right-click Cinnamon panel → "Applets"
   - Find "Keyboard + Voice Input" → "Add to panel"
   - If not visible: restart Cinnamon (`Ctrl+Alt+Esc`) or re-login

## Configuration

Right-click applet → "Configure":

### Option A: OpenAI Whisper
- Mode: **OpenAI API**
- API Key: Get from https://platform.openai.com/api-keys
- Language: Choose or leave "Auto-detect"
- Duration: 10 seconds (default)

### Option B: Local Whisper Server
- Mode: **Local Server**
- URL: `http://localhost:9000/asr`
- Start server first (see below)

### Running Local Whisper Server

```bash
# Using Docker (recommended)
docker run --gpus all -p 9000:8000 fedirz/faster-whisper-server:latest-cuda

# Or using pip
pip install faster-whisper-server
faster-whisper-server --host 0.0.0.0 --port 9000
```

## Usage

1. Click **microphone icon** in panel (or applet menu → "Start Voice Input")
2. Speak for configured duration (default: 10 sec)
3. Wait for transcription
4. Text appears in active window automatically

## Testing Before Installation

```bash
./test-voice-input.sh
```

## Troubleshooting

**Applet not in list?**
- Restart Cinnamon: `Ctrl+Alt+Esc`
- Or: `cinnamon --replace &`

**No microphone?**
```bash
# Test recording
ffmpeg -f pulse -i default -t 3 test.wav
```

**Local server not responding?**
```bash
# Check if running
curl http://localhost:9000/health
```

**OpenAI API error?**
- Verify API key
- Check billing: https://platform.openai.com/account/billing

## Uninstall

```bash
sudo dpkg -r voice-keyboard-perlover
```

Settings preserved in: `~/.cinnamon/configs/voice-keyboard@perlover/`

## More Info

See [README.md](README.md) for full documentation.
