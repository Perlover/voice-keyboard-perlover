# GPT-4o Audio Model Testing Guide

This document describes how to test the new GPT-4o Audio model support.

## Changes Made

### 1. Settings Schema (`settings-schema.json`)
- Added new setting: `openai-model`
- Two options:
  - `whisper-1` (default): Fast, $0.006/minute
  - `gpt-4o-audio-preview`: Advanced, $0.06/minute

### 2. Python Script (`scripts/whisper-voice-input`)
- Updated `transcribe_openai()` to accept `model` parameter
- Added new function `transcribe_gpt4o_audio()`:
  - Uses `/v1/chat/completions` endpoint (not `/v1/audio/transcriptions`)
  - Encodes audio to base64
  - Sends as `input_audio` in messages
  - Extracts text from chat completion response
  - Timeout increased to 60 seconds (GPT-4o is slower)

### 3. Applet (`applet.js`)
- Bound new setting: `this.openaiModel`
- Added environment variable: `OPENAI_MODEL`
- Python script routes to correct function based on model

## Testing Steps

### Prerequisites
1. Have a valid OpenAI API key with GPT-4o access
2. Rebuild and reinstall the applet:
   ```bash
   make deb-clean
   make deb
   sudo apt install --reinstall ../voice-keyboard-perlover_1.0.0-1_all.deb
   ```
3. Restart Cinnamon: `Alt+F2`, type `r`, press Enter

### Test 1: Verify Settings UI
1. Right-click the applet icon → "Settings"
2. Set "Whisper mode" to "OpenAI API"
3. Verify new setting appears: "OpenAI Model"
4. Verify dropdown has two options:
   - "Whisper-1 (fast, $0.006/min)"
   - "GPT-4o Audio (advanced, $0.06/min)"
5. Verify tooltip explains the difference

### Test 2: Test Whisper-1 (Baseline)
1. In settings, select "Whisper-1" model
2. Enter your API key
3. Set language to "Auto-detect"
4. Left-click applet icon
5. Speak clearly: "This is a test of Whisper one"
6. Left-click again to stop
7. Verify text is inserted correctly
8. Check `~/.xsession-errors` for log message: "Sending to OpenAI whisper-1 API..."

### Test 3: Test GPT-4o Audio
1. In settings, select "GPT-4o Audio" model
2. Keep same API key and language
3. Left-click applet icon
4. Speak clearly: "This is a test of GPT-4o audio model"
5. Left-click again to stop
6. Verify text is inserted correctly
7. Check `~/.xsession-errors` for log message: "Sending to OpenAI GPT-4o Audio API..."

### Test 4: Test Language Selection with GPT-4o
1. In settings, select "GPT-4o Audio" model
2. Set language to "Russian"
3. Left-click applet icon
4. Speak in Russian: "Это тест модели GPT-4o"
5. Left-click again to stop
6. Verify Russian text is inserted correctly

### Test 5: Error Handling
1. Temporarily set invalid API key
2. Select "GPT-4o Audio" model
3. Try to record
4. Verify error notification appears
5. Check `~/.xsession-errors` for error message with status code 401

### Test 6: Performance Comparison
1. Record same phrase with Whisper-1
2. Note transcription time in logs
3. Record same phrase with GPT-4o Audio
4. Note transcription time in logs
5. GPT-4o should be slower but potentially more accurate

## Expected Behavior

### Whisper-1
- Fast processing (2-5 seconds typically)
- Good accuracy for clear speech
- Cost: $0.006 per minute of audio
- Uses multipart/form-data upload

### GPT-4o Audio
- Slower processing (5-10 seconds typically)
- Better accuracy for complex speech
- Better handling of context, emotion, accents
- Cost: $0.06 per minute of audio (10x more expensive)
- Uses JSON with base64-encoded audio

## Troubleshooting

### "ERROR: OpenAI API error: 400"
- Check audio format is valid WAV
- Verify API key has GPT-4o access
- Check audio file size (max 25MB)

### "ERROR: Unexpected response format"
- GPT-4o response structure may have changed
- Check `~/.xsession-errors` for full response
- May need to update `transcribe_gpt4o_audio()` function

### "ERROR: GPT-4o Audio transcription failed"
- Check network connection
- Verify API key is valid and has credits
- Check OpenAI status: https://status.openai.com/

### GPT-4o is very slow
- This is expected - GPT-4o is more complex than Whisper
- Consider using Whisper-1 for most tasks
- Use GPT-4o only when you need better quality

## Cost Comparison

For 1 hour of total recording:
- **Whisper-1**: $0.36
- **GPT-4o Audio**: $3.60 (10x more expensive)

For 1000 recordings of 10 seconds each (~2.7 hours):
- **Whisper-1**: ~$1.00
- **GPT-4o Audio**: ~$10.00

**Recommendation**: Use Whisper-1 by default, only use GPT-4o when you need the extra quality.

## API References

- **Whisper API**: https://platform.openai.com/docs/guides/speech-to-text
- **GPT-4o Audio**: https://platform.openai.com/docs/guides/audio (Preview)
- **Pricing**: https://openai.com/api/pricing/

## Notes

- GPT-4o Audio is in preview and API may change
- Model name `gpt-4o-audio-preview` may change to stable version in future
- Consider updating model name when GPT-4o Audio becomes stable
- base64 encoding increases payload size (~33% larger than raw audio)
- Timeout is 60 seconds for GPT-4o (vs 30 seconds for Whisper-1)
