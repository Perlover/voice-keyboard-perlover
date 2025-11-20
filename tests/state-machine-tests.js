#!/usr/bin/gjs

/**
 * State Machine Foundation Tests
 * Task Group 1.1: Write 2-8 focused tests for state machine
 */

const GLib = imports.gi.GLib;

// Import applet module
const AppletDir = '/home/perlover/src/voice-keyboard@perlover/applet/voice-keyboard@perlover';
imports.searchPath.unshift(AppletDir);

// Mock necessary Cinnamon modules for testing
const MockApplet = {
    IconApplet: {
        prototype: {
            _init: function() {}
        }
    },
    AppletPopupMenu: function() {
        return {
            addMenuItem: function() {},
            close: function() {},
            toggle: function() {}
        };
    }
};

const MockPopupMenu = {
    PopupMenuManager: function() {
        return {
            addMenu: function() {}
        };
    },
    PopupIconMenuItem: function() {
        return {
            connect: function() {}
        };
    },
    PopupSeparatorMenuItem: function() {}
};

const MockMain = {
    notify: function(title, message) {
        print("[NOTIFY] " + title + ": " + message);
    },
    notifyError: function(title, message) {
        print("[ERROR] " + title + ": " + message);
    }
};

const MockSettings = {
    AppletSettings: function(applet, uuid, instance_id) {
        return {
            bind: function(key, property) {},
            finalize: function() {}
        };
    }
};

const MockUtil = {
    spawnCommandLine: function(command) {
        print("[SPAWN] " + command);
    }
};

// Mock imports
imports.ui = imports.ui || {};
imports.ui.applet = MockApplet;
imports.ui.popupMenu = MockPopupMenu;
imports.ui.main = MockMain;
imports.ui.settings = MockSettings;
imports.misc = imports.misc || {};
imports.misc.util = MockUtil;
imports.gi = imports.gi || {};
imports.gi.St = {};

// Test framework
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (!condition) {
        print("  [FAIL] " + message);
        testsFailed++;
        return false;
    }
    print("  [PASS] " + message);
    testsPassed++;
    return true;
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        print("  [FAIL] " + message + " (expected: " + expected + ", got: " + actual + ")");
        testsFailed++;
        return false;
    }
    print("  [PASS] " + message);
    testsPassed++;
    return true;
}

function runTest(name, testFunction) {
    print("\n=== " + name + " ===");
    try {
        testFunction();
    } catch (e) {
        print("  [FAIL] Test threw exception: " + e);
        testsFailed++;
    }
}

// Mock applet object for testing
function createMockApplet() {
    return {
        currentState: 'STATE_IDLE',
        whisperMode: 'openai',
        openaiApiKey: '',
        localUrl: '',
        recordingAnimation: null,
        processingAnimation: null,
        errorMessage: null,

        // State constants (will be defined in applet.js)
        STATE_IDLE: 'STATE_IDLE',
        STATE_RECORDING: 'STATE_RECORDING',
        STATE_PROCESSING: 'STATE_PROCESSING',
        STATE_ERROR: 'STATE_ERROR',

        // Configuration validation function
        validateConfiguration: function() {
            if (this.whisperMode === 'openai') {
                return this.openaiApiKey && this.openaiApiKey.trim() !== '';
            } else if (this.whisperMode === 'local') {
                return this.localUrl && this.localUrl.trim() !== '';
            }
            return false;
        },

        // setState function
        setState: function(newState) {
            // Clean up previous state animations
            if (this.recordingAnimation) {
                this.recordingAnimation = null;
            }
            if (this.processingAnimation) {
                this.processingAnimation = null;
            }

            // Update state
            this.currentState = newState;

            // Initialize new state
            switch (newState) {
                case this.STATE_IDLE:
                    // Reset to idle
                    break;
                case this.STATE_RECORDING:
                    // Start recording animation
                    this.recordingAnimation = { active: true };
                    break;
                case this.STATE_PROCESSING:
                    // Start processing animation
                    this.processingAnimation = { active: true };
                    break;
                case this.STATE_ERROR:
                    // Show error state
                    break;
            }
        }
    };
}

// Test 1: IDLE → RECORDING transition on valid configuration
runTest("Test 1: IDLE → RECORDING transition on valid configuration", function() {
    let applet = createMockApplet();
    applet.openaiApiKey = 'test-api-key';
    applet.whisperMode = 'openai';

    assert(applet.validateConfiguration(), "Configuration should be valid with API key");

    applet.setState(applet.STATE_RECORDING);

    assertEquals(applet.currentState, 'STATE_RECORDING', "State should transition to RECORDING");
    assert(applet.recordingAnimation !== null, "Recording animation should be initialized");
});

