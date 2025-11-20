# Product Roadmap

## Phase 1: Core Enhancement (v1.1 - v1.3)

### v1.1 - Essential User Experience Improvements

1. [ ] Hotkey Activation — Add global keyboard shortcut (e.g., Super+Space or Ctrl+Alt+V) to start/stop recording without clicking the applet icon, enabling faster workflow for power users and accessibility users who cannot easily reach the mouse. `S`

2. [ ] Audio Level Indicator — Display real-time audio input level meter during recording in the applet tooltip or small popup, so users can verify their microphone is active and properly configured before speaking. `S`

3. [ ] Text History Panel — Store last 10-20 transcription results in a browsable history accessible via applet menu, allowing users to retrieve recently dictated text if it wasn't inserted correctly or was accidentally overwritten. `M`

4. [ ] Auto-Punctuation Toggle — Add configuration option to enable automatic punctuation insertion (periods, commas, question marks) based on speech patterns and pauses, improving transcription readability without manual editing. `M`

5. [ ] Recording Duration Indicator — Show elapsed recording time in real-time on the applet icon or tooltip, giving users feedback on how long they've been speaking and helping manage recording length. `XS`

### v1.2 - Advanced Transcription Features

6. [ ] Real-Time Streaming Mode — Implement streaming transcription that displays text as you speak (rather than after recording ends), providing immediate feedback and enabling longer dictation sessions with progressive text insertion. `L`

7. [ ] Language Auto-Detection — Automatically detect spoken language instead of requiring manual language selection, supporting multilingual users who switch contexts frequently without needing to reconfigure the backend. `M`

8. [ ] Custom Language Model Support — Allow users to specify custom-trained Whisper models or fine-tuned variants for specialized vocabulary (medical, legal, technical jargon), improving transcription accuracy for professional domains. `M`

9. [ ] Per-Application Dictation Profiles — Create application-specific transcription profiles (e.g., code comments mode for IDEs, formal writing for LibreOffice, casual for chat apps) that adjust punctuation, formatting, and vocabulary based on active window. `L`

10. [ ] Voice Commands for Text Editing — Support basic voice commands like "delete last word", "new paragraph", "select all", enabling hands-free text manipulation beyond simple insertion. `L`

### v1.3 - Audio Quality & Performance

11. [ ] Noise Suppression Filter — Integrate audio preprocessing (RNNoise, WebRTC VAD, or similar) to filter background noise before transcription, improving accuracy in non-ideal recording environments like busy offices or cafes. `M`

12. [ ] GPU Acceleration Helper — Add automatic detection and configuration for GPU-accelerated local Whisper (CUDA, ROCm, or Intel GPU), significantly reducing transcription time for users with compatible hardware. `M`

13. [ ] NPU/Edge TPU Support — Explore support for neural processing units (NPU) and Edge TPUs for efficient local transcription on modern hardware, reducing power consumption and improving performance on laptops. `L`

14. [ ] Adaptive Audio Buffer — Implement dynamic audio buffer sizing that adapts to speech patterns (longer pauses extend buffer, continuous speech processes in chunks), balancing latency and transcription context. `M`

15. [ ] Voice Activity Detection (VAD) — Add voice activity detection to automatically start transcription when speech begins and stop when user finishes speaking, eliminating need for manual start/stop. `M`

## Phase 2: Desktop Expansion & Architecture (v2.0)

### v2.0 - Multi-Desktop Foundation

16. [ ] Modular Backend Architecture — Refactor Python backend into plugin-based system supporting multiple STT engines (Whisper, Vosk, Deepgram, Riva, Whisper.cpp, Coqui STT), allowing users to choose optimal engine for their use case. `XL`

17. [ ] D-Bus System Service — Create system-wide dictation service accessible via D-Bus API, enabling any application to programmatically trigger voice input without depending on desktop environment. `L`

18. [ ] PipeWire Native Audio Capture — Replace ffmpeg-based audio recording with native PipeWire API, reducing latency, improving Wayland compatibility, and providing better audio routing control. `L`

19. [ ] Wayland Input Dispatcher — Replace xdotool with native Wayland input protocol implementation, ensuring compatibility with Wayland-native applications and future-proofing text insertion mechanism. `L`

20. [ ] GNOME Shell Extension — Port core functionality to GNOME Shell extension with similar UI/UX to Cinnamon applet, bringing voice dictation to Ubuntu GNOME, Fedora, and vanilla GNOME users. `XL`

21. [ ] KDE Plasma Widget — Develop KDE Plasma widget integrated into system tray with Plasma-native styling, serving KDE Neon, Kubuntu, and Manjaro KDE users. `XL`

22. [ ] XFCE Panel Plugin — Create XFCE panel plugin maintaining lightweight design philosophy, targeting Xubuntu and lightweight Linux distribution users. `L`

