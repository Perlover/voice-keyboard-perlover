#!/usr/bin/gjs

/**
 * Click Handler Tests
 * Task Group 2.1: Write 2-8 focused tests for click handlers
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
    let settingsOpened = false;
    let notificationShown = false;
    let notificationMessage = '';
    let recordingStarted = false;
    let recordingStopped = false;
    let transcriptionCancelled = false;
    let errorDialogShown = false;

    return {
        currentState: 'STATE_IDLE',
        whisperMode: 'openai',
        openaiApiKey: '',
        localUrl: '',
        recordingAnimation: null,
        processingAnimation: null,
        errorMessage: null,
        recordingProcess: null,
        metadata: { uuid: 'voice-keyboard@perlover' },

        // State constants
        STATE_IDLE: 'STATE_IDLE',
        STATE_RECORDING: 'STATE_RECORDING',
        STATE_PROCESSING: 'STATE_PROCESSING',
        STATE_ERROR: 'STATE_ERROR',

        // Test tracking
        _settingsOpened: settingsOpened,
        _notificationShown: notificationShown,
        _notificationMessage: notificationMessage,
        _recordingStarted: recordingStarted,
        _recordingStopped: recordingStopped,
        _transcriptionCancelled: transcriptionCancelled,
        _errorDialogShown: errorDialogShown,

        // Configuration validation function
        validateConfiguration: function() {
            if (this.whisperMode === 'openai') {
                return this.openaiApiKey && this.openaiApiKey.trim() !== '';
            } else if (this.whisperMode === 'local') {
                return this.localUrl && this.localUrl.trim() !== '';
            }
            return false;
        },

        // Mock settings dialog
        openSettingsDialog: function() {
            this._settingsOpened = true;
        },

        // Mock notification
        showNotification: function(message) {
            this._notificationShown = true;
            this._notificationMessage = message;
        },

        // Mock recording start
        startRecording: function() {
            this._recordingStarted = true;
            this.currentState = this.STATE_RECORDING;
            this.recordingProcess = { pid: 1234 };
        },

        // Mock recording stop
        stopRecording: function() {
            this._recordingStopped = true;
            this.currentState = this.STATE_PROCESSING;
        },

        // Mock transcription cancel
        cancelTranscription: function() {
            this._transcriptionCancelled = true;
            this.currentState = this.STATE_IDLE;
            this.recordingProcess = null;
        },

        // Mock error dialog
        showErrorDialog: function() {
            this._errorDialogShown = true;
        },

        // setState function
        setState: function(newState) {
            this.currentState = newState;
        },

        // handleLeftClick function (to be implemented in applet.js)
        handleLeftClick: function() {
            switch (this.currentState) {
                case this.STATE_IDLE:
                    if (!this.validateConfiguration()) {
                        this.openSettingsDialog();
                        this.showNotification('Settings are not configured');
                        return;
                    }
                    this.startRecording();
                    break;
                case this.STATE_RECORDING:
                    this.stopRecording();
                    break;
                case this.STATE_PROCESSING:
                    this.cancelTranscription();
                    break;
                case this.STATE_ERROR:
                    this.showErrorDialog();
                    break;
            }
        }
    };
}

// Test 1: Left-click in IDLE state with valid config starts recording
runTest("Test 1: Left-click in IDLE state with valid config starts recording", function() {
    let applet = createMockApplet();
    applet.openaiApiKey = 'test-api-key';
    applet.whisperMode = 'openai';
    applet.currentState = 'STATE_IDLE';

    applet.handleLeftClick();

    assert(applet._recordingStarted, "Recording should be started");
    assertEquals(applet.currentState, 'STATE_RECORDING', "State should be RECORDING");
    assert(!applet._settingsOpened, "Settings should not be opened");
});

// Test 2: Left-click in IDLE state with invalid config opens settings
runTest("Test 2: Left-click in IDLE state with invalid config opens settings", function() {
    let applet = createMockApplet();
    applet.openaiApiKey = '';
    applet.whisperMode = 'openai';
    applet.currentState = 'STATE_IDLE';

    applet.handleLeftClick();

    assert(applet._settingsOpened, "Settings should be opened");
    assert(applet._notificationShown, "Notification should be shown");
    assert(applet._notificationMessage.indexOf('not configured') !== -1, "Notification should mention configuration");
    assert(!applet._recordingStarted, "Recording should not be started");
    assertEquals(applet.currentState, 'STATE_IDLE', "State should remain IDLE");
});

// Test 3: Left-click in RECORDING state stops recording
runTest("Test 3: Left-click in RECORDING state stops recording", function() {
    let applet = createMockApplet();
    applet.currentState = 'STATE_RECORDING';
    applet.recordingProcess = { pid: 1234 };

    applet.handleLeftClick();

    assert(applet._recordingStopped, "Recording should be stopped");
    assertEquals(applet.currentState, 'STATE_PROCESSING', "State should be PROCESSING");
});

// Test 4: Left-click in PROCESSING state cancels transcription
runTest("Test 4: Left-click in PROCESSING state cancels transcription", function() {
    let applet = createMockApplet();
    applet.currentState = 'STATE_PROCESSING';
    applet.recordingProcess = { pid: 1234 };

    applet.handleLeftClick();

    assert(applet._transcriptionCancelled, "Transcription should be cancelled");
    assertEquals(applet.currentState, 'STATE_IDLE', "State should be IDLE");
    assert(applet.recordingProcess === null, "Recording process should be cleared");
});

// Test 5: Left-click in ERROR state shows error dialog
runTest("Test 5: Left-click in ERROR state shows error dialog", function() {
    let applet = createMockApplet();
    applet.currentState = 'STATE_ERROR';
    applet.errorMessage = 'Test error message';

    applet.handleLeftClick();

    assert(applet._errorDialogShown, "Error dialog should be shown");
});

// Test 6: Configuration validation prevents recording with empty OpenAI key
runTest("Test 6: Configuration validation prevents recording with empty OpenAI key", function() {
    let applet = createMockApplet();
    applet.whisperMode = 'openai';
    applet.openaiApiKey = '';

    assert(!applet.validateConfiguration(), "Configuration should be invalid");

    applet.handleLeftClick();

    assert(!applet._recordingStarted, "Recording should not start");
    assert(applet._settingsOpened, "Settings should be opened");
});

// Test 7: Configuration validation prevents recording with empty local URL
runTest("Test 7: Configuration validation prevents recording with empty local URL", function() {
    let applet = createMockApplet();
    applet.whisperMode = 'local';
    applet.localUrl = '';

    assert(!applet.validateConfiguration(), "Configuration should be invalid");

    applet.handleLeftClick();

    assert(!applet._recordingStarted, "Recording should not start");
    assert(applet._settingsOpened, "Settings should be opened");
});

// Test 8: State transitions through full workflow
runTest("Test 8: State transitions through full workflow", function() {
    let applet = createMockApplet();
    applet.openaiApiKey = 'test-api-key';
    applet.whisperMode = 'openai';

    // Start: IDLE → RECORDING
    assertEquals(applet.currentState, 'STATE_IDLE', "Initial state should be IDLE");
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_RECORDING', "State should transition to RECORDING");

    // Stop: RECORDING → PROCESSING
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_PROCESSING', "State should transition to PROCESSING");

    // Cancel: PROCESSING → IDLE
    applet.handleLeftClick();
    assertEquals(applet.currentState, 'STATE_IDLE', "State should transition back to IDLE");
});

// Print test results
print("\n========================================");
print("Click Handler Test Results:");
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
