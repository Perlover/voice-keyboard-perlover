# Feature: Processing Animation and Speed Optimization

## Description

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

## Context
- Voice Keyboard Perlover is a Cinnamon desktop applet for voice-to-text
- Uses ffmpeg for audio recording and OpenAI Whisper API for transcription
- The Android Dictate app is a keyboard app using the same API but with faster perceived performance
