#!/usr/bin/gjs

/**
 * IDLE & RECORDING States Tests
 * Task Group 3.1: Write 2-8 focused tests for IDLE/RECORDING states
 */

const GLib = imports.gi.GLib;

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

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        print("  [FAIL] " + message + " (value is null/undefined)");
        testsFailed++;
        return false;
    }
    print("  [PASS] " + message);
    testsPassed++;
    return true;
}

function assertNull(value, message) {
    if (value !== null && value !== undefined) {
        print("  [FAIL] " + message + " (value is not null)");
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
    let iconName = '';
    let iconOpacity = 255;

    return {
        currentState: 'STATE_IDLE',
        whisperMode: 'openai',
        openaiApiKey: '',
        localUrl: '',
        recordingAnimation: null,
        processingAnimation: null,
        errorMessage: null,
        recordingProcess: null,
        _iconName: iconName,
        _iconOpacity: iconOpacity,
        _animationStarted: false,
        _animationStopped: false,

        // State constants
        STATE_IDLE: 'STATE_IDLE',
        STATE_RECORDING: 'STATE_RECORDING',
        STATE_PROCESSING: 'STATE_PROCESSING',
        STATE_ERROR: 'STATE_ERROR',

        // Mock icon setting
        set_applet_icon_symbolic_name: function(name) {
            this._iconName = name;
        },

        // Mock actor for opacity testing
        actor: {
            opacity: 255,
            ease: function(params) {
                // Mock animation - just track that it was called
                return { id: Math.random() };
            }
        },

        // setIdleIcon function
        setIdleIcon: function() {
            this.set_applet_icon_symbolic_name("audio-input-microphone-symbolic");
            this.actor.opacity = 255;
            this.errorMessage = null;
        },

        // startRecordingAnimation function
        startRecordingAnimation: function() {
            this._animationStarted = true;
            // Mock animation loop
            this.recordingAnimation = {
                active: true,
                stop: function() {
                    this.active = false;
                }
            };
        },

        // stopRecordingAnimation function
        stopRecordingAnimation: function() {
            if (this.recordingAnimation) {
                this._animationStopped = true;
                this.recordingAnimation.stop();
                this.recordingAnimation = null;
            }
        },

        // setState function with animation cleanup
        setState: function(newState) {
            // Clean up previous state animations
            if (this.recordingAnimation) {
                this.stopRecordingAnimation();
            }
            if (this.processingAnimation) {
                this.processingAnimation = null;
            }

            // Update state
            this.currentState = newState;

            // Initialize new state
            switch (newState) {
                case this.STATE_IDLE:
                    this.setIdleIcon();
                    break;
                case this.STATE_RECORDING:
                    this.startRecordingAnimation();
                    break;
                case this.STATE_PROCESSING:
                    // Will be implemented in Task Group 4
                    break;
                case this.STATE_ERROR:
                    // Will be implemented in Task Group 4
                    break;
            }
        }
    };
}

// Test 1: IDLE state displays correct icon with no animation
runTest("Test 1: IDLE state displays correct icon with no animation", function() {
    let applet = createMockApplet();

    applet.setState(applet.STATE_IDLE);

    assertEquals(applet.currentState, 'STATE_IDLE', "State should be IDLE");
    assertEquals(applet._iconName, 'audio-input-microphone-symbolic', "Icon should be normal microphone");
    assertEquals(applet.actor.opacity, 255, "Icon opacity should be 100% (255)");
    assertNull(applet.recordingAnimation, "Recording animation should not be active");
    assertNull(applet.errorMessage, "Error message should be cleared");
});

// Test 2: RECORDING state starts fade animation
runTest("Test 2: RECORDING state starts fade animation", function() {
    let applet = createMockApplet();

    applet.setState(applet.STATE_RECORDING);

    assertEquals(applet.currentState, 'STATE_RECORDING', "State should be RECORDING");
    assert(applet._animationStarted, "Animation should be started");
    assertNotNull(applet.recordingAnimation, "Recording animation should be active");
    assert(applet.recordingAnimation.active, "Animation should be marked as active");
});

// Test 3: Animation cleanup on state transition from RECORDING to IDLE
runTest("Test 3: Animation cleanup on state transition from RECORDING to IDLE", function() {
    let applet = createMockApplet();

    // Start recording
    applet.setState(applet.STATE_RECORDING);
    assertNotNull(applet.recordingAnimation, "Recording animation should be active");

    // Transition to IDLE
    applet.setState(applet.STATE_IDLE);

    assert(applet._animationStopped, "Animation should be stopped");
    assertNull(applet.recordingAnimation, "Recording animation should be cleaned up");
    assertEquals(applet.currentState, 'STATE_IDLE', "State should be IDLE");
});

// Test 4: Animation cleanup on state transition from RECORDING to PROCESSING
runTest("Test 4: Animation cleanup on state transition from RECORDING to PROCESSING", function() {
    let applet = createMockApplet();

    // Start recording
    applet.setState(applet.STATE_RECORDING);
    assertNotNull(applet.recordingAnimation, "Recording animation should be active");

    // Transition to PROCESSING
    applet.setState(applet.STATE_PROCESSING);

    assert(applet._animationStopped, "Animation should be stopped");
    assertNull(applet.recordingAnimation, "Recording animation should be cleaned up");
    assertEquals(applet.currentState, 'STATE_PROCESSING', "State should be PROCESSING");
});

// Test 5: IDLE state clears error messages
runTest("Test 5: IDLE state clears error messages", function() {
    let applet = createMockApplet();

    // Set an error message
    applet.errorMessage = "Test error";

    // Transition to IDLE
    applet.setState(applet.STATE_IDLE);

    assertNull(applet.errorMessage, "Error message should be cleared");
    assertEquals(applet._iconName, 'audio-input-microphone-symbolic', "Icon should be normal");
});

// Test 6: Multiple IDLE transitions maintain correct state
runTest("Test 6: Multiple IDLE transitions maintain correct state", function() {
    let applet = createMockApplet();

    // First IDLE transition
    applet.setState(applet.STATE_IDLE);
    assertEquals(applet.currentState, 'STATE_IDLE', "State should be IDLE");
    assertNull(applet.recordingAnimation, "No animation should be active");

    // Second IDLE transition (from IDLE)
    applet.setState(applet.STATE_IDLE);
    assertEquals(applet.currentState, 'STATE_IDLE', "State should still be IDLE");
    assertNull(applet.recordingAnimation, "No animation should be active");
});

// Test 7: Recording animation persists until state change
runTest("Test 7: Recording animation persists until state change", function() {
    let applet = createMockApplet();

    applet.setState(applet.STATE_RECORDING);

    assertNotNull(applet.recordingAnimation, "Recording animation should be active");
    assert(applet.recordingAnimation.active, "Animation should remain active");

    // Simulate time passing - animation should still be active
    assertEquals(applet.currentState, 'STATE_RECORDING', "State should still be RECORDING");
    assertNotNull(applet.recordingAnimation, "Animation should still be active");
});

// Test 8: IDLE to RECORDING to IDLE workflow
runTest("Test 8: IDLE to RECORDING to IDLE workflow", function() {
    let applet = createMockApplet();

    // Start in IDLE
    assertEquals(applet.currentState, 'STATE_IDLE', "Initial state should be IDLE");
    assertNull(applet.recordingAnimation, "No animation initially");

    // Transition to RECORDING
    applet.setState(applet.STATE_RECORDING);
    assertEquals(applet.currentState, 'STATE_RECORDING', "State should be RECORDING");
    assertNotNull(applet.recordingAnimation, "Animation should be active");

    // Return to IDLE
    applet.setState(applet.STATE_IDLE);
    assertEquals(applet.currentState, 'STATE_IDLE', "State should be IDLE");
    assertNull(applet.recordingAnimation, "Animation should be cleaned up");
    assertEquals(applet._iconName, 'audio-input-microphone-symbolic', "Icon should be reset");
    assertEquals(applet.actor.opacity, 255, "Opacity should be reset to 100%");
});

// Print test results
print("\n========================================");
print("IDLE & RECORDING States Test Results:");
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
