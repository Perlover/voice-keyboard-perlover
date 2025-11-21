#!/bin/bash
# Deploy and Test Script for Click-to-Toggle Bugfixes
# Part of Task Group 2: Test and Verify Fixes

set -e  # Exit on error

echo "========================================"
echo "Voice Keyboard: Deploy Fixed Applet"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SOURCE_FILE="/home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover/applet.js"
TARGET_FILE="/usr/share/cinnamon/applets/voice-keyboard@perlover/applet.js"

echo "Step 1: Verify source file exists and contains fixes..."
if [ ! -f "$SOURCE_FILE" ]; then
    echo -e "${RED}ERROR: Source file not found: $SOURCE_FILE${NC}"
    exit 1
fi

# Check for Fix 1: Event handler connection
if grep -q "button-press-event.*Lang.bind.*_onButtonPressEvent" "$SOURCE_FILE"; then
    echo -e "${GREEN}✓ Fix 1 verified: Event handler connection present (line 81)${NC}"
else
    echo -e "${RED}✗ Fix 1 missing: Event handler connection not found${NC}"
    exit 1
fi

# Check for Fix 2: EVENT_PROPAGATE constant
if grep -q "return Clutter.EVENT_PROPAGATE" "$SOURCE_FILE"; then
    echo -e "${GREEN}✓ Fix 2 verified: EVENT_PROPAGATE constant present (line 650)${NC}"
else
    echo -e "${RED}✗ Fix 2 missing: EVENT_PROPAGATE not found${NC}"
    exit 1
fi

echo ""
echo "Step 2: Deploy fixed applet to system location..."
echo -e "${YELLOW}This requires sudo password...${NC}"
sudo cp "$SOURCE_FILE" "$TARGET_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Applet deployed successfully${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

echo ""
echo "Step 3: Verify deployment..."
if grep -q "return Clutter.EVENT_PROPAGATE" "$TARGET_FILE"; then
    echo -e "${GREEN}✓ Deployed file contains fixes${NC}"
else
    echo -e "${RED}✗ Deployed file missing fixes${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Restart Cinnamon:"
echo "   - Press Alt+F2"
echo "   - Type 'r' (lowercase)"
echo "   - Press Enter"
echo ""
echo "2. Follow the testing guide:"
echo "   - Open: agent-os/specs/2025-11-21-fix-click-to-toggle-bugs/TESTING_GUIDE.md"
echo "   - Complete all tests in sections 2.2, 2.3, and 2.4"
echo ""
echo "3. Expected Results:"
echo "   - Left-click: Starts fade animation (recording)"
echo "   - Second left-click: Shows dot animation (processing)"
echo "   - Right-click: Opens settings menu"
echo ""
echo -e "${YELLOW}Remember to restart Cinnamon before testing!${NC}"
echo ""