23. [ ] Shared Core Library — Extract common logic (audio processing, backend management, text injection abstraction) into shared library used by all desktop-specific frontends, ensuring consistency and reducing maintenance burden. `L`

24. [ ] Unified Configuration System — Implement cross-desktop configuration manager that works identically across GNOME, KDE, XFCE, and Cinnamon, stored in XDG-compliant locations. `M`

## Phase 3: Advanced Features & Ecosystem (v3.0+)

### v3.0 - Professional Features

25. [ ] Custom UI Theme Engine — Provide themeable UI with support for accent colors, icon sets, and layout customization matching user's desktop theme preferences. `M`

26. [ ] Multi-User Profile System — Support multiple user profiles with different backend configurations, language preferences, and dictation settings, useful for shared machines or users with different use cases. `M`

27. [ ] Cloud Backend Extensibility — Add support for additional cloud STT providers (Azure Speech, Google Cloud Speech-to-Text, AWS Transcribe) alongside OpenAI, giving users more cloud options. `M`

28. [ ] Transcription Quality Metrics — Display confidence scores, word-level timing, and alternative transcriptions when available from backend, helping users identify and correct potential errors. `S`

29. [ ] Export/Import Configurations — Enable easy sharing of configuration profiles, custom models, and dictation settings within teams or across user's multiple machines. `S`

30. [ ] Integration Plugins for Popular Apps — Develop native plugins for VSCode, IntelliJ, LibreOffice, and Firefox that provide enhanced dictation features specific to those applications. `XL`

### v3.1 - Distribution & Accessibility

31. [ ] Flatpak Universal Package — Create Flatpak package for distribution-agnostic installation across all Linux distributions, expanding reach beyond Debian/Ubuntu ecosystem. `M`

32. [ ] Snap Package — Publish Snap package for Ubuntu Software Center and broader Ubuntu ecosystem distribution. `M`

33. [ ] AppImage Distribution — Provide AppImage for users on immutable distributions or those preferring single-file portable applications. `S`

34. [ ] Accessibility Enhancements — Add screen reader integration, high contrast mode, keyboard-only navigation, and ARIA compliance for users with visual impairments or motor disabilities. `L`

35. [ ] Documentation Hub — Create comprehensive documentation site with tutorials, troubleshooting guides, video walkthroughs, and community-contributed tips. `M`

36. [ ] Translation/Localization — Translate UI and documentation to 10+ languages (Spanish, French, German, Chinese, Japanese, Russian, Portuguese, Italian, Korean, Arabic), making tool accessible globally. `L`

### v3.2 - Advanced Voice Interaction

37. [ ] Context-Aware Transcription — Implement ML-based context detection that adjusts transcription based on recent text, application type, and user's historical patterns, improving accuracy for technical terminology and names. `XL`

38. [ ] Speaker Diarization — Support multi-speaker transcription with speaker labels, useful for transcribing meetings, interviews, or collaborative voice notes. `L`

39. [ ] Voice Biometric Authentication — Optional voice authentication before dictation to prevent unauthorized use on shared machines while maintaining privacy (local processing only). `L`

40. [ ] Dictation Macros — Allow users to define custom voice macros (e.g., "insert email signature" → types full signature), enabling powerful voice-driven text expansion. `M`

41. [ ] Natural Language Commands — Expand voice commands beyond basic editing to include system operations ("open terminal", "switch to Firefox", "search for X"), creating unified voice control system. `XL`

### v3.3 - Ecosystem & Community

42. [ ] Plugin API for Third-Party Extensions — Open plugin API allowing community developers to create custom STT backends, audio processors, text formatters, and application integrations. `L`

43. [ ] Community Model Repository — Host repository of community-shared fine-tuned Whisper models, language-specific improvements, and domain-specific vocabularies. `M`

44. [ ] Telemetry Opt-In (Privacy-Preserving) — Optional, anonymized usage analytics (completely opt-in, transparent, local differential privacy) to guide development priorities based on real usage patterns. `M`

45. [ ] Integration Testing Framework — Comprehensive automated testing across different desktop environments, distributions, and hardware configurations to ensure quality and compatibility. `L`

46. [ ] Developer Documentation & SDK — Publish developer SDK, API documentation, and integration guides enabling other Linux projects to incorporate voice dictation capabilities. `M`

> Notes
> - Roadmap is ordered by technical dependencies and strategic value
> - Phase 1 focuses on improving existing Cinnamon applet with high-impact UX enhancements
> - Phase 2 establishes multi-desktop foundation and architectural improvements for scalability
> - Phase 3 builds advanced features and ecosystem, positioning as de-facto Linux voice input solution
> - Each item represents end-to-end (frontend + backend) functional and testable feature
> - Effort estimates assume single developer; adjust for team contributions
> - Community contributions may accelerate timeline, especially for desktop-specific frontends
> - Maintain backward compatibility in configuration format and D-Bus API across major versions
