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
     * Task 3.2 (Animation Enhancement): Reset scale properties to 1.0
     */
    setIdleIcon: function() {
        this.set_applet_icon_symbolic_name("audio-input-microphone-symbolic");
        this.actor.opacity = 255;
        // Task 3.2: Reset scale properties to 1.0
        this.actor.scale_x = 1.0;
        this.actor.scale_y = 1.0;
        this.errorMessage = null;

        // Task 4.7: Remove error overlay when leaving ERROR state
        if (this.errorOverlay) {
            this.actor.remove_actor(this.errorOverlay);
            this.errorOverlay.destroy();
            this.errorOverlay = null;
        }
    },

    /**
     * Task 3.3: Implement startRecordingAnimation() function
     * Start smooth fade animation for RECORDING state
     * Task 1.2: Set pivot_point for center-based scaling
     */
    startRecordingAnimation: function() {
        // Task 1.2: Set pivot_point for center-based scaling
        this.actor.pivot_point = new Clutter.Point({ x: 0.5, y: 0.5 });
        // Start fade out animation
        this._fadeOut();
    },

    /**
     * Fade out animation (100% to 30% opacity over 1 second)
     * Task 1.3: Add scale animation (100% to 70%)
     */
    _fadeOut: function() {
        if (this.currentState !== STATE_RECORDING) {
            return; // Stop animation if state changed
        }

        // Task 1.3: Add scale_x: 0.7 and scale_y: 0.7 to the ease() call
        this.recordingAnimation = this.actor.ease({
            opacity: 77, // 30% of 255
            scale_x: 0.7,
            scale_y: 0.7,
            duration: 1000, // 1 second
            mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
            onComplete: Lang.bind(this, this._fadeIn)
        });
    },

    /**
     * Fade in animation (30% to 100% opacity over 1 second)
     * Task 1.4: Add scale animation (70% to 100%)
     */
    _fadeIn: function() {
        if (this.currentState !== STATE_RECORDING) {
            return; // Stop animation if state changed
        }

        // Task 1.4: Add scale_x: 1.0 and scale_y: 1.0 to the ease() call
        this.recordingAnimation = this.actor.ease({
            opacity: 255, // 100%
            scale_x: 1.0,
            scale_y: 1.0,
            duration: 1000, // 1 second
            mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
            onComplete: Lang.bind(this, this._fadeOut)
        });
    },

    /**
     * Task 3.4: Stop recording animation and clean up
     * Task 1.5: Also remove scale_x and scale_y transitions and reset to 1.0
     */
    stopRecordingAnimation: function() {
        if (this.recordingAnimation) {
            // Remove the animation transitions
            this.actor.remove_transition('opacity');
            // Task 1.5: Remove scale transitions
            this.actor.remove_transition('scale_x');
            this.actor.remove_transition('scale_y');
            this.recordingAnimation = null;
            // Reset opacity to full
            this.actor.opacity = 255;
            // Task 1.5: Reset scale to 1.0
            this.actor.scale_x = 1.0;
            this.actor.scale_y = 1.0;
        }
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

        // Task 2.5: Start the processing fade animation
        this._processingFadeOut();
    },

    /**
     * Task 2.3: Processing fade out animation (opacity to 30%, scale to 70%)
     * Mirrors recording animation pattern for processing state
     */
    _processingFadeOut: function() {
        // Check if still in processing state
        if (this.currentState !== STATE_PROCESSING) {
            return;
        }

        // Set pivot_point for center-based scaling
        this.actor.pivot_point = new Clutter.Point({ x: 0.5, y: 0.5 });

        // Animate opacity and scale together
        this.actor.ease({
            opacity: 77, // 30% of 255
            scale_x: 0.7,
            scale_y: 0.7,
            duration: 1000, // 1 second
            mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
            onComplete: Lang.bind(this, this._processingFadeIn)
        });
    },

    /**
     * Task 2.4: Processing fade in animation (opacity to 100%, scale to 100%)
     * Mirrors recording animation pattern for processing state
     */
    _processingFadeIn: function() {
        // Check if still in processing state
        if (this.currentState !== STATE_PROCESSING) {
            return;
        }

        // Animate opacity and scale together
        this.actor.ease({
            opacity: 255, // 100%
            scale_x: 1.0,
            scale_y: 1.0,
            duration: 1000, // 1 second
            mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
            onComplete: Lang.bind(this, this._processingFadeOut)
        });
    },

    /**
     * Task 4.7: Clean up loading dots animation
     * Task 2.6: Update to clean up ease animations and reset scale
     */
    _cleanupLoadingDots: function() {
        // Task 2.6: Remove any active ease animations on actor
        this.actor.remove_transition('opacity');
        this.actor.remove_transition('scale_x');
        this.actor.remove_transition('scale_y');

        // Task 2.6: Reset opacity and scale to defaults
        this.actor.opacity = 255;
        this.actor.scale_x = 1.0;
        this.actor.scale_y = 1.0;
    },

    /**
     * Task 4.4: Implement showErrorIcon() function
     * Keep normal microphone icon, add red warning triangle overlay
     */
    showErrorIcon: function() {
        // Keep normal microphone icon
        this.set_applet_icon_symbolic_name("audio-input-microphone-symbolic");
        this.actor.opacity = 255;

        // Create warning triangle overlay
        this.errorOverlay = new St.Icon({
            icon_name: 'dialog-warning-symbolic',
            icon_type: St.IconType.SYMBOLIC,
            style: 'color: #ff0000; font-size: 12px;',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.END
        });

        this.actor.add_actor(this.errorOverlay);
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

        // Launch script
        try {
            let [success, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(
                null,
                [this.scriptPath],
                envp,
                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null
            );

            if (success) {
                // Store process reference
                this.recordingProcess = { pid: pid, stdout: stdout, stderr: stderr };

                // Task 5.7: Watch for process completion and handle exit codes
                GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(pid, status) {
                    GLib.spawn_close_pid(pid);
                    this.recordingProcess = null;

                    // Get exit code from status
                    let exitCode = 0;
                    if (status !== null) {
                        // Extract exit code (status contains signal and exit code)
                        exitCode = (status >> 8) & 0xFF;
                    }

                    // Read output from stdout
                    let outReader = new Gio.DataInputStream({
                        base_stream: new Gio.UnixInputStream({ fd: stdout, close_fd: true })
                    });

                    // Read all lines from stdout
                    let outputLines = [];
                    let line, length;
                    try {
                        while ((([line, length] = outReader.read_line(null)) && line !== null)) {
                            outputLines.push(line.toString().trim());
                        }
                    } catch (e) {
                        global.logError("Error reading script output: " + e);
                    }

                    // Read error output for detailed error messages
                    let errReader = new Gio.DataInputStream({
                        base_stream: new Gio.UnixInputStream({ fd: stderr, close_fd: true })
                    });

                    let errorLines = [];
                    try {
                        while ((([line, length] = errReader.read_line(null)) && line !== null)) {
                            errorLines.push(line.toString().trim());
                        }
                    } catch (e) {
                        global.logError("Error reading script stderr: " + e);
                    }

                    // Task 5.7: Handle different exit codes
                    if (exitCode === EXIT_SUCCESS) {
                        // Success - check if window changed
                        if (outputLines.length > 0 && outputLines[0] === "WINDOW_CHANGED") {
                            // Window changed - show notification with recognized text
                            let recognizedText = outputLines.length > 1 ? outputLines[1] : "Text copied to clipboard";
                            Main.notify(
                                "Voice Keyboard Perlover",
                                "Window changed - text copied to clipboard:\n" + recognizedText
                            );
                        }
                        // Silently return to IDLE on success (no notification if text was typed)
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_TIMEOUT) {
                        // Maximum duration reached
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Maximum recording time reached"
                        );

                        // Check if window changed
                        if (outputLines.length > 0 && outputLines[0] === "WINDOW_CHANGED") {
                            let recognizedText = outputLines.length > 1 ? outputLines[1] : "";
                            if (recognizedText) {
                                Main.notify(
                                    "Voice Keyboard Perlover",
                                    "Window changed - text copied to clipboard:\n" + recognizedText
                                );
                            }
                        }

                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_TRANSCRIPTION_ERROR) {
                        // Transcription error - transition to ERROR state
                        let errorMsg = errorLines.length > 0 ? errorLines.join("\n") : "Transcription failed";
                        this.errorMessage = errorMsg;
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Transcription failed"
                        );
                        this.setState(STATE_ERROR);

                    } else if (exitCode === EXIT_RECORDING_ERROR) {
                        // Recording error
                        let errorMsg = errorLines.length > 0 ? errorLines.join("\n") : "Recording failed";
                        this.errorMessage = errorMsg;
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Recording failed"
                        );
                        this.setState(STATE_ERROR);

                    } else if (exitCode === EXIT_CONFIG_ERROR) {
                        // Configuration error
                        Main.notify(
                            "Voice Keyboard Perlover",
                            "Configuration error - please check settings"
                        );
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_CANCELLED) {
                        // Cancelled by user - silently return to IDLE
                        this.setState(STATE_IDLE);

                    } else {
                        // Unknown exit code
                        let errorMsg = "Process exited with code " + exitCode;
                        if (errorLines.length > 0) {
                            errorMsg += "\n" + errorLines.join("\n");
                        }
                        this.errorMessage = errorMsg;
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

        // The recording process continues running for transcription
        // Process will be monitored via child_watch_add callback
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
