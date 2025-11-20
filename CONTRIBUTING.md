# Contributing to Voice Keyboard Perlover

Thank you for your interest in contributing to Voice Keyboard Perlover!

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS version, Cinnamon version)
- Relevant logs from `~/.xsession-errors` or console output

### Suggesting Features

Feature requests are welcome! Please:
- Check if the feature has already been requested
- Describe the use case and expected behavior
- Consider if it fits the project's scope

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly:
   - Test applet installation and removal
   - Test both OpenAI and local Whisper modes
   - Test different languages
   - Verify .deb package builds correctly
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/voice-keyboard-perlover.git
cd voice-keyboard-perlover

# Install system dependencies
sudo apt-get install cinnamon python3 python3-requests xdotool ffmpeg pulseaudio

# For Debian packaging
sudo apt-get install dpkg-dev debhelper

# Test installation without building package
sudo make install

# After making changes, test
sudo make uninstall
sudo make install
```

## Code Style

### Python (whisper-voice-input)
- Follow PEP 8
- Use meaningful variable names
- Add docstrings for functions
- Handle errors gracefully with try/except
- Print errors to stderr, results to stdout

### JavaScript/GJS (applet.js)
- Follow Cinnamon applet conventions
- Use proper indentation (4 spaces)
- Add comments for complex logic
- Use Lang.bind() for callbacks
- Handle errors with try/catch and global.logError()

### JSON Files
- Validate with `python3 -m json.tool filename.json`
- Use 4-space indentation
- Keep settings-schema.json organized by category

## Testing Checklist

Before submitting a PR, verify:

- [ ] Applet installs correctly via .deb package
- [ ] Applet appears in Cinnamon Applets menu
- [ ] Current keyboard layout is displayed
- [ ] Layout switching works
- [ ] Microphone icon appears and is clickable
- [ ] Voice input works with OpenAI API mode
- [ ] Voice input works with local Whisper mode
- [ ] Settings are saved and loaded correctly
- [ ] Notifications appear for recording start/end
- [ ] Recognized text is typed correctly
- [ ] Error handling works (no API key, no server, etc.)
- [ ] Uninstallation works cleanly
- [ ] No errors in `~/.xsession-errors`

## Project Structure

```
applet/voice-keyboard@perlover/
├── applet.js              # Main applet logic
├── metadata.json          # Applet metadata
├── settings-schema.json   # Configuration schema
├── stylesheet.css         # Styling
└── icon.svg              # Panel icon

scripts/
└── whisper-voice-input   # Voice recording/transcription script

debian/                   # Debian packaging
```

## Commit Messages

Use clear, descriptive commit messages:

```
Good:
- "Add support for Spanish language"
- "Fix microphone icon not updating state"
- "Improve error handling for network failures"

Bad:
- "fix bug"
- "update"
- "changes"
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or discussion on GitHub if you have questions about contributing.
