# Specification: Processing Animation and Speed Optimization

## Goal
Enhance visual feedback during recording and processing states with synchronized opacity+scale animations, and reduce API upload time by recording audio directly to M4A/AAC format instead of WAV.

## User Stories
- As a user, I want to see clear visual feedback during both recording and processing states so that I know the applet is working
- As a user, I want faster transcription response times so that voice input feels more responsive

## Specific Requirements

**Synchronized Opacity + Scale Animation for Recording State**
- Modify existing `_fadeOut()` and `_fadeIn()` functions to include scale animation
- Opacity animation: 30% (77/255) to 100% (255/255) - existing behavior
- Scale animation: 70% to 100%, synchronized with opacity
- Bright (opacity 100%) = full size (scale 100%), Dim (opacity 30%) = shrunk (scale 70%)
- Use `Clutter.Actor.ease()` with both `opacity` and `scale_x`/`scale_y` properties in single call
- Set `pivot_point` to (0.5, 0.5) for center-based scaling
- Maintain 1-second animation cycle (1000ms per direction)

**Synchronized Opacity + Scale Animation for Processing State**
- Replace current `_rotateDot()` timer-based animation with smooth Clutter ease animation
- Implement same opacity+scale pattern as recording animation
- Create `_processingFadeOut()` and `_processingFadeIn()` methods mirroring recording animation
- Check for `STATE_PROCESSING` instead of `STATE_RECORDING` in animation callbacks
- Animation must stop cleanly when state changes via `setState()`

**Change Processing Icon to cloud-upload**
- In `startProcessingAnimation()`, change icon from `emblem-synchronizing-symbolic` to `cloud-upload`
- System theme icon available at `/usr/share/icons/Papirus/24x24/actions/cloud-upload.svg`
- Use `this.set_applet_icon_symbolic_name("cloud-upload")` for theme consistency
- Reference visual provided shows cloud with upward arrow concept

**Direct M4A/AAC Recording via ffmpeg**
- Modify `record_audio_user_controlled()` function in Python script
- Change output file extension from `.wav` to `.m4a`
- Change ffmpeg command from PCM WAV to AAC encoding
- New ffmpeg parameters: `-c:a aac -b:a 64k` instead of `-acodec pcm_s16le`
- Maintain 16kHz sample rate (`-ar 16000`) and mono channel (`-ac 1`)
- CRITICAL: Record directly to M4A, do NOT convert from WAV (conversion negates size benefit)

**Update API MIME Type for M4A**
- In `transcribe_openai()`, change MIME type from `audio/wav` to `audio/m4a`
- In `transcribe_local()`, change MIME type from `audio/wav` to `audio/m4a`
- OpenAI Whisper API supports m4a format (documented: mp3, mp4, mpeg, mpga, m4a, wav, webm)
- Local server compatibility should be tested

**Update GPT-4o Audio Format Parameter**
- In `transcribe_gpt4o_audio()`, change `"format": "wav"` to `"format": "m4a"` in input_audio object
- Verify GPT-4o audio preview model accepts m4a format

**Animation Cleanup Enhancement**
- In `stopRecordingAnimation()`, also remove `scale_x` and `scale_y` transitions
- In `_cleanupLoadingDots()`, remove any active ease animations on actor
- Reset `scale_x` and `scale_y` to 1.0 when stopping animations
- Ensure `setIdleIcon()` resets scale properties to 1.0

## Visual Design

**`planning/visuals/cloud-upload-svgrepo-com.svg`**
- Shows cloud outline with upward arrow in center
- 800x800px viewBox, black fill, simple line art style
- This is a reference icon only - use system theme icon `cloud-upload` for implementation
- System icon provides theme consistency with Papirus/ePapirus icons
- Icon clearly represents "upload to cloud" concept for processing state

## Existing Code to Leverage

**Recording Animation in applet.js (lines 118-165)**
- `startRecordingAnimation()`, `_fadeOut()`, `_fadeIn()` methods provide animation pattern
- Uses `this.actor.ease()` with `opacity`, `duration`, `mode`, `onComplete` parameters
- `Clutter.AnimationMode.EASE_IN_OUT_QUAD` easing function already in use
- `Lang.bind(this, callback)` pattern for callbacks
- Extend to include `scale_x` and `scale_y` properties

**Processing Animation in applet.js (lines 172-219)**
- `startProcessingAnimation()` sets icon and manages animation state
- `_rotateDot()` uses `GLib.timeout_add()` timer - replace with Clutter ease
- `_cleanupLoadingDots()` removes timeout - extend to remove transitions
- `processingAnimation` object tracks animation state

**Python ffmpeg Command (lines 50-59)**
- Current command uses `-acodec pcm_s16le` for WAV format
- `-ar 16000` (sample rate) and `-ac 1` (mono) must be preserved
- `-y` flag for overwrite and `-f pulse` for PulseAudio input remain unchanged
- Modify codec and output extension only

**Clutter Actor Properties**
- `this.actor` is the Clutter.Actor for the applet icon
- Supports `scale_x`, `scale_y`, `pivot_point` properties
- `ease()` method accepts multiple properties in single call
- `remove_transition('property-name')` stops specific animations

## Out of Scope
- Model selection changes (whisper-1 vs gpt-4o-audio-preview configuration)
- API timeout changes (keep 30 seconds for OpenAI, 60 seconds for GPT-4o)
- HTTP connection pooling or keep-alive optimization
- PipeWire native audio capture (v2.0 roadmap item)
- Any speed optimizations beyond audio format change
- New settings or configuration options
- Changes to error handling or exit codes
- Changes to window tracking or clipboard functionality
- UI changes beyond animation and icon
- Local Whisper server M4A compatibility testing/fallback
