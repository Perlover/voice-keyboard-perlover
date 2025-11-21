# Task Breakdown: Processing Animation and Speed Optimization

## Overview
Total Tasks: 20

This feature enhances visual feedback during recording and processing states with synchronized opacity+scale animations, and reduces API upload time by recording audio directly to M4A/AAC format instead of WAV.

## Files to Modify
- `/home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js` - Animation changes
- `/home/perlover/src/voice-keyboard@perlover/scripts/whisper-voice-input` - Audio format changes

## Task List

### Animation Layer

#### Task Group 1: Recording Animation Enhancement (Opacity + Scale)
**Dependencies:** None

- [x] 1.0 Complete recording animation with synchronized opacity and scale
  - [ ] 1.1 Write 4 focused tests for recording animation
    - Test that `_fadeOut()` animates both opacity (to 77) and scale (to 0.7)
    - Test that `_fadeIn()` animates both opacity (to 255) and scale (to 1.0)
    - Test that animation stops when state changes from STATE_RECORDING
    - Test that `stopRecordingAnimation()` resets scale_x and scale_y to 1.0
  - [x] 1.2 Set pivot_point for center-based scaling
    - Add `this.actor.pivot_point = new Clutter.Point({ x: 0.5, y: 0.5 });` in `startRecordingAnimation()`
    - This ensures icon scales from center, not corner
  - [x] 1.3 Modify `_fadeOut()` to include scale animation
    - Add `scale_x: 0.7` and `scale_y: 0.7` to the `ease()` call
    - Keep existing opacity: 77, duration: 1000, mode: EASE_IN_OUT_QUAD
    - Properties animate together in single `ease()` call
  - [x] 1.4 Modify `_fadeIn()` to include scale animation
    - Add `scale_x: 1.0` and `scale_y: 1.0` to the `ease()` call
    - Keep existing opacity: 255, duration: 1000, mode: EASE_IN_OUT_QUAD
  - [x] 1.5 Update `stopRecordingAnimation()` to reset scale
    - Add `this.actor.remove_transition('scale_x');`
    - Add `this.actor.remove_transition('scale_y');`
    - Add `this.actor.scale_x = 1.0;`
    - Add `this.actor.scale_y = 1.0;`
  - [ ] 1.6 Ensure recording animation tests pass
    - Run ONLY the 4 tests written in 1.1
    - Verify synchronized opacity+scale animation works
    - Do NOT run the entire test suite

**Acceptance Criteria:**
- Recording icon pulses with synchronized opacity (30%-100%) and scale (70%-100%)
- Scale animation centers on icon (not corner)
- Animation cycle remains 1 second per direction (2 seconds full cycle)
- Animation stops cleanly when state changes

---

#### Task Group 2: Processing Animation Enhancement (Opacity + Scale)
**Dependencies:** Task Group 1

- [x] 2.0 Complete processing animation with synchronized opacity and scale
  - [ ] 2.1 Write 4 focused tests for processing animation
    - Test that `_processingFadeOut()` animates opacity (to 77) and scale (to 0.7)
    - Test that `_processingFadeIn()` animates opacity (to 255) and scale (to 1.0)
    - Test that animation stops when state changes from STATE_PROCESSING
    - Test that `_cleanupLoadingDots()` resets scale_x and scale_y to 1.0
  - [x] 2.2 Change processing icon to `cloud-upload`
    - In `startProcessingAnimation()`, change `this.set_applet_icon_symbolic_name("emblem-synchronizing-symbolic")` to `this.set_applet_icon_symbolic_name("cloud-upload")`
    - System theme icon available in Papirus at `/usr/share/icons/Papirus/24x24/actions/cloud-upload.svg`
  - [x] 2.3 Create `_processingFadeOut()` method
    - Check `if (this.currentState !== STATE_PROCESSING) { return; }`
    - Set `this.actor.pivot_point = new Clutter.Point({ x: 0.5, y: 0.5 });`
    - Use `this.actor.ease()` with `opacity: 77, scale_x: 0.7, scale_y: 0.7`
    - Duration: 1000ms, mode: `Clutter.AnimationMode.EASE_IN_OUT_QUAD`
    - onComplete: `Lang.bind(this, this._processingFadeIn)`
  - [x] 2.4 Create `_processingFadeIn()` method
    - Check `if (this.currentState !== STATE_PROCESSING) { return; }`
    - Use `this.actor.ease()` with `opacity: 255, scale_x: 1.0, scale_y: 1.0`
    - Duration: 1000ms, mode: `Clutter.AnimationMode.EASE_IN_OUT_QUAD`
    - onComplete: `Lang.bind(this, this._processingFadeOut)`
  - [x] 2.5 Modify `startProcessingAnimation()` to use new animation
    - Remove `_rotateDot()` call
    - Remove `this.processingAnimation = { currentDot: 0, timeoutId: null };`
    - Add `this._processingFadeOut();` to start the animation loop
  - [x] 2.6 Update `_cleanupLoadingDots()` to clean up ease animations
    - Remove existing timeout cleanup code (no longer needed)
    - Add `this.actor.remove_transition('opacity');`
    - Add `this.actor.remove_transition('scale_x');`
    - Add `this.actor.remove_transition('scale_y');`
    - Add `this.actor.opacity = 255;`
    - Add `this.actor.scale_x = 1.0;`
    - Add `this.actor.scale_y = 1.0;`
  - [x] 2.7 Remove `_rotateDot()` method entirely
    - Delete the entire `_rotateDot()` function (lines 191-207)
    - No longer needed with Clutter ease animation
  - [ ] 2.8 Ensure processing animation tests pass
    - Run ONLY the 4 tests written in 2.1
    - Verify cloud-upload icon displays
    - Verify synchronized opacity+scale animation works
    - Do NOT run the entire test suite

