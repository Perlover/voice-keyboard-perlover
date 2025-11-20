#!/bin/bash
#
# Installation script for voice-keyboard-perlover
# This script installs the package with all dependencies automatically
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEB_FILE="../voice-keyboard-perlover_1.0.0-1_all.deb"

echo "======================================================================"
echo "  Voice Keyboard Perlover - Installation Script"
echo "======================================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script requires sudo privileges."
    echo "Please enter your password when prompted."
    echo ""
fi

# Check if .deb file exists
if [ ! -f "$DEB_FILE" ]; then
    echo "ERROR: Package file not found: $DEB_FILE"
    echo "Please run 'make deb' first to build the package."
    exit 1
fi

echo "Package file found: $DEB_FILE"
echo ""

# Method 1: Try using apt install (recommended)
echo "Installing package with dependencies using apt..."
echo ""

sudo apt install -y "$DEB_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================================================"
    echo "  ✓ Installation completed successfully!"
    echo "======================================================================"
    echo ""
    echo "Next steps:"
    echo "  1. Right-click on your Cinnamon panel"
    echo "  2. Select 'Applets'"
    echo "  3. Find 'Keyboard + Voice Input'"
    echo "  4. Click 'Add to panel'"
    echo ""
    echo "If the applet doesn't appear, restart Cinnamon (Ctrl+Alt+Esc)"
    echo ""
    exit 0
else
    echo ""
    echo "apt install failed, trying alternative method..."
    echo ""

    # Method 2: Install dependencies first, then dpkg
    echo "Installing dependencies..."
    sudo apt-get update
    sudo apt-get install -y cinnamon python3 python3-requests xdotool ffmpeg pulseaudio

    echo ""
    echo "Installing package..."
    sudo dpkg -i "$DEB_FILE"

    echo ""
    echo "======================================================================"
    echo "  ✓ Installation completed successfully!"
    echo "======================================================================"
    echo ""
fi
