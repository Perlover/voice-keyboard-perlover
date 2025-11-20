# Specification: Click-to-Toggle Voice Recording

## Goal

Transform the voice input user experience from a menu-based, fixed-duration recording system to an intuitive click-to-toggle interface where left-clicking the microphone icon immediately starts recording, displays visual state feedback through animations, and stops recording on the next click for user-controlled recording duration.

## User Stories

- As a user, I want to left-click the microphone icon to immediately start recording without navigating through menus so that voice input is faster and more intuitive
- As a user, I want to see clear visual feedback during recording and processing so that I know the system is working without intrusive notifications
- As a user, I want to control how long I record by clicking again when finished so that I can record short phrases or longer dictation as needed

## Specific Requirements

**State Machine with Four Icon States**
- IDLE state: Normal microphone icon with no animation, left-click starts recording or shows configuration error
- RECORDING state: Microphone icon with smooth fade animation (2-second cycle, fading to 30% opacity and back to 100%), left-click stops recording and starts transcription
- PROCESSING state: Microphone icon with 8-dot circular loading indicator rotating counterclockwise (2-second complete rotation), left-click cancels transcription
- ERROR state: Microphone icon with red warning triangle overlay, left-click opens modal dialog with error details
- All state transitions must cancel previous animations and start new ones appropriate to the new state
- Settings dialog can be opened during any state without blocking recording or processing

**Recording State Smooth Fade Animation**
- Use Clutter.Actor.ease() with Clutter.AnimationMode.EASE_IN_OUT_QUAD for smooth transitions
- Complete fade cycle takes 2 seconds total: 1 second fade out to 30% opacity (77/255), 1 second fade in to 100% opacity (255/255)
- Animation loops continuously while in RECORDING state
- Animation must be cancelled and cleaned up when transitioning to any other state
- Store animation reference to allow proper cleanup: if (this.recordingAnimation) this.recordingAnimation.stop()

**Processing State Rotating Dot Animation**
- Create 8-dot circular loading indicator positioned around microphone icon (reduce microphone size if needed to fit)
- One bright dot moves counterclockwise through 7 dimmer dots
- Complete rotation takes 2 seconds
- Animation loops continuously while in PROCESSING state
- Animation must be cancelled and cleaned up when transitioning to any other state

**Error State Visual Feedback**
- Display red warning triangle with exclamation mark overlay on top of microphone icon
- Use standard system applet warning pattern for consistency
- No animation in error state (static display)
- Clicking error icon opens modal dialog (imports.ui.modalDialog.ModalDialog) with full error message details
- Dialog close event returns applet to IDLE state

**Left-Click Toggle Behavior**
- IDLE state: Validate configuration, start recording if valid, otherwise open settings dialog automatically with notification
- RECORDING state: Stop recording immediately and transition to PROCESSING state (no confirmation required)
- PROCESSING state: Cancel transcription silently and return to IDLE state (no notification)
- ERROR state: Open modal dialog with error details, dialog close returns to IDLE
- No debouncing or double-click detection (immediate response to each click)

**Right-Click Settings Menu**
- Menu contains only "Settings" option (remove "Start Voice Input" option since left-click handles recording)
- Right-click behavior uses _onButtonPressEvent to detect button 3 (right mouse button)
- Settings can be accessed during any state (IDLE, RECORDING, PROCESSING, ERROR)
- If settings dialog is already open when recording starts, it remains open normally

**Configuration Validation Before Recording**
- Check whisperMode setting: if "openai", validate openaiApiKey is not empty; if "local", validate localUrl is not empty
- If validation fails: automatically open settings dialog via Util.spawnCommandLine, show notification "Settings are not configured", remain in IDLE state
- Validation happens immediately on left-click before attempting to start recording

**Maximum Recording Duration Safety Limit**
- Repurpose existing recording-duration setting as maximum duration (not fixed duration)
- Default changed from 10 seconds to 300 seconds (5 minutes)
- Range changed from 3-60 to 10-600 seconds (allow up to 10 minutes)
- Step changed from 1 to 10 seconds for better UX with larger values
- When maximum duration reached: stop recording automatically, show notification "Maximum recording time reached", start transcription automatically (as if user clicked)

**Instant Text Insertion Without Delays**
- Remove character-by-character typing loop with time.sleep(0.2) delays
- Use single xdotool command: subprocess.run(['xdotool', 'type', '--', text], timeout=10)
- Remove initial 0.2 second delay before typing
- Text should appear instantly all at once instead of character-by-character

**Active Window Change Detection**
- Store initial active window ID when recording starts: subprocess.check_output(['xdotool', 'getactivewindow'])
- After transcription completes, check current active window ID
- If window IDs don't match: show notification with recognized text, copy text to clipboard automatically using xclip or similar, do NOT type via xdotool
- If window IDs match: type text normally via xdotool

