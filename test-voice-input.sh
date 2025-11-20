#!/bin/bash
# Simple test script for whisper-voice-input
# This script tests the voice input without actually typing

set -e

echo "========================================"
echo "Voice Input Test Script"
echo "========================================"
echo ""

# Check dependencies
echo "Checking dependencies..."
for cmd in python3 ffmpeg xdotool; do
    if ! command -v $cmd &> /dev/null; then
        echo "ERROR: $cmd is not installed"
        exit 1
    fi
done
echo "✓ All dependencies found"
echo ""

# Check Python modules
echo "Checking Python modules..."
python3 -c "import requests" 2>/dev/null || {
    echo "ERROR: python3-requests is not installed"
    echo "Install with: sudo apt-get install python3-requests"
    exit 1
}
echo "✓ Python modules OK"
echo ""

# Test mode selection
echo "Select test mode:"
echo "1) OpenAI API (requires API key)"
echo "2) Local Whisper server (requires running server)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        read -p "Enter your OpenAI API key: " api_key
        if [ -z "$api_key" ]; then
            echo "ERROR: API key cannot be empty"
            exit 1
        fi
        export WHISPER_MODE=openai
        export OPENAI_API_KEY="$api_key"
        ;;
    2)
        echo ""
        read -p "Enter local Whisper server URL [http://localhost:9000/asr]: " server_url
        server_url=${server_url:-http://localhost:9000/asr}
        export WHISPER_MODE=local
        export WHISPER_LOCAL_URL="$server_url"

        # Test server connectivity
        echo "Testing server connectivity..."
        if ! curl -s --connect-timeout 3 "${server_url%/asr}" > /dev/null 2>&1; then
            echo "WARNING: Cannot connect to $server_url"
            echo "Make sure the server is running"
            read -p "Continue anyway? (y/n): " continue_test
            if [ "$continue_test" != "y" ]; then
                exit 1
            fi
        else
            echo "✓ Server is reachable"
        fi
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
read -p "Enter language (auto/ru/en/es/de/fr/zh/ja) [auto]: " language
language=${language:-auto}
export WHISPER_LANGUAGE="$language"

echo ""
read -p "Enter recording duration in seconds [5]: " duration
duration=${duration:-5}
export RECORDING_DURATION="$duration"

echo ""
echo "========================================"
echo "Configuration:"
echo "  Mode: $WHISPER_MODE"
echo "  Language: $WHISPER_LANGUAGE"
echo "  Duration: ${RECORDING_DURATION}s"
echo "========================================"
echo ""

echo "Starting voice input test..."
echo "This will record audio and transcribe it, but will NOT type the result."
echo ""
echo "Get ready to speak in 3 seconds..."
sleep 3

# Run the script
echo ""
echo "▶ Recording..."
./scripts/whisper-voice-input

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "✓ Test completed successfully!"
else
    echo "✗ Test failed with exit code $exit_code"
    echo "Check the error messages above"
fi

exit $exit_code
