# Tech Stack

## Current Technology Stack (v1.0.0)

### Frontend - Cinnamon Applet

**Technology:** GJS (GNOME JavaScript)
- **Why:** Native language for Cinnamon applets, providing direct access to GNOME/Cinnamon APIs (St, Clutter, Gio, GLib)
- **Use Case:** Implements panel applet UI, menu interactions, system notifications, and icon display
- **Alternatives Considered:** C/C++ (too complex for rapid development), Python (not standard for Cinnamon applets)
- **Trade-offs:** GJS has smaller ecosystem than Node.js but offers seamless desktop integration

**Key Libraries:**
- `St` (Shell Toolkit): UI widgets and styling
- `Clutter`: Graphics and animation
- `Gio`: Subprocess management, file I/O, settings
- `GLib`: Event loop, timers, utilities
- `Cinnamon.*`: Desktop-specific APIs (settings, keybindings, panel)

### Backend - Transcription Service

**Technology:** Python 3
- **Why:** De facto language for ML/AI tools, native Whisper support, rich audio processing ecosystem
- **Use Case:** Audio recording, transcription API calls, local Whisper model inference, configuration management
- **Alternatives Considered:** Node.js (weaker ML ecosystem), Rust (longer development time for ML integration)
- **Trade-offs:** Python startup time slightly slower than compiled languages, but transcription latency far exceeds startup overhead

**Key Libraries:**
- `requests`: HTTP client for Whisper API calls (both OpenAI and local server)
- Standard library: `os`, `sys`, `subprocess`, `tempfile`, `json`, `time`, `pathlib`

### Audio Capture

**Technology:** ffmpeg with PulseAudio/PipeWire
- **Why:** Ubiquitous, reliable, supports all Linux audio systems, simple command-line interface
- **Use Case:** Records microphone input to WAV/FLAC file via subprocess call
- **Command:** `ffmpeg -f pulse -i default -ar 16000 -ac 1 -t <duration> output.wav`
- **Alternatives Considered:** PyAudio (requires PortAudio dependency), sounddevice (additional Python dependency)
- **Trade-offs:** Subprocess overhead (~100ms) acceptable for push-to-talk workflow; not suitable for real-time streaming

