# Spec Requirements: Processing Animation and Speed Optimization

## Initial Description

This feature has two parts:

### Part 1: Pulsing Animation for Processing Icon
- Currently the microphone icon pulses during RECORDING state
- The transfer/loading icon (emblem-synchronizing-symbolic / arrows up-down) appears during PROCESSING state but does NOT pulse
- Need to add pulsing animation to the processing icon to provide visual feedback during API call

### Part 2: Speed Optimization
- User reports that Android app "Dictate" at `/home/perlover/src/Android/Dictate` performs transcription much faster
- Both applications use the same Whisper API
- Need to analyze the Android app's implementation to understand why it's faster
- Goal: Identify and implement optimizations to improve transcription speed

## Requirements Discussion

### First Round Questions

**Q1:** Animation style for processing - should it match the recording animation or be different?
**Answer:** Same fade/pulse frequency as recording, BUT with added scale animation:
- When opacity increases (brighter) -> icon at original size (100%)
- When opacity decreases (dimmer) -> icon shrinks to ~70% (30% smaller)
- Both animations synchronized
- Apply the SAME scale+opacity animation to BOTH recording (microphone) AND processing (cloud-upload) icons

**Q2:** What icon should be used for the processing state?
**Answer:** Change to `cloud-upload` (system icon exists in Papirus/ePapirus themes at /usr/share/icons/Papirus/24x24/actions/cloud-upload.svg)

**Q3:** Should the audio format be changed to improve upload speed?
**Answer:** YES, implement M4A/AAC format. IMPORTANT: Must record directly to M4A, NOT convert from WAV (conversion would negate the size benefit)

**Q4:** Should model selection be modified?
**Answer:** Keep as-is, no changes

**Q5:** Should API timeout be adjusted?
**Answer:** Keep as-is (30 seconds)

**Q6:** Should HTTP connection pooling be implemented?
**Answer:** OUT OF SCOPE - user says applet is rarely used, unclear if worth it

### Existing Code to Reference

**Similar Features Identified:**
- Feature: Recording animation - Path: `applet/voice-keyboard@perlover/applet.js` (existing pulse animation code)
- Feature: Android Dictate app - Path: `/home/perlover/src/Android/Dictate` (for speed optimization analysis - referenced but not to be explored during requirements phase)

### Follow-up Questions

No follow-up questions were needed - user provided comprehensive answers.

## Visual Assets

### Files Provided:
- `cloud-upload-svgrepo-com.svg`: SVG icon showing a cloud with an upward arrow, representing the cloud upload concept. This is a reference icon from SVGRepo (800x800px viewBox, black fill). Shows cloud outline with upload arrow in center.

### Visual Insights:
- Icon represents the "upload to cloud" concept clearly
- User provided this as reference, but actual implementation will use system theme icon `cloud-upload` from Papirus theme
- System icon at `/usr/share/icons/Papirus/24x24/actions/cloud-upload.svg` should be used instead for theme consistency
- Fidelity level: Reference icon (not for direct use, just conceptual reference)

## Requirements Summary

### Functional Requirements

**Animation Enhancements:**
- Add synchronized opacity + scale animation to processing icon
- Opacity animation: 30% to 100% (existing pulse pattern)
- Scale animation: 70% to 100% (synchronized with opacity)
- Bright = full size, Dim = 70% size
- Apply same enhanced animation pattern to BOTH:
  - Recording state (microphone icon)
  - Processing state (cloud-upload icon)
- Maintain 1-second animation cycle

**Icon Change:**
- Replace processing icon from `emblem-synchronizing-symbolic` to `cloud-upload`
- Use system theme icon (verified available in Papirus/ePapirus themes)

**Audio Format Optimization:**
- Change audio recording format from WAV to M4A/AAC
- CRITICAL: Record directly to M4A format, NOT WAV-to-M4A conversion
- Use ffmpeg with: `-c:a aac -b:a 64k output.m4a`
- Reduces file size for faster API upload

### Reusability Opportunities
- Existing animation code in `applet.js` for recording pulse effect
- Animation logic can be extended with scale property
- ffmpeg command modification in `scripts/whisper-voice-input`

### Scope Boundaries

**In Scope:**
- Pulsing animation (opacity + scale) for processing icon
- Update recording animation to also include scale effect
- Change processing icon to `cloud-upload`
- Direct M4A/AAC recording via ffmpeg

**Out of Scope:**
- Model selection changes
- API timeout changes
- HTTP connection pooling
- PipeWire native audio capture (v2.0 feature per roadmap)
- Any other speed optimizations beyond audio format

### Technical Considerations

**Animation Implementation (GJS/Cinnamon):**
- Use `St` toolkit and `Clutter` for animations
- Scale transformation via `Clutter.ActorAlign` or direct scale properties
- Synchronize opacity and scale tweens
- Must follow GJS constraints (no ES6 syntax, use `Lang.bind()` for callbacks)

**Audio Recording (Python/ffmpeg):**
- Current: `ffmpeg -f pulse -i default -ar 16000 -ac 1 -t <duration> output.wav`
- New: `ffmpeg -f pulse -i default -ar 16000 -ac 1 -c:a aac -b:a 64k -t <duration> output.m4a`
- 16kHz sample rate must be maintained (Whisper optimal)
- Mono channel maintained
- Temporary files in `/tmp` still auto-deleted

**API Compatibility:**
- Verify OpenAI Whisper API accepts M4A format (it does - supports mp3, mp4, mpeg, mpga, m4a, wav, webm)
- Local Whisper servers may need verification for M4A support

**Testing Checklist (from CLAUDE.md):**
- Applet loads without errors
- Animation smooth during both recording and processing
- Voice input works with new M4A format (OpenAI mode)
- Voice input works with new M4A format (Local mode)
- File size reduction observed
- No errors in `~/.xsession-errors` log