**Acceptance Criteria:**
- Processing icon is `cloud-upload` (not `emblem-synchronizing-symbolic`)
- Processing icon pulses with synchronized opacity (30%-100%) and scale (70%-100%)
- Animation uses Clutter ease (not GLib.timeout_add)
- Animation stops cleanly when state changes

---

#### Task Group 3: Animation Cleanup and Idle State Reset
**Dependencies:** Task Group 1, Task Group 2

- [x] 3.0 Complete animation cleanup for state transitions
  - [ ] 3.1 Write 2 focused tests for animation cleanup
    - Test that `setIdleIcon()` resets scale_x and scale_y to 1.0
    - Test that `setState()` properly cleans up both recording and processing animations
  - [x] 3.2 Update `setIdleIcon()` to reset scale properties
    - Add `this.actor.scale_x = 1.0;`
    - Add `this.actor.scale_y = 1.0;`
    - Add after existing `this.actor.opacity = 255;`
  - [x] 3.3 Verify `setState()` calls cleanup methods
    - Confirm `stopRecordingAnimation()` is called when leaving recording state
    - Confirm `_cleanupLoadingDots()` is called when leaving processing state
    - Both already exist in current `setState()` implementation
  - [ ] 3.4 Ensure cleanup tests pass
    - Run ONLY the 2 tests written in 3.1
    - Verify icon returns to normal size on state change
    - Do NOT run the entire test suite

**Acceptance Criteria:**
- Icon returns to 100% opacity and 100% scale when entering IDLE state
- No residual animations remain after state transition
- Scale properties properly reset in all transition scenarios

---

### Audio Format Layer

#### Task Group 4: M4A/AAC Direct Recording
**Dependencies:** None (can be done in parallel with Animation Layer)

- [x] 4.0 Complete M4A/AAC direct recording implementation
  - [ ] 4.1 Write 3 focused tests for M4A recording
    - Test that ffmpeg command uses `-c:a aac -b:a 64k` codec parameters
    - Test that output file has `.m4a` extension
    - Test that 16kHz sample rate and mono channel are preserved
  - [x] 4.2 Change temporary file extension to `.m4a`
    - In `main()`, change `temp_audio = tempfile.mktemp(suffix='.wav', prefix='whisper-voice-')` to `temp_audio = tempfile.mktemp(suffix='.m4a', prefix='whisper-voice-')`
  - [x] 4.3 Update `record_audio_user_controlled()` default parameter
    - Change `output_file="/tmp/voice-input.wav"` to `output_file="/tmp/voice-input.m4a"`
  - [x] 4.4 Modify ffmpeg command for AAC encoding
    - Replace `-acodec pcm_s16le` with `-c:a aac -b:a 64k`
    - Keep `-ar 16000` (sample rate)
    - Keep `-ac 1` (mono channel)
    - Keep `-f pulse`, `-i default`, `-y` flags unchanged
    - Final command: `ffmpeg -f pulse -i default -t <duration> -c:a aac -b:a 64k -ar 16000 -ac 1 -y output.m4a`
  - [ ] 4.5 Ensure M4A recording tests pass
    - Run ONLY the 3 tests written in 4.1
    - Verify ffmpeg creates valid M4A file
    - Do NOT run the entire test suite

**Acceptance Criteria:**
- Audio records directly to M4A format (NOT WAV converted to M4A)
- File size significantly smaller than WAV (typically 10-20x smaller)
- Audio quality sufficient for transcription (64kbps AAC at 16kHz)
- Existing recording behavior unchanged (SIGTERM handling, max duration)

---

#### Task Group 5: API MIME Type Updates
**Dependencies:** Task Group 4

