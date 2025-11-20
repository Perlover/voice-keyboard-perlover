#!/usr/bin/gjs

/**
 * Integration Tests for Click-to-Toggle Feature
 * Task Group 6.5: Write up to 10 strategic integration tests
 *
 * These tests focus on complete end-to-end workflows and critical user scenarios
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

// Mock applet object for integration testing
function createIntegrationMockApplet() {
    let notifications = [];
    let settingsOpened = false;

    return {
        currentState: 'STATE_IDLE',
        whisperMode: 'openai',
        openaiApiKey: '',
        localUrl: '',
        recordingAnimation: null,
        processingAnimation: null,
        loadingDots: null,
        errorMessage: null,
        errorOverlay: null,
        recordingProcess: null,
        _notifications: notifications,
        _settingsOpened: settingsOpened,

        // State constants
        STATE_IDLE: 'STATE_IDLE',
        STATE_RECORDING: 'STATE_RECORDING',
        STATE_PROCESSING: 'STATE_PROCESSING',
        STATE_ERROR: 'STATE_ERROR',

        // Configuration validation
        validateConfiguration: function() {
            if (this.whisperMode === 'openai') {
                return this.openaiApiKey && this.openaiApiKey.trim() !== '';
            } else if (this.whisperMode === 'local') {
                return this.localUrl && this.localUrl.trim() !== '';
            }
            return false;
        },

        // Mock notifications
        notify: function(title, message) {
            this._notifications.push({ title: title, message: message });
        },

        // Mock settings dialog
        openSettings: function() {
            this._settingsOpened = true;
        },

        // Full state machine implementation
        setState: function(newState) {
            // Clean up previous state
            if (this.recordingAnimation) {
                this.recordingAnimation = null;
            }
            if (this.processingAnimation) {
                this.processingAnimation = null;
                this.loadingDots = null;
            }
            if (this.errorOverlay && newState !== this.STATE_ERROR) {
                this.errorOverlay = null;
            }
            if (newState === this.STATE_IDLE) {
                this.errorMessage = null;
            }

            // Update state
            this.currentState = newState;

            // Initialize new state
            switch (newState) {
                case this.STATE_IDLE:
                    // Reset to idle
                    break;
                case this.STATE_RECORDING:
                    this.recordingAnimation = { active: true };
                    break;
                case this.STATE_PROCESSING:
                    this.loadingDots = [];
                    for (let i = 0; i < 8; i++) {
                        this.loadingDots.push({ index: i });
                    }
                    this.processingAnimation = { active: true };
                    break;
                case this.STATE_ERROR:
                    this.errorOverlay = { type: 'warning' };
                    break;
            }
        },

        // Start recording
        startRecording: function() {
            if (!this.validateConfiguration()) {
                this.notify("Voice Keyboard Perlover", "Settings are not configured");
                this.openSettings();
                return;
            }
            this.setState(this.STATE_RECORDING);
            this.recordingProcess = { pid: 1234 };
        },

        // Stop recording
        stopRecording: function() {
            this.setState(this.STATE_PROCESSING);
        },

        // Cancel transcription
        cancelTranscription: function() {
            if (this.recordingProcess) {
                this.recordingProcess = null;
            }
            this.setState(this.STATE_IDLE);
        },

        // Simulate transcription completion
        simulateSuccess: function() {
            this.recordingProcess = null;
            this.setState(this.STATE_IDLE);
        },

        // Simulate transcription error
        simulateError: function(errorMsg) {
            this.errorMessage = errorMsg;
            this.notify("Voice Keyboard Perlover", "Transcription failed");
            this.setState(this.STATE_ERROR);
        },

        // Simulate maximum duration reached
        simulateMaxDuration: function() {
            this.notify("Voice Keyboard Perlover", "Maximum recording time reached");
            this.setState(this.STATE_PROCESSING);
        },

        // Simulate window change
        simulateWindowChange: function(text) {
            this.notify("Voice Keyboard Perlover", "Window changed - text copied to clipboard:\n" + text);
            this.setState(this.STATE_IDLE);
        },

        // Handle left click
        handleLeftClick: function() {
            switch (this.currentState) {
                case this.STATE_IDLE:
                    this.startRecording();
                    break;
                case this.STATE_RECORDING:
                    this.stopRecording();
                    break;
                case this.STATE_PROCESSING:
                    this.cancelTranscription();
                    break;
                case this.STATE_ERROR:
                    // Show error dialog (simplified for testing)
                    this.setState(this.STATE_IDLE);
                    break;
            }
        }
    };
}

// Integration Test 1: Complete happy path workflow (IDLE → RECORDING → PROCESSING → IDLE)
runTest("Integration Test 1: Complete happy path workflow", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = 'test-key';

    // Start: IDLE
    assertEquals(applet.currentState, 'STATE_IDLE', "Should start in IDLE");
    assertNull(applet.recordingAnimation, "No animation initially");

    // Click to start recording: IDLE → RECORDING
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_RECORDING', "Should transition to RECORDING");
    assertNotNull(applet.recordingAnimation, "Recording animation should be active");
    assertNotNull(applet.recordingProcess, "Recording process should be started");

    // Click to stop recording: RECORDING → PROCESSING
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_PROCESSING', "Should transition to PROCESSING");
    assertNull(applet.recordingAnimation, "Recording animation should be cleaned up");
    assertNotNull(applet.processingAnimation, "Processing animation should be active");
    assertEquals(applet.loadingDots.length, 8, "Should have 8 loading dots");

    // Simulate successful transcription: PROCESSING → IDLE
    applet.simulateSuccess();
    assertEquals(applet.currentState, 'STATE_IDLE', "Should return to IDLE");
    assertNull(applet.processingAnimation, "Processing animation should be cleaned up");
    assertNull(applet.recordingProcess, "Recording process should be cleared");

    // Verify NO informational notifications were shown
    assertEquals(applet._notifications.length, 0, "No notifications should be shown for successful workflow");
});

// Integration Test 2: Configuration error workflow
runTest("Integration Test 2: Configuration error workflow", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = '';  // No API key configured

    // Click to start recording without configuration
    applet.handleLeftClick();

    // Should remain in IDLE state
    assertEquals(applet.currentState, 'STATE_IDLE', "Should remain in IDLE");
    assertNull(applet.recordingProcess, "Recording should not start");

    // Should open settings
    assert(applet._settingsOpened, "Settings should be opened");

    // Should show notification
    assertEquals(applet._notifications.length, 1, "Should show one notification");
    assert(applet._notifications[0].message.indexOf('not configured') !== -1,
           "Notification should mention configuration error");
});

// Integration Test 3: API error recovery workflow (PROCESSING → ERROR → IDLE)
runTest("Integration Test 3: API error recovery workflow", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = 'test-key';

    // Start recording
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_RECORDING', "Should be RECORDING");

    // Stop recording
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_PROCESSING', "Should be PROCESSING");

    // Simulate API error
    applet.simulateError("API request failed");

    // Should transition to ERROR state
    assertEquals(applet.currentState, 'STATE_ERROR', "Should transition to ERROR");
    assertNotNull(applet.errorOverlay, "Error overlay should be shown");
    assertNotNull(applet.errorMessage, "Error message should be stored");

    // Should show error notification
    assert(applet._notifications.some(function(n) {
        return n.message.indexOf('failed') !== -1;
    }), "Should show error notification");

    // Click error icon to view details and return to IDLE
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_IDLE', "Should return to IDLE after error dialog close");
    assertNull(applet.errorOverlay, "Error overlay should be removed");
    assertNull(applet.errorMessage, "Error message should be cleared");
});

// Integration Test 4: User cancellation during processing
runTest("Integration Test 4: User cancellation during processing", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = 'test-key';

    // Start recording
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_RECORDING', "Should be RECORDING");

    // Stop recording
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_PROCESSING', "Should be PROCESSING");
    assertNotNull(applet.processingAnimation, "Processing animation should be active");

    // Cancel transcription by clicking again
    applet.handleLeftClick();

    // Should return to IDLE silently (no notification)
    assertEquals(applet.currentState, 'STATE_IDLE', "Should return to IDLE");
    assertNull(applet.processingAnimation, "Processing animation should be cleaned up");
    assertNull(applet.recordingProcess, "Recording process should be cleared");
    assertEquals(applet._notifications.length, 0, "No notification should be shown for cancellation");
});

// Integration Test 5: Window change detection end-to-end
runTest("Integration Test 5: Window change detection end-to-end", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = 'test-key';

    // Complete recording workflow
    applet.handleLeftClick();  // IDLE → RECORDING
    applet.handleLeftClick();  // RECORDING → PROCESSING

    // Simulate window change after transcription
    applet.simulateWindowChange("Hello world");

    // Should return to IDLE
    assertEquals(applet.currentState, 'STATE_IDLE', "Should return to IDLE");

    // Should show notification with recognized text
    assertEquals(applet._notifications.length, 1, "Should show one notification");
    assert(applet._notifications[0].message.indexOf('Window changed') !== -1,
           "Notification should mention window change");
    assert(applet._notifications[0].message.indexOf('Hello world') !== -1,
           "Notification should include recognized text");
});

// Integration Test 6: Maximum duration auto-stop and notification
runTest("Integration Test 6: Maximum duration auto-stop and notification", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = 'test-key';

    // Start recording
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_RECORDING', "Should be RECORDING");

    // Simulate maximum duration reached
    applet.simulateMaxDuration();

    // Should transition to PROCESSING
    assertEquals(applet.currentState, 'STATE_PROCESSING', "Should transition to PROCESSING");

    // Should show notification
    assertEquals(applet._notifications.length, 1, "Should show one notification");
    assert(applet._notifications[0].message.indexOf('Maximum recording time') !== -1,
           "Notification should mention maximum recording time");

    // Complete transcription
    applet.simulateSuccess();
    assertEquals(applet.currentState, 'STATE_IDLE', "Should return to IDLE");
});

// Integration Test 7: Multiple rapid state transitions
runTest("Integration Test 7: Multiple rapid state transitions", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = 'test-key';

    // Rapid click sequence: IDLE → RECORDING → PROCESSING → IDLE
    assertEquals(applet.currentState, 'STATE_IDLE', "Start in IDLE");

    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_RECORDING', "Transition to RECORDING");

    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_PROCESSING', "Transition to PROCESSING");

    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_IDLE', "Return to IDLE");

    // All animations should be cleaned up
    assertNull(applet.recordingAnimation, "Recording animation cleaned up");
    assertNull(applet.processingAnimation, "Processing animation cleaned up");
    assertNull(applet.loadingDots, "Loading dots cleaned up");
});

// Integration Test 8: Error state to IDLE via dialog close
runTest("Integration Test 8: Error state recovery via dialog", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = 'test-key';

    // Trigger error
    applet.errorMessage = "Network error";
    applet.setState(applet.STATE_ERROR);

    assertEquals(applet.currentState, 'STATE_ERROR', "Should be in ERROR state");
    assertNotNull(applet.errorOverlay, "Error overlay should be visible");

    // Click to show dialog and close
    applet.handleLeftClick();

    // Should return to IDLE
    assertEquals(applet.currentState, 'STATE_IDLE', "Should return to IDLE");
    assertNull(applet.errorOverlay, "Error overlay should be removed");
    assertNull(applet.errorMessage, "Error message should be cleared");
});

// Integration Test 9: Recording with local mode configuration
runTest("Integration Test 9: Local mode configuration workflow", function() {
    let applet = createIntegrationMockApplet();
    applet.whisperMode = 'local';
    applet.localUrl = '';

    // Should fail validation without local URL
    assert(!applet.validateConfiguration(), "Configuration should be invalid");

    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_IDLE', "Should remain in IDLE");
    assert(applet._settingsOpened, "Settings should be opened");

    // Configure local URL
    applet.localUrl = 'http://localhost:9000/asr';
    assert(applet.validateConfiguration(), "Configuration should be valid");

    // Should now allow recording
    applet._settingsOpened = false;
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_RECORDING', "Should start recording");
});

// Integration Test 10: Animation persistence and cleanup across all states
runTest("Integration Test 10: Animation lifecycle across all states", function() {
    let applet = createIntegrationMockApplet();
    applet.openaiApiKey = 'test-key';

    // IDLE: No animations
    assertEquals(applet.currentState, 'STATE_IDLE', "Start in IDLE");
    assertNull(applet.recordingAnimation, "No recording animation");
    assertNull(applet.processingAnimation, "No processing animation");

    // RECORDING: Recording animation active
    applet.handleLeftClick();
    assertNotNull(applet.recordingAnimation, "Recording animation active");
    assertNull(applet.processingAnimation, "No processing animation");

    // PROCESSING: Processing animation active, recording cleaned up
    applet.handleLeftClick();
    assertNull(applet.recordingAnimation, "Recording animation cleaned up");
    assertNotNull(applet.processingAnimation, "Processing animation active");
    assertNotNull(applet.loadingDots, "Loading dots created");

    // ERROR: All animations cleaned up, error overlay shown
    applet.simulateError("Test error");
    assertNull(applet.recordingAnimation, "Recording animation cleaned up");
    assertNull(applet.processingAnimation, "Processing animation cleaned up");
    assertNull(applet.loadingDots, "Loading dots cleaned up");
    assertNotNull(applet.errorOverlay, "Error overlay shown");

    // IDLE: Everything cleaned up
    applet.handleLeftClick();
    assertNull(applet.recordingAnimation, "Recording animation cleaned up");
    assertNull(applet.processingAnimation, "Processing animation cleaned up");
    assertNull(applet.loadingDots, "Loading dots cleaned up");
    assertNull(applet.errorOverlay, "Error overlay cleaned up");
    assertNull(applet.errorMessage, "Error message cleared");
});

// Print test results
print("\n========================================");
print("Integration Test Results:");
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
