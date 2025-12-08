const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Main = imports.ui.main;
const Settings = imports.ui.settings;
const Util = imports.misc.util;
const Clutter = imports.gi.Clutter;
const ModalDialog = imports.ui.modalDialog;
const Mainloop = imports.mainloop;

// State constants
const STATE_IDLE = 'STATE_IDLE';
const STATE_RECORDING = 'STATE_RECORDING';
const STATE_PROCESSING = 'STATE_PROCESSING';
const STATE_ERROR = 'STATE_ERROR';

// Exit codes from Python script
const EXIT_SUCCESS = 0;
const EXIT_CONFIG_ERROR = 1;
const EXIT_RECORDING_ERROR = 2;
const EXIT_TRANSCRIPTION_ERROR = 3;
const EXIT_CANCELLED = 4;
const EXIT_TIMEOUT = 5;

// Watchdog timeout for STATE_PROCESSING (60 seconds)
// This is a safety net in case Python script hangs
const PROCESSING_WATCHDOG_MS = 60000;

function VoiceKeyboardApplet(metadata, orientation, panel_height, instance_id) {
    this._init(metadata, orientation, panel_height, instance_id);
}

VoiceKeyboardApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instance_id) {
        Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

        this.metadata = metadata;
        this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);

        // Initialize state machine
        this.currentState = STATE_IDLE;
        this.recordingAnimation = null;
        this.processingAnimation = null;
        this.errorMessage = null;
        this.recordingProcess = null;
        this.errorOverlay = null;

        // Bind settings
        this.settings.bind("whisper-mode", "whisperMode");
        this.settings.bind("openai-api-key", "openaiApiKey");
        this.settings.bind("openai-model", "openaiModel");
        this.settings.bind("local-url", "localUrl");
        this.settings.bind("language", "language");
        this.settings.bind("recording-duration", "recordingDuration");
        this.settings.bind("script-path", "scriptPath");

        // Set icon
        this.set_applet_icon_symbolic_name("audio-input-microphone-symbolic");

        // Task 2.5: Update tooltip to reflect new click behavior
        this.set_applet_tooltip(_("Voice Keyboard - Left-click to start/stop recording, Right-click for settings"));

        // Create menu
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        // Task 2.5: Remove "Start Voice Input" menu item and separator
        // Only keep Settings menu item
        let settingsItem = new PopupMenu.PopupIconMenuItem(
            _("Settings"),
            "preferences-system-symbolic",
            St.IconType.SYMBOLIC
        );
        settingsItem.connect('activate', Lang.bind(this, function() {
            Util.spawnCommandLine("cinnamon-settings applets " + metadata.uuid);
        }));
        this.menu.addMenuItem(settingsItem);

        // Connect button press event handler for right-click menu
        this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));
    },

    /**
     * Validate configuration before starting recording
     * Task 1.4: Configuration validation function
     */
    validateConfiguration: function() {
        if (this.whisperMode === 'openai') {
            return this.openaiApiKey && this.openaiApiKey.trim() !== '';
        } else if (this.whisperMode === 'local') {
            return this.localUrl && this.localUrl.trim() !== '';
        }
        return false;
    },

    /**
     * Task 3.2: Implement setIdleIcon() function
     * Set IDLE state icon and clear any animations/errors
     * Note: Scale animations removed to prevent Cinnamon HotCorner layout conflicts
     */
    setIdleIcon: function() {
        this.set_applet_icon_symbolic_name("audio-input-microphone-symbolic");
        this.actor.opacity = 255;
        this.errorMessage = null;

        // Reset icon style (remove red color from error state)
        // Use null instead of empty string to avoid St-CRITICAL cr_parser errors
        let iconChild = this.actor.get_first_child();
        if (iconChild && iconChild.set_style) {
            iconChild.set_style(null);
        }
    },

    /**
     * Start recording animation using GLib.timeout_add
     * This is GC-safe unlike this.actor.ease() which can crash during GC sweep
     */
    startRecordingAnimation: function() {
        // Animation state: 0-19 = fade out, 20-39 = fade in (50ms * 40 = 2 sec cycle)
        this._recordingAnimStep = 0;

        // Mark animation as active
        this.recordingAnimation = true;

        // Start animation loop with GLib.timeout_add at DEFAULT priority
        this._recordingTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, Lang.bind(this, this._animateRecordingStep));
    },

    /**
     * Single recording animation step - called every 50ms
     * Returns GLib.SOURCE_CONTINUE to keep running
     * GC-safe implementation using timeout instead of ease()
     */
    _animateRecordingStep: function() {
        try {
            // Check if still in recording state
            if (this.currentState !== STATE_RECORDING) {
                this._recordingTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            }

            // Calculate opacity based on step (0-39)
            // 40 steps * 50ms = 2 second full cycle
            let opacity;
            if (this._recordingAnimStep < 20) {
                // Fade out: steps 0-19
                let t = this._recordingAnimStep / 20.0; // 0 to 1
                opacity = 255 - (178 * t); // 255 to 77
            } else {
                // Fade in: steps 20-39
                let t = (this._recordingAnimStep - 20) / 20.0; // 0 to 1
                opacity = 77 + (178 * t);  // 77 to 255
            }

            this.actor.opacity = Math.round(opacity);

            // Advance step
            this._recordingAnimStep = (this._recordingAnimStep + 1) % 40;

            return GLib.SOURCE_CONTINUE;
        } catch (e) {
            global.logError("[voice-keyboard] Recording animation error: " + e);
            return GLib.SOURCE_REMOVE;
        }
    },

    /**
     * Stop recording animation and clean up timeout
     * GC-safe cleanup using GLib.source_remove
     */
    stopRecordingAnimation: function() {
        if (this._recordingTimeoutId) {
            GLib.source_remove(this._recordingTimeoutId);
            this._recordingTimeoutId = null;
        }
        this.recordingAnimation = null;
        // Reset opacity to full
        this.actor.opacity = 255;
    },

    /**
     * Task 4.2: Create 8-dot circular loading indicator component
     * Task 4.3: Implement startProcessingAnimation() function
     * Task 2.2: Change icon to cloud-upload
     * Task 2.5: Use new ease-based animation
     */
    startProcessingAnimation: function() {
        // Clean up existing animation if any
        this._cleanupLoadingDots();

        // Task 2.2: Change icon to send-to-symbolic (upload arrow)
        this.set_applet_icon_symbolic_name("send-to-symbolic");

        // Mark animation as active
        this.processingAnimation = true;

        // Task 2.5: Start the processing timeline animation
        this._startProcessingTimeline();
    },

    /**
     * Task 2.3: Processing animation using Mainloop.timeout_add
     * Simple step-based animation with 100ms intervals
     * Note: Scale animations removed to prevent Cinnamon HotCorner layout conflicts
     */
    _startProcessingTimeline: function() {
        // Check if still in processing state
        if (this.currentState !== STATE_PROCESSING) {
            return;
        }

        // Animation state: 0-19 = fade out, 20-39 = fade in (100ms * 40 = 4 sec cycle)
        this._animStep = 0;
        this._lastLogTime = 0;

        // Start animation loop with GLib.timeout_add at DEFAULT priority
        // Using DEFAULT instead of HIGH to avoid conflicts with Expo/Scale workspace animations
        this._processingTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, Lang.bind(this, this._animateProcessingStep));
    },

    /**
     * Single animation step - called every 100ms
     * Returns GLib.SOURCE_CONTINUE to keep running
     * Note: Scale animations removed to prevent Cinnamon HotCorner layout conflicts
     */
    _animateProcessingStep: function() {
        try {
            // Check if still in processing state
            if (this.currentState !== STATE_PROCESSING) {
                this._processingTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            }

            // Calculate opacity based on step (0-39)
            // Opacity-only animation to prevent layout thrashing
            let opacity;
            if (this._animStep < 20) {
                // Fade out: steps 0-19
                let t = this._animStep / 20.0; // 0 to 1
                opacity = 255 - (178 * t); // 255 to 77
            } else {
                // Fade in: steps 20-39
                let t = (this._animStep - 20) / 20.0; // 0 to 1
                opacity = 77 + (178 * t);  // 77 to 255
            }

            this.actor.opacity = Math.round(opacity);

            // Advance step
            this._animStep = (this._animStep + 1) % 40;

            return GLib.SOURCE_CONTINUE;
        } catch (e) {
            global.logError("[voice-keyboard] Animation error: " + e);
            return GLib.SOURCE_REMOVE;
        }
    },

    /**
     * Task 2.4: Stop processing animation
     */
    _stopProcessingTimeline: function() {
        if (this._processingTimeoutId) {
            GLib.source_remove(this._processingTimeoutId);
            this._processingTimeoutId = null;
        }
    },

    /**
     * Clean up processing animation
     * GC-safe - only uses GLib.source_remove, no ease() transitions
     */
    _cleanupLoadingDots: function() {
        // Stop timeline if running
        this._stopProcessingTimeline();

        // Clear watchdog timer
        this._clearProcessingWatchdog();

        // Reset opacity to default
        this.actor.opacity = 255;
    },

    /**
     * Task 4.4: Implement showErrorIcon() function
     * Replace microphone icon with red warning triangle
     * Note: Scale animations removed to prevent Cinnamon HotCorner layout conflicts
     */
    showErrorIcon: function() {
        // Remove any existing error overlay (cleanup from previous errors)
        if (this.errorOverlay) {
            this.actor.remove_actor(this.errorOverlay);
            this.errorOverlay.destroy();
            this.errorOverlay = null;
        }

        // Replace microphone icon with red warning triangle
        this.set_applet_icon_symbolic_name("dialog-warning-symbolic");
        this.actor.opacity = 255;

        // Apply red color to the icon using style
        let iconChild = this.actor.get_first_child();
        if (iconChild && iconChild.set_style) {
            iconChild.set_style('color: #ff4444;');
        }
    },

    /**
     * Task 4.5: Implement showErrorDialog() function
     * Show modal dialog with error details
     */
    showErrorDialog: function() {
        let dialog = new ModalDialog.ModalDialog();

        let contentBox = new St.BoxLayout({
            vertical: true,
            style_class: 'modal-dialog-content-box'
        });

        // Add error title
        let titleLabel = new St.Label({
            text: _("Voice Input Error"),
            style: 'font-weight: bold; font-size: 14px; margin-bottom: 10px;'
        });
        contentBox.add(titleLabel);

        // Add error message
        let messageLabel = new St.Label({
            text: this.errorMessage || _("An unknown error occurred"),
            style: 'margin-bottom: 10px;'
        });
        contentBox.add(messageLabel);

        dialog.contentLayout.add(contentBox);

        // Add close button
        dialog.setButtons([
            {
                label: _("Close"),
                action: Lang.bind(this, function() {
                    dialog.close();
                })
            }
        ]);

        // Connect close event to return to IDLE state
        dialog.connect('closed', Lang.bind(this, function() {
            this.setState(STATE_IDLE);
        }));

        dialog.open();
    },

    /**
     * Task 4.6: Implement cancelTranscription() function
     * Kill Python process and transition to IDLE state silently
     */
    cancelTranscription: function() {
        // Clear watchdog timer
        this._clearProcessingWatchdog();

        // Kill the Python process if it's still running
        if (this.recordingProcess && this.recordingProcess.pid) {
            try {
                // Send SIGTERM to the process
                GLib.spawn_command_line_sync('kill ' + this.recordingProcess.pid);
                this.recordingProcess = null;
            } catch (e) {
                global.logError("Error cancelling transcription: " + e);
            }
        }

        // Return to IDLE state silently (no notification)
        this.setState(STATE_IDLE);
    },

    /**
     * Set the current state and handle transitions
     * Task 1.3: Implement setState() function
     * Task 3.4: Enhanced with animation cleanup
     * Task 4.7: Enhanced with processing animation and error overlay cleanup
     * Task 3.3: Verify cleanup methods are called
     */
    setState: function(newState) {
        // Task 3.4: Clean up recording animation before state change
        if (this.recordingAnimation) {
            this.stopRecordingAnimation();
        }

        // Task 4.7: Clean up processing animation before state change
        if (this.processingAnimation || this.currentState === STATE_PROCESSING) {
            this._cleanupLoadingDots();
            this.processingAnimation = null;
        }

        // Cancel any running processes if transitioning away from RECORDING or PROCESSING
        if (this.currentState === STATE_RECORDING && newState !== STATE_RECORDING) {
            // Will be implemented in Task Group 3
        }

        if (this.currentState === STATE_PROCESSING && newState !== STATE_PROCESSING) {
            // Already handled by cancelTranscription
        }

        // Update state
        this.currentState = newState;

        // Initialize new state
        switch (newState) {
            case STATE_IDLE:
                this.setIdleIcon();
                break;
            case STATE_RECORDING:
                this.startRecordingAnimation();
                break;
            case STATE_PROCESSING:
                this.startProcessingAnimation();
                break;
            case STATE_ERROR:
                this.showErrorIcon();
                break;
        }
    },

    /**
     * Task 2.2: Implement handleLeftClick() function
     * Handle left-click behavior based on current state
     */
    handleLeftClick: function() {
        switch (this.currentState) {
            case STATE_IDLE:
                // Validate configuration
                if (!this.validateConfiguration()) {
                    // Open settings dialog and show notification
                    Main.notify(
                        "Voice Keyboard Perlover",
                        "Settings are not configured"
                    );
                    Util.spawnCommandLine("cinnamon-settings applets " + this.metadata.uuid);
                    return;
                }
                // Start recording
                this.startRecording();
                break;

            case STATE_RECORDING:
                // Stop recording and transition to processing
                this.stopRecording();
                break;

            case STATE_PROCESSING:
                // Cancel transcription and return to idle
                this.cancelTranscription();
                break;

            case STATE_ERROR:
                // Show error dialog
                this.showErrorDialog();
                break;
        }
    },

    /**
     * Task 3.5: Implement startRecording() function
     * Start recording with proper configuration validation and process management
     */
    startRecording: function() {
        // Validate configuration first
        if (!this.validateConfiguration()) {
            Main.notify(
                "Voice Keyboard Perlover",
                "Settings are not configured"
            );
            Util.spawnCommandLine("cinnamon-settings applets " + this.metadata.uuid);
            return;
        }

        // Transition to RECORDING state
        this.setState(STATE_RECORDING);

        // Prepare environment variables
        let envp = GLib.get_environ();
        envp.push('WHISPER_MODE=' + this.whisperMode);
        envp.push('WHISPER_LANGUAGE=' + this.language);
        envp.push('RECORDING_DURATION=' + this.recordingDuration);

        if (this.whisperMode === 'openai') {
            envp.push('OPENAI_API_KEY=' + this.openaiApiKey);
            envp.push('OPENAI_MODEL=' + (this.openaiModel || 'whisper-1'));
        } else if (this.whisperMode === 'local') {
            envp.push('WHISPER_LOCAL_URL=' + this.localUrl);
        }

        // Launch script with stdout pipe to read recognized text
        try {
            let [success, pid, stdin_fd, stdout_fd, stderr_fd] = GLib.spawn_async_with_pipes(
                null,
                [this.scriptPath],
                envp,
                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null
            );

            if (success) {
                // Store process reference
                this.recordingProcess = { pid: pid };

                // Create IOChannel to read stdout
                let stdoutChannel = GLib.IOChannel.unix_new(stdout_fd);
                stdoutChannel.set_flags(GLib.IOFlags.NONBLOCK);

                // Watch for process completion and handle exit codes
                GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(pid, status) {
                    // Clear watchdog timer - process completed normally
                    this._clearProcessingWatchdog();

                    // Read stdout before closing
                    let outputText = '';
                    try {
                        let [readStatus, stdoutData] = stdoutChannel.read_to_end();
                        if (stdoutData) {
                            outputText = stdoutData.toString().trim();
                        }
                        stdoutChannel.shutdown(false);
                    } catch (e) {
                        global.logError("[voice-keyboard] Error reading stdout: " + e);
                    }

                    GLib.spawn_close_pid(pid);
                    this.recordingProcess = null;

                    // Get exit code from status
                    let exitCode = 0;
                    if (status !== null) {
                        exitCode = (status >> 8) & 0xFF;
                    }

                    // Handle different exit codes
                    if (exitCode === EXIT_SUCCESS) {
                        // Success - text was pasted via PRIMARY method
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_NEEDS_TYPING) {
                        // Legacy: In v1.3.0+ xdotool method is handled in Python script
                        // This code path should not be reached anymore
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_TIMEOUT) {
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Maximum recording time reached"
                        );
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_TRANSCRIPTION_ERROR) {
                        this.errorMessage = "Transcription failed";
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Transcription failed"
                        );
                        this.setState(STATE_ERROR);

                    } else if (exitCode === EXIT_RECORDING_ERROR) {
                        this.errorMessage = "Recording failed";
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Recording failed"
                        );
                        this.setState(STATE_ERROR);

                    } else if (exitCode === EXIT_CONFIG_ERROR) {
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Configuration error - please check settings"
                        );
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_CANCELLED) {
                        this.setState(STATE_IDLE);

                    } else {
                        this.errorMessage = "Process exited with code " + exitCode;
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Voice input failed"
                        );
                        this.setState(STATE_ERROR);
                    }
                }));
            }
        } catch (e) {
            Main.notifyError(
                "Voice Input Error",
                "Failed to start voice input: " + e.message
            );
            global.logError("Voice input error: " + e);
            this.errorMessage = "Failed to start voice input: " + e.message;
            this.setState(STATE_ERROR);
        }
    },

    /**
     * Task 3.6: Implement stopRecording() function
     * Stop recording and transition to processing state
     */
    stopRecording: function() {
        // Transition to PROCESSING state
        this.setState(STATE_PROCESSING);

        // Kill ffmpeg process if still running
        // The Python script will handle ffmpeg termination and continue with transcription
        // We send SIGTERM to stop recording but keep the script running
        if (this.recordingProcess && this.recordingProcess.pid) {
            try {
                // Send SIGTERM to the process to stop recording
                // The Python script should handle this gracefully and proceed to transcription
                GLib.spawn_command_line_sync('kill -TERM ' + this.recordingProcess.pid);
            } catch (e) {
                global.logError("Error stopping recording: " + e);
            }
        }

        // Start watchdog timer to prevent infinite hang if server doesn't respond
        this._startProcessingWatchdog();

        // The recording process continues running for transcription
        // Process will be monitored via child_watch_add callback
    },

    /**
     * Start watchdog timer for STATE_PROCESSING
     * Automatically cancels transcription if it takes too long
     */
    _startProcessingWatchdog: function() {
        // Clear any existing watchdog
        this._clearProcessingWatchdog();

        this._processingWatchdogId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, PROCESSING_WATCHDOG_MS,
            Lang.bind(this, function() {
                if (this.currentState === STATE_PROCESSING) {
                    global.logError("[voice-keyboard] Processing watchdog timeout - server did not respond");
                    this.cancelTranscription();
                    Main.notify("Voice Keyboard Perlover", "Server did not respond in time");
                }
                this._processingWatchdogId = null;
                return GLib.SOURCE_REMOVE;
            })
        );
    },

    /**
     * Clear watchdog timer
     */
    _clearProcessingWatchdog: function() {
        if (this._processingWatchdogId) {
            GLib.source_remove(this._processingWatchdogId);
            this._processingWatchdogId = null;
        }
    },

    /**
     * Task 2.3: Override on_applet_clicked() for left-click
     * Replace menu toggle with call to handleLeftClick()
     */
    on_applet_clicked: function(event) {
        this.handleLeftClick();
    },

    /**
     * Task 2.4: Implement _onButtonPressEvent() for right-click detection
     * Show settings menu on right-click only
     */
    _onButtonPressEvent: function(actor, event) {
        if (event.get_button() === 3) {
            // Right-click: show settings menu
            this.menu.toggle();
            return Clutter.EVENT_STOP;
        } else if (event.get_button() === 1) {
            // Left-click: handle voice recording toggle
            this.handleLeftClick();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    },

    on_applet_removed_from_panel: function() {
        // Clean up animations
        if (this.recordingAnimation) {
            this.stopRecordingAnimation();
        }
        if (this.processingAnimation || this.currentState === STATE_PROCESSING) {
            this._cleanupLoadingDots();
        }
        this.settings.finalize();
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    return new VoiceKeyboardApplet(metadata, orientation, panel_height, instance_id);
}