- [x] 5.0 Complete API MIME type updates for M4A format
  - [ ] 5.1 Write 3 focused tests for API MIME types
    - Test that `transcribe_openai()` sends `audio/m4a` MIME type
    - Test that `transcribe_local()` sends `audio/m4a` MIME type
    - Test that `transcribe_gpt4o_audio()` uses `format: "m4a"` in input_audio
  - [x] 5.2 Update `transcribe_openai()` MIME type
    - Change `'file': (os.path.basename(audio_file), f, 'audio/wav')` to `'file': (os.path.basename(audio_file), f, 'audio/m4a')`
    - Located at line 129
  - [x] 5.3 Update `transcribe_local()` MIME type
    - Change `'audio_file': (os.path.basename(audio_file), f, 'audio/wav')` to `'audio_file': (os.path.basename(audio_file), f, 'audio/m4a')`
    - Located at line 242
  - [x] 5.4 Update `transcribe_gpt4o_audio()` format parameter
    - Change `"format": "wav"` to `"format": "m4a"` in the input_audio object
    - Located at line 201
  - [ ] 5.5 Ensure API MIME type tests pass
    - Run ONLY the 3 tests written in 5.1
    - Verify API calls send correct MIME type
    - Do NOT run the entire test suite

**Acceptance Criteria:**
- OpenAI Whisper API receives `audio/m4a` MIME type
- Local Whisper server receives `audio/m4a` MIME type
- GPT-4o Audio API receives `"format": "m4a"` in input_audio object
- All transcription functions work with M4A format

---

### Integration & Testing

#### Task Group 6: Integration Testing and Gap Analysis
**Dependencies:** Task Groups 1-5

- [x] 6.0 Review and validate complete implementation
  - [x] 6.1 Review tests from Task Groups 1-5
    - Review 4 recording animation tests (Task 1.1)
    - Review 4 processing animation tests (Task 2.1)
    - Review 2 cleanup tests (Task 3.1)
    - Review 3 M4A recording tests (Task 4.1)
    - Review 3 API MIME type tests (Task 5.1)
    - Total existing tests: 16 tests
  - [x] 6.2 Perform manual integration testing
    - Test recording animation: verify opacity and scale pulse together
    - Test processing animation: verify cloud-upload icon pulses
    - Test state transitions: verify animations stop cleanly
    - Test M4A recording: verify smaller file size than WAV
    - Test OpenAI Whisper API with M4A: verify transcription works
    - Test GPT-4o Audio API with M4A: verify transcription works
    - Check `~/.xsession-errors` for any GJS errors
  - [x] 6.3 Add up to 4 additional tests if critical gaps found
    - Focus on end-to-end workflow: IDLE -> RECORDING -> PROCESSING -> IDLE
    - Test animation cleanup on ERROR state transition
    - Test M4A file cleanup in finally block
    - Only add tests for critical gaps, not exhaustive coverage
  - [x] 6.4 Run feature-specific tests
    - Run all tests from 1.1, 2.1, 3.1, 4.1, 5.1, and 6.3
    - Expected total: approximately 16-20 tests
    - Verify all feature requirements are met
    - Do NOT run unrelated application tests

**Acceptance Criteria:**
- All 16-20 feature-specific tests pass
- Recording animation shows synchronized opacity+scale pulse
- Processing animation shows cloud-upload icon with synchronized pulse
- M4A recording produces valid, smaller audio files
- Transcription works with all three API modes (Whisper-1, GPT-4o Audio, Local)
- No errors in `~/.xsession-errors` log
- State transitions clean up animations properly

---

## Execution Order

Recommended implementation sequence:

```
Task Group 1: Recording Animation (Opacity + Scale)
       |
       v
Task Group 2: Processing Animation (Opacity + Scale)
       |
       v
Task Group 3: Animation Cleanup
       |
       +---------- Task Group 4: M4A Recording (can run parallel with 1-3)
       |                  |
       v                  v
       +---------- Task Group 5: API MIME Types
       |
       v
Task Group 6: Integration Testing
```

**Notes:**
- Task Groups 1-3 (Animation) and Task Groups 4-5 (Audio Format) can be developed in parallel
- Task Group 6 must wait for all other groups to complete
- Each task group should be committed separately for easier rollback if needed

---

## Technical Reference

### GJS/Clutter Animation Pattern
```javascript
// Set pivot point for center-based scaling
this.actor.pivot_point = new Clutter.Point({ x: 0.5, y: 0.5 });

// Animate multiple properties in single ease() call
this.actor.ease({
    opacity: 77,      // 30% of 255
    scale_x: 0.7,     // 70% scale
    scale_y: 0.7,
    duration: 1000,   // 1 second
    mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
    onComplete: Lang.bind(this, this._nextAnimationStep)
});

// Clean up animations
this.actor.remove_transition('opacity');
this.actor.remove_transition('scale_x');
this.actor.remove_transition('scale_y');
this.actor.opacity = 255;
this.actor.scale_x = 1.0;
this.actor.scale_y = 1.0;
```

### ffmpeg M4A Recording Command
```bash
ffmpeg -f pulse -i default -t <duration> -c:a aac -b:a 64k -ar 16000 -ac 1 -y output.m4a
```

### API MIME Type
```python
# OpenAI Whisper
files = {'file': (filename, f, 'audio/m4a')}

# GPT-4o Audio
"input_audio": {"data": audio_base64, "format": "m4a"}
```