**Notification Behavior Changes**
- Remove notifications for: "Recording started", "Recording stopped", "Recognized: [text]" success messages
- Keep notifications for: API errors, maximum recording time reached, configuration errors, active window changed (with recognized text)
- Use existing notification pattern: imports.ui.main.notify('Voice Keyboard Perlover', message)
- Error notifications should be descriptive and actionable

**Settings Schema Update for recording-duration**
- Change type from fixed duration to maximum duration safety limit
- Update description: "Recording Duration" to "Maximum Recording Duration"
- Update tooltip to explain safety limit purpose and automatic stop behavior
- Update default: 10 to 300, min: 3 to 10, max: 60 to 600, step: 1 to 10, keep units: "seconds"

**Python Script Process Management**
- Modify script to accept new behavior: recording stops when parent process kills it (for user-controlled duration)
- Use exit codes to communicate different scenarios: 0 = success, 1 = configuration error, 2 = recording error, 3 = transcription error, 4 = cancelled by user, 5 = timeout/max duration
- Applet monitors process via GLib.child_watch_add to detect completion and exit codes
- Cancellation during PROCESSING state kills Python process via GLib.spawn_close_pid

**Click Handler Implementation Pattern**
- Override on_applet_clicked for left-click, use _onButtonPressEvent for right-click detection
- Implement handleLeftClick function with switch statement based on currentState
- Each state transition calls setState function that cleans up previous animations and starts new ones
- Store references to spawned processes and animations for proper cleanup

## Visual Design

No visual mockups provided. Visual specifications based on detailed requirements discussion:

**IDLE State Visual**
- Standard audio-input-microphone-symbolic icon
- No animation or overlay
- Normal panel applet appearance

**RECORDING State Visual**
- Same microphone icon with opacity animation
- Smooth continuous fade: 100% to 30% over 1 second, then 30% to 100% over 1 second, repeat
- Visual feedback clearly indicates active recording without being overly distracting

**PROCESSING State Visual**
- Microphone icon (possibly reduced size)
- 8 dots arranged in circle around icon
- One bright dot, seven dimmer dots
- Bright dot moves counterclockwise position by position
- Complete rotation every 2 seconds

**ERROR State Visual**
- Normal microphone icon
- Red warning triangle overlay with exclamation mark positioned on top
- Standard system applet error pattern for user familiarity
- Static display (no animation)

## Existing Code to Leverage

**GJS Applet Framework (applet/voice-keyboard@perlover/applet.js)**
- Existing Settings.AppletSettings pattern for configuration binding using this.settings.bind()
- Existing GLib.spawn_async_with_pipes pattern for Python script execution with environment variables
- Existing process monitoring via GLib.child_watch_add for completion detection
- Existing notification pattern using imports.ui.main.notify() for system messages
- IconApplet base class provides set_applet_icon_symbolic_name() for icon management

**Python Recording Script (scripts/whisper-voice-input)**
- Existing ffmpeg recording implementation with PulseAudio/PipeWire support (-f pulse -i default)
- Existing transcription functions for OpenAI API (transcribe_openai) and local servers (transcribe_local)
- Existing xdotool integration pattern for text typing (extend for window detection)
- Existing temporary file management with cleanup in finally block
- Existing error handling pattern with stderr logging and exit codes

**Settings System (settings-schema.json)**
- Existing combobox pattern for whisper-mode selection with dependency-based field visibility
- Existing spinbutton pattern for numeric inputs (repurpose for maximum duration)
- Existing entry pattern for API keys and URLs
- Settings binding automatically syncs to applet via this.settings.bind()

**Animation and UI Patterns**
- Use Clutter.AnimationMode.EASE_IN_OUT_QUAD for smooth easing (standard in Cinnamon applets)
- Use Clutter.Actor.ease() method for property animations (opacity, rotation, scale)
- Use Lang.bind(this, callback) for all callbacks to preserve context (required in GJS)
- Use imports.ui.modalDialog.ModalDialog for error detail dialogs

**Process Communication Pattern**
- Environment variables passed via GLib.get_environ() and envp.push() for configuration
- Stdout reading via Gio.DataInputStream and Gio.UnixInputStream for script output
- Process termination via GLib.spawn_close_pid() for cancellation

## Out of Scope

- Hotkey activation feature (planned for v1.1, but state machine design should support it)
- Real-time audio level indicator during recording (planned for v1.1)
- Voice activity detection for automatic start/stop (planned for v1.3)
- Streaming transcription with partial results (planned for v1.2)
- Alternative animation styles beyond smooth fade (pulse, scale, rotation, color change)
- Recording pause/resume functionality
- Audio waveform visualization during recording
- Recording history or saved transcriptions feature
- Text preview before insertion or undo functionality
- Multiple language detection within single recording
- Custom keyboard shortcuts configuration (wait for v1.1 hotkey feature)
- Advanced window tracking beyond initial active window detection
- Complex error recovery UI beyond modal dialog and notification
