# Tests

Automated and manual tests for Voice Keyboard Perlover.

## Test Files

### GJS (applet)
- **`state-machine-tests.js`** - state machine foundation
- **`click-handler-tests.js`** - left/right click handling
- **`idle-recording-tests.js`** - IDLE and RECORDING states
- **`processing-error-tests.js`** - PROCESSING and ERROR states
- **`integration-tests.js`** - end-to-end workflows across all states

The GJS tests run under plain `gjs` against mock applet objects; a running Cinnamon session is not needed.

### Python (script)
- **`test_python_script_modifications.py`** - `scripts/whisper-voice-input`: exit codes, configuration
  validation, paste method, OpenAI-compatible mode, `--list-models`, chat prompt processing

### Manual
- **`MANUAL_TESTING_CHECKLIST.md`** - step-by-step scenarios to run on a real Cinnamon desktop

### Runner
- **`run-all-tests.sh`** - runs every automated suite and prints a summary

## Running Tests

```bash
# All automated tests
./tests/run-all-tests.sh

# Python tests only
python3 tests/test_python_script_modifications.py

# A single GJS suite
gjs tests/state-machine-tests.js
```

## Requirements

- GJS tests: `gjs` (shipped with Cinnamon)
- Python tests: Python 3 with `requests`
- Manual tests: installed applet on Cinnamon 5.8+, a working microphone, an OpenAI API key,
  an OpenAI-compatible server or a local Whisper server, plus `ffmpeg`, `xclip` and `xdotool`

## Adding Tests

- Put applet tests in a new or existing `*-tests.js` file and register it in `run-all-tests.sh`
- Add script tests as methods of `TestPythonScriptModifications` in `test_python_script_modifications.py`