**Audio Format:**
- 16kHz sample rate (Whisper optimal)
- Mono channel (speech doesn't require stereo)
- WAV format (lossless, widely compatible)

### Text Insertion

**Technology:** xdotool
- **Why:** Simple, reliable X11 input simulation, works universally across applications
- **Use Case:** Simulates keyboard typing to insert transcribed text into active window
- **Command:** `xdotool type --clearmodifiers "transcribed text"`
- **Alternatives Considered:** `ydotool` (Wayland-compatible but requires daemon), direct X11 programming (complexity)
- **Trade-offs:** X11-only (doesn't work natively on pure Wayland), but XWayland compatibility covers 95%+ current use cases

### Packaging & Distribution

**Technology:** Debian packaging (.deb)
- **Why:** Native package format for Ubuntu and Linux Mint (primary target platforms)
- **Use Case:** System-wide installation of applet, Python backend, dependencies, and desktop files
- **Structure:**
  - `/usr/share/cinnamon/applets/voice-keyboard@perlover/` - Applet files
  - `/usr/bin/whisper-voice-input` - Python backend script
  - `/usr/share/doc/voice-keyboard-perlover/` - Documentation
- **Dependencies:** Declared in `debian/control` (cinnamon >= 5.8, python3, python3-requests, xdotool, ffmpeg, pulseaudio | pipewire-pulse)
- **Architecture:** `all` (architecture-independent, pure scripts)

**Target Platforms:**
- Ubuntu 24.04 Noble (all architectures - package is architecture-independent)
- Linux Mint 22.2 (based on Ubuntu Noble)

### Configuration Management

**Technology:** Cinnamon Settings API (Settings.AppletSettings)
- **Why:** Native Cinnamon applet configuration system with GUI integration
- **Storage:** Cinnamon manages settings storage in `~/.cinnamon/configs/voice-keyboard@perlover/`
- **Configuration Schema:** `settings-schema.json` defines available settings (whisper-mode, api-key, language, duration, etc.)
- **Access:** Settings bound to applet properties via `this.settings.bind()` in GJS code
- **Alternatives Considered:** Manual JSON files (less integration), GSettings (not standard for applets)
- **Trade-offs:** Tied to Cinnamon, but provides excellent desktop integration and user experience

### Development & Build Tools

**Technology:** Standard Linux tooling
- `dpkg-deb`: Debian package creation
- `git`: Version control
- `shellcheck`: Shell script linting (for packaging scripts)
- `pylint`/`ruff`: Python code quality (development)
- Text editors: VSCode, Vim, nano

## Planned Technology Migrations (v2.0+)

### Audio Capture → PipeWire Native API

**Current Problem:** ffmpeg subprocess adds latency (~100-200ms) and prevents real-time streaming

**Migration Plan:**
- **Technology:** PipeWire native API via GObject Introspection or Python bindings
- **Timeline:** v2.0 (Phase 2)
- **Benefits:**
  - Lower latency (direct audio stream access)
  - Native Wayland support
  - Better audio routing control (per-app audio capture)
  - Real-time streaming capability
- **Implementation:**
  - GJS option: Use `Pw` GObject introspection bindings if available
  - Python option: `python-pipewire` or direct libpipewire bindings
- **Backward Compatibility:** Keep ffmpeg fallback for systems without PipeWire

### Text Insertion → Wayland Input Protocol

**Current Problem:** xdotool only works on X11 (relies on XWayland for Wayland sessions)

**Migration Plan:**
- **Technology:** Direct Wayland input protocol implementation or `wtype`/`ydotool`
- **Timeline:** v2.0 (Phase 2)
- **Options:**
  1. **wtype**: Wayland-native typing tool (simplest, similar to xdotool)
  2. **ydotool**: Requires daemon but works on both X11 and Wayland
  3. **Custom libinput integration**: Most control but highest complexity
- **Preferred Approach:** `wtype` for Wayland, keep `xdotool` for X11, auto-detect session type
- **Benefits:**
  - Native Wayland compatibility
  - Future-proof as Linux moves to Wayland
  - Better security integration with Wayland compositors

### Backend Architecture → Plugin System

**Current Problem:** Monolithic backend tied to Whisper; hard to add new STT engines

**Migration Plan:**
- **Technology:** Python plugin architecture with abstract base class
- **Timeline:** v2.0 (Phase 2)
- **Architecture:**
  ```python
  # Abstract base class
  class STTBackend(ABC):
      @abstractmethod
      def transcribe(self, audio_file: Path, language: str) -> str:
          pass

  # Plugins
  class WhisperAPIBackend(STTBackend): ...
  class LocalWhisperBackend(STTBackend): ...
  class VoskBackend(STTBackend): ...
  class DeepgramBackend(STTBackend): ...
  ```
- **Plugin Discovery:** Entry points or config-based plugin loading
- **Benefits:**
  - Support multiple STT engines (Whisper, Vosk, Deepgram, Riva, Whisper.cpp, Coqui STT)
  - Community can contribute new backends
  - A/B testing different engines for accuracy

### System Architecture → D-Bus Service

**Current Problem:** Applet-specific; other apps can't use voice input programmatically

**Migration Plan:**
- **Technology:** D-Bus system service with standardized API
- **Timeline:** v2.0 (Phase 2)
- **API Design:**
  ```
  Service: org.voicekeyboard.Transcription
  Object Path: /org/voicekeyboard/Transcription
  Interface: org.voicekeyboard.Transcription

  Methods:
    StartRecording(language: str) -> void
    StopRecording() -> str (transcribed text)
    GetStatus() -> dict (recording state, backend, etc.)
    SetBackend(backend: str) -> void

  Signals:
    RecordingStarted()
    RecordingStopped(text: str)
    TranscriptionError(error: str)
  ```
- **Benefits:**
  - System-wide service accessible to all desktop environments
  - Applications can trigger dictation programmatically
  - Foundation for multi-desktop support
  - Enables integrations (e.g., VSCode extension calls D-Bus API)

## Multi-Desktop Technology Strategy (v2.0+)

### Shared Core Library

**Technology:** Python package + D-Bus service
- **Structure:**
  ```
  voice-keyboard-core/
    ├── audio/          # Audio capture abstraction
    ├── backends/       # STT backend plugins
    ├── text_injection/ # Text insertion abstraction
    ├── dbus_service/   # D-Bus service implementation
    └── config/         # Unified config management
  ```
- **Benefits:**
  - Single codebase for backend logic
  - Desktop-specific frontends are thin UI layers
  - Consistency across desktops
  - Easier maintenance and testing

### Desktop-Specific Frontends

**GNOME Extension:**
- **Technology:** JavaScript (GNOME Shell extension API)
- **UI:** System status area indicator
- **Integration:** GNOME Shell APIs (Panel, PopupMenu, St)
- **Distribution:** GNOME Extensions website

**KDE Plasma Widget:**
- **Technology:** QML + JavaScript
- **UI:** System tray plasmoid
- **Integration:** Plasma API, KConfig
- **Distribution:** KDE Store

**XFCE Panel Plugin:**
- **Technology:** C or Vala
- **UI:** Panel plugin with GTK+
- **Integration:** XFCE panel plugin API
- **Distribution:** XFCE plugins repository

**All frontends communicate with shared D-Bus service for actual transcription work.**

## Future Technology Considerations

### GPU/NPU Acceleration

**Options:**
- **CUDA (NVIDIA):** Via `torch` with CUDA support for Whisper
- **ROCm (AMD):** Via `torch` with ROCm build
- **Intel GPU:** Via OpenVINO or oneAPI
- **NPU/Edge TPU:** Via ONNX Runtime or TensorFlow Lite
- **Implementation:** Auto-detect hardware, fall back to CPU if unavailable

### Noise Suppression

**Options:**
- **RNNoise:** Lightweight, CPU-efficient, open-source
- **WebRTC VAD:** Voice activity detection + noise suppression
- **Krisp-style ML models:** Deep learning-based (heavier but better quality)
- **Implementation:** Preprocess audio before sending to STT engine

### Real-Time Streaming

**Requirements:**
- Low-latency audio capture (PipeWire)
- Streaming STT backend (faster-whisper, Whisper.cpp, or cloud streaming APIs)
- Incremental text insertion (word-by-word as transcribed)
- **Challenges:** Whisper is not inherently streaming; need alternatives like:
  - `faster-whisper`: Optimized Whisper with lower latency
  - `whisper.cpp`: C++ implementation with streaming support
  - Cloud streaming APIs: Google Cloud Speech (streaming), Azure Speech (streaming)

### Package Distribution Expansion

**Timeline:** v3.1+
- **Flatpak:** Universal packaging, sandboxed, Flathub distribution
  - **Challenge:** D-Bus service needs host system access
  - **Solution:** Flatpak host access permissions
- **Snap:** Ubuntu Software Center, confinement
  - **Similar challenges to Flatpak**
- **AppImage:** Single-file portable application
  - **Simplest for D-Bus service: bundled as part of AppImage**

### Alternative Frontend Technologies (Exploration)

**If expanding beyond traditional desktop environments:**
- **Web-based UI:** Electron or Tauri app for universal desktop compatibility
  - **Pros:** Cross-platform, modern UI, easier development
  - **Cons:** Larger footprint, less native feel
- **GTK4/Libadwaita:** Standalone GTK application (not applet/widget)
  - **Pros:** Native GNOME/Linux look, modern GTK features
  - **Cons:** Separate window rather than panel integration

## Technology Decision Principles

1. **Prefer Open Source:** All core technologies are FOSS-compatible
2. **Linux-Native First:** Choose technologies with strong Linux support
3. **User Privacy:** Local processing capability is non-negotiable
4. **Maintainability:** Avoid overly complex dependencies or cutting-edge tech that breaks frequently
5. **Community Contribution:** Select technologies with active communities and documentation
6. **Performance:** Balance between developer velocity and runtime efficiency
7. **Future-Proof:** Favor Wayland/PipeWire over X11/PulseAudio for long-term sustainability

## Dependency Management Strategy

**Current Minimal Dependencies:**
- Only `python3-requests` required (available in Ubuntu/Debian repositories)
- No additional Python packages installed via pip
- Local Whisper support requires user to set up their own server (not bundled)

**Future Approach (v2.0+):**
- **Option 1:** Vendor Python dependencies in .deb package (larger package, no network required)
- **Option 2:** Bundle local Whisper installation support via postinst script
- **Option 3:** Move to PyPI package + desktop-specific wrapper packages (better separation)
- **Recommended:** Continue minimal dependency approach; users choose their own Whisper backend

## Testing Infrastructure (Future)

**Unit Testing:**
- Python: `pytest` for backend logic
- GJS: `jasmine` or custom test harness

**Integration Testing:**
- Docker containers with different desktop environments
- Automated recording → transcription → text insertion validation
- CI/CD: GitHub Actions with Ubuntu/Mint containers

**End-to-End Testing:**
- Virtual machines with real desktop environments
- Manual testing protocol for each release
- Community beta testing program

## Security Considerations

**Current:**
- API keys stored in Cinnamon settings (`~/.cinnamon/configs/voice-keyboard@perlover/`)
- No sensitive data stored permanently beyond configuration
- Temporary audio files in `/tmp` cleaned up immediately after transcription
- Script runs with user permissions (no special privileges required)

**Future Enhancements:**
- Secret storage integration (GNOME Keyring, KWallet, Secret Service API) for API keys
- Optional encryption for transcription history
- Sandboxing for untrusted STT backend plugins