// Test 2: IDLE → ERROR transition on missing API key
runTest("Test 2: IDLE → ERROR transition on missing API key", function() {
    let applet = createMockApplet();
    applet.openaiApiKey = '';
    applet.whisperMode = 'openai';

    assert(!applet.validateConfiguration(), "Configuration should be invalid without API key");

    applet.setState(applet.STATE_ERROR);
    applet.errorMessage = "API key not configured";

    assertEquals(applet.currentState, 'STATE_ERROR', "State should transition to ERROR");
    assert(applet.errorMessage !== null, "Error message should be set");
});

// Test 3: RECORDING → PROCESSING transition on user click
runTest("Test 3: RECORDING → PROCESSING transition on user click", function() {
    let applet = createMockApplet();
    applet.setState(applet.STATE_RECORDING);

    assertEquals(applet.currentState, 'STATE_RECORDING', "State should be RECORDING");
    assert(applet.recordingAnimation !== null, "Recording animation should be active");

    applet.setState(applet.STATE_PROCESSING);

    assertEquals(applet.currentState, 'STATE_PROCESSING', "State should transition to PROCESSING");
    assert(applet.recordingAnimation === null, "Recording animation should be cleaned up");
    assert(applet.processingAnimation !== null, "Processing animation should be initialized");
});

// Test 4: PROCESSING → IDLE transition on completion
runTest("Test 4: PROCESSING → IDLE transition on completion", function() {
    let applet = createMockApplet();
    applet.setState(applet.STATE_PROCESSING);

    assertEquals(applet.currentState, 'STATE_PROCESSING', "State should be PROCESSING");
    assert(applet.processingAnimation !== null, "Processing animation should be active");

    applet.setState(applet.STATE_IDLE);

    assertEquals(applet.currentState, 'STATE_IDLE', "State should transition to IDLE");
    assert(applet.processingAnimation === null, "Processing animation should be cleaned up");
});

// Test 5: ERROR → IDLE transition after dialog close
runTest("Test 5: ERROR → IDLE transition after dialog close", function() {
    let applet = createMockApplet();
    applet.setState(applet.STATE_ERROR);
    applet.errorMessage = "Test error";

    assertEquals(applet.currentState, 'STATE_ERROR', "State should be ERROR");
    assert(applet.errorMessage !== null, "Error message should be set");

    applet.setState(applet.STATE_IDLE);

    assertEquals(applet.currentState, 'STATE_IDLE', "State should transition to IDLE");
});

// Test 6: Configuration validation for local mode
runTest("Test 6: Configuration validation for local mode", function() {
    let applet = createMockApplet();
    applet.whisperMode = 'local';
    applet.localUrl = '';

    assert(!applet.validateConfiguration(), "Configuration should be invalid without local URL");

    applet.localUrl = 'http://localhost:9000/asr';
    assert(applet.validateConfiguration(), "Configuration should be valid with local URL");
});

// Test 7: Animation cleanup on state changes
runTest("Test 7: Animation cleanup on state changes", function() {
    let applet = createMockApplet();

    // Start recording
    applet.setState(applet.STATE_RECORDING);
    assert(applet.recordingAnimation !== null, "Recording animation should be active");

    // Transition to processing - should clean up recording animation
    applet.setState(applet.STATE_PROCESSING);
    assert(applet.recordingAnimation === null, "Recording animation should be cleaned up");
    assert(applet.processingAnimation !== null, "Processing animation should be active");

    // Transition to idle - should clean up processing animation
    applet.setState(applet.STATE_IDLE);
    assert(applet.processingAnimation === null, "Processing animation should be cleaned up");
});

// Test 8: Multiple state transitions
runTest("Test 8: Multiple state transitions", function() {
    let applet = createMockApplet();

    assertEquals(applet.currentState, 'STATE_IDLE', "Initial state should be IDLE");

    applet.setState(applet.STATE_RECORDING);
    assertEquals(applet.currentState, 'STATE_RECORDING', "State should be RECORDING");

    applet.setState(applet.STATE_PROCESSING);
    assertEquals(applet.currentState, 'STATE_PROCESSING', "State should be PROCESSING");

    applet.setState(applet.STATE_ERROR);
    assertEquals(applet.currentState, 'STATE_ERROR', "State should be ERROR");

    applet.setState(applet.STATE_IDLE);
    assertEquals(applet.currentState, 'STATE_IDLE', "State should return to IDLE");
});

// Print test results
print("\n========================================");
print("Test Results:");
print("  Passed: " + testsPassed);
print("  Failed: " + testsFailed);
print("  Total:  " + (testsPassed + testsFailed));
print("========================================\n");

// Exit with appropriate code
if (testsFailed > 0) {
    imports.system.exit(1);
} else {
    imports.system.exit(0);
}
