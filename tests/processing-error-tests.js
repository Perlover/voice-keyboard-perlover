#!/usr/bin/gjs

/**
 * PROCESSING & ERROR States Tests
 * Task Group 4.1: Write 2-8 focused tests for PROCESSING/ERROR states
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
    let errorDialogShown = false;
    let dialogClosed = false;

    return {
        currentState: 'STATE_IDLE',
        recordingAnimation: null,
        processingAnimation: null,
        loadingDots: null,
        errorMessage: null,
        errorOverlay: null,
        recordingProcess: null,
        _errorDialogShown: errorDialogShown,
        _dialogClosed: dialogClosed,
        _processingAnimationStarted: false,
        _processingAnimationStopped: false,

        // State constants
        STATE_IDLE: 'STATE_IDLE',
        STATE_RECORDING: 'STATE_RECORDING',
        STATE_PROCESSING: 'STATE_PROCESSING',
        STATE_ERROR: 'STATE_ERROR',

        // Mock icon setting
        set_applet_icon_symbolic_name: function(name) {
            this._iconName = name;
        },

        // Mock actor
        actor: {
            opacity: 255,
            add_actor: function(actor) {},
            remove_actor: function(actor) {}
        },

        // setIdleIcon function
        setIdleIcon: function() {
            this.set_applet_icon_symbolic_name("audio-input-microphone-symbolic");
            this.actor.opacity = 255;
            this.errorMessage = null;
            this.errorOverlay = null;
        },

        // startProcessingAnimation function
        startProcessingAnimation: function() {
            this._processingAnimationStarted = true;
            this.loadingDots = [];

            // Create 8 dots
            for (let i = 0; i < 8; i++) {
                this.loadingDots.push({
                    index: i,
                    brightness: i === 0 ? 'bright' : 'dim'
                });
            }

            this.processingAnimation = {
                active: true,
                currentDot: 0,
                stop: function() {
                    this.active = false;
                }
            };
        },

        // stopProcessingAnimation function
        stopProcessingAnimation: function() {
            if (this.processingAnimation) {
                this._processingAnimationStopped = true;
                this.processingAnimation.stop();
                this.processingAnimation = null;
                this.loadingDots = null;
            }
        },

        // showErrorIcon function
        showErrorIcon: function() {
            // Keep normal microphone icon, add warning triangle overlay
            this.errorOverlay = {
                type: 'warning-triangle',
                color: 'red',
                icon: 'exclamation-mark'
            };
        },

        // showErrorDialog function
        showErrorDialog: function() {
            this._errorDialogShown = true;
            // Mock dialog close event
            let self = this;
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, function() {
                self._dialogClosed = true;
                self.setState(self.STATE_IDLE);
                return false;
            });
        },

        // cancelTranscription function
        cancelTranscription: function() {
            if (this.recordingProcess && this.recordingProcess.pid) {
                this.recordingProcess = null;
            }
            this.setState(this.STATE_IDLE);
        },

        // setState function with animation cleanup
        setState: function(newState) {
            // Clean up previous state animations
            if (this.recordingAnimation) {
                this.recordingAnimation = null;
            }
            if (this.processingAnimation) {
                this.stopProcessingAnimation();
            }
            if (this.errorOverlay && newState !== this.STATE_ERROR) {
                this.errorOverlay = null;
            }

            // Update state
            this.currentState = newState;

            // Initialize new state
            switch (newState) {
                case this.STATE_IDLE:
                    this.setIdleIcon();
                    break;
                case this.STATE_RECORDING:
                    // Mock recording animation
                    break;
                case this.STATE_PROCESSING:
                    this.startProcessingAnimation();
                    break;
                case this.STATE_ERROR:
                    this.showErrorIcon();
                    break;
            }
        }
    };
}

// Test 1: PROCESSING state displays rotating dot animation
runTest("Test 1: PROCESSING state displays rotating dot animation", function() {
    let applet = createMockApplet();

    applet.setState(applet.STATE_PROCESSING);

    assertEquals(applet.currentState, 'STATE_PROCESSING', "State should be PROCESSING");
    assert(applet._processingAnimationStarted, "Processing animation should be started");
    assertNotNull(applet.processingAnimation, "Processing animation should be active");
    assertNotNull(applet.loadingDots, "Loading dots should be created");
    assertEquals(applet.loadingDots.length, 8, "Should have 8 loading dots");
});

// Test 2: Dot animation has correct structure (one bright, seven dim)
runTest("Test 2: Dot animation has correct structure (one bright, seven dim)", function() {
    let applet = createMockApplet();

    applet.setState(applet.STATE_PROCESSING);

    assertNotNull(applet.loadingDots, "Loading dots should exist");
    assertEquals(applet.loadingDots.length, 8, "Should have 8 dots");

    // Check first dot is bright
    assertEquals(applet.loadingDots[0].brightness, 'bright', "First dot should be bright");

    // Check other dots are dim
    for (let i = 1; i < 8; i++) {
        assertEquals(applet.loadingDots[i].brightness, 'dim', "Dot " + i + " should be dim");
    }
});

// Test 3: ERROR state displays warning triangle overlay
runTest("Test 3: ERROR state displays warning triangle overlay", function() {
    let applet = createMockApplet();
    applet.errorMessage = "Test error message";

    applet.setState(applet.STATE_ERROR);

    assertEquals(applet.currentState, 'STATE_ERROR', "State should be ERROR");
    assertNotNull(applet.errorOverlay, "Error overlay should be created");
    assertEquals(applet.errorOverlay.type, 'warning-triangle', "Overlay should be warning triangle");
    assertEquals(applet.errorOverlay.color, 'red', "Overlay should be red");
    assertNotNull(applet.errorMessage, "Error message should be stored");
});

// Test 4: Error dialog opens on error icon click
runTest("Test 4: Error dialog opens on error icon click", function() {
    let applet = createMockApplet();
    applet.errorMessage = "Test error message";
    applet.currentState = applet.STATE_ERROR;

    applet.showErrorDialog();

    assert(applet._errorDialogShown, "Error dialog should be shown");
});

// Test 5: Error dialog close returns to IDLE state
runTest("Test 5: Error dialog close returns to IDLE state", function() {
    let applet = createMockApplet();
    applet.errorMessage = "Test error message";
    applet.currentState = applet.STATE_ERROR;

    applet.showErrorDialog();

    // Wait for mock dialog close callback
    let mainLoop = GLib.MainLoop.new(null, false);
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, function() {
        assert(applet._dialogClosed, "Dialog close callback should be triggered");
        assertEquals(applet.currentState, 'STATE_IDLE', "State should transition to IDLE after dialog close");
        mainLoop.quit();
        return false;
    });
    mainLoop.run();
});

// Test 6: Animation cleanup when leaving PROCESSING state
runTest("Test 6: Animation cleanup when leaving PROCESSING state", function() {
    let applet = createMockApplet();

    // Start processing
    applet.setState(applet.STATE_PROCESSING);
    assertNotNull(applet.processingAnimation, "Processing animation should be active");
    assertNotNull(applet.loadingDots, "Loading dots should exist");

    // Transition to IDLE
    applet.setState(applet.STATE_IDLE);

    assert(applet._processingAnimationStopped, "Processing animation should be stopped");
    assertNull(applet.processingAnimation, "Processing animation should be cleaned up");
    assertNull(applet.loadingDots, "Loading dots should be removed");
});

// Test 7: Error overlay cleanup when leaving ERROR state
runTest("Test 7: Error overlay cleanup when leaving ERROR state", function() {
    let applet = createMockApplet();
    applet.errorMessage = "Test error";

    // Enter ERROR state
    applet.setState(applet.STATE_ERROR);
    assertNotNull(applet.errorOverlay, "Error overlay should be created");

    // Transition to IDLE
    applet.setState(applet.STATE_IDLE);

    assertNull(applet.errorOverlay, "Error overlay should be removed");
    assertNull(applet.errorMessage, "Error message should be cleared");
});

// Test 8: cancelTranscription works silently
runTest("Test 8: cancelTranscription works silently", function() {
    let applet = createMockApplet();
    applet.currentState = applet.STATE_PROCESSING;
    applet.recordingProcess = { pid: 1234 };

    applet.cancelTranscription();

    assertNull(applet.recordingProcess, "Recording process should be cleared");
    assertEquals(applet.currentState, 'STATE_IDLE', "State should return to IDLE");
});

// Print test results
print("\n========================================");
print("PROCESSING & ERROR States Test Results:");
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
