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
const Gettext = imports.gettext;

const UUID = "voice-keyboard@perlover";

function _(str) {
    Gettext.bindtextdomain(UUID, "/usr/share/locale");
    return Gettext.dgettext(UUID, str);
}

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
const EXIT_CHAT_ERROR = 6;

// Watchdog timeout for STATE_PROCESSING (45 seconds)
// Python script has 10s connect + 30s read timeout = 40s max
// Watchdog is safety net in case script hangs
const PROCESSING_WATCHDOG_MS = 45000;

function VoiceKeyboardApplet(metadata, orientation, panel_height, instance_id) {
    this._init(metadata, orientation, panel_height, instance_id);
}

VoiceKeyboardApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instance_id) {
        Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

        this.metadata = metadata;
        this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);

        // Debug mode: enabled if ~/.voice-keyboard-debug file exists
        this._debugMode = GLib.file_test(
            GLib.get_home_dir() + '/.voice-keyboard-debug',
            GLib.FileTest.EXISTS
        );

        // Initialize state machine
        this.currentState = STATE_IDLE;
        this.recordingAnimation = null;
        this.processingAnimation = null;
        this.errorMessage = null;
        this.recordingProcess = null;
        this.errorOverlay = null;
        this._activeCustomPrompt = null;

        // Bind settings
        this.settings.bind("whisper-mode", "whisperMode", Lang.bind(this, this._rebuildMenu));
        this.settings.bind("openai-api-key", "openaiApiKey");
        this.settings.bind("openai-model", "openaiModel");
        this.settings.bind("local-url", "localUrl");
        this.settings.bind("language", "language");
        this.settings.bind("recording-duration", "recordingDuration");
        this.settings.bind("script-path", "scriptPath");
        this.settings.bind("chat-model", "chatModel");
        this.settings.bind("custom-prompts", "customPrompts", Lang.bind(this, this._rebuildMenu));

        // Set icon
        this.set_applet_icon_symbolic_name("audio-input-microphone-symbolic");

        // Task 2.5: Update tooltip to reflect new click behavior
        this.set_applet_tooltip(_("Voice Keyboard - Left-click to start/stop recording, Right-click for settings"));

        // Create menu
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        // Build dynamic menu (custom prompts + settings)
        this._rebuildMenu();

        // Connect button press event handler for right-click menu
        this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPressEvent));
    },

    /**
     * Debug logging - only outputs if ~/.voice-keyboard-debug file exists
     */
    _debug: function(message) {
        if (this._debugMode) {
            global.log("[voice-keyboard] " + message);
        }
    },

    /**
     * Build dynamic right-click menu with custom prompts and settings
     */
    _rebuildMenu: function() {
        this.menu.removeAll();
        this._debug("Rebuilding menu: mode=" + this.whisperMode + ", prompts=" + (this.customPrompts ? this.customPrompts.length : 0));

        // Custom prompts (only in OpenAI mode)
        if (this.whisperMode === 'openai' && this.customPrompts && this.customPrompts.length > 0) {
            var hasPrompts = false;
            for (var i = 0; i < this.customPrompts.length; i++) {
                var prompt = this.customPrompts[i];
                if (!prompt.enabled) continue;
                hasPrompts = true;
                var promptItem = new PopupMenu.PopupIconMenuItem(
                    _(prompt.name),
                    "accessories-text-editor-symbolic",
                    St.IconType.SYMBOLIC
                );
                // Closure to capture promptData
                (function(applet, promptData) {
                    promptItem.connect('activate', Lang.bind(applet, function() {
                        applet._startCustomPromptRecording(promptData);
                    }));
                })(this, prompt);
                this.menu.addMenuItem(promptItem);
            }
            if (hasPrompts) {
                this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            }
        }

        // Settings — always present
        var settingsItem = new PopupMenu.PopupIconMenuItem(
            _("Settings"),
            "preferences-system-symbolic",
            St.IconType.SYMBOLIC
        );
        settingsItem.connect('activate', Lang.bind(this, function() {
            Util.spawnCommandLine("cinnamon-settings applets " + this.metadata.uuid);
        }));
        this.menu.addMenuItem(settingsItem);

        // Export/Import via clipboard — quick access
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        var exportItem = new PopupMenu.PopupIconMenuItem(
            _("Export Settings to Clipboard"),
            "edit-copy-symbolic",
            St.IconType.SYMBOLIC
        );
        exportItem.connect('activate', Lang.bind(this, function() {
            this.onExportToClipboard();
        }));
        this.menu.addMenuItem(exportItem);

        var importItem = new PopupMenu.PopupIconMenuItem(
            _("Import Settings from Clipboard"),
            "edit-paste-symbolic",
            St.IconType.SYMBOLIC
        );
        importItem.connect('activate', Lang.bind(this, function() {
            this.onImportFromClipboard();
        }));
        this.menu.addMenuItem(importItem);
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
     * NOTE: Does NOT clear watchdog timer - that's handled separately
     */
    _cleanupLoadingDots: function() {
        // Stop timeline if running
        this._stopProcessingTimeline();

        // NOTE: Watchdog timer is NOT cleared here!
        // It should only be cleared when:
        // 1. Process completes (child_watch callback)
        // 2. User cancels (cancelTranscription)
        // 3. Watchdog fires itself

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
                        _("Settings are not configured")
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
     * Build base environment variables for the Python script
     */
    _buildBaseEnvp: function() {
        this._debug("Building envp: mode=" + this.whisperMode + ", language=" + this.language);
        var envp = GLib.get_environ();
        envp.push('WHISPER_MODE=' + this.whisperMode);
        envp.push('WHISPER_LANGUAGE=' + this.language);
        envp.push('RECORDING_DURATION=' + this.recordingDuration);

        if (this.whisperMode === 'openai') {
            envp.push('OPENAI_API_KEY=' + this.openaiApiKey);
            envp.push('OPENAI_MODEL=' + (this.openaiModel || 'whisper-1'));
        } else if (this.whisperMode === 'local') {
            envp.push('WHISPER_LOCAL_URL=' + this.localUrl);
        }
        return envp;
    },

    /**
     * Spawn the Python script with given environment and handle exit codes
     */
    _spawnScript: function(envp) {
        try {
            var [success, pid, stdin_fd, stdout_fd, stderr_fd] = GLib.spawn_async_with_pipes(
                null,
                [this.scriptPath],
                envp,
                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null
            );

            if (success) {
                this.recordingProcess = { pid: pid };
                this._debug("Script spawned: pid=" + pid + ", customPrompt=" + (this._activeCustomPrompt ? this._activeCustomPrompt.name : "none"));

                var stdoutChannel = GLib.IOChannel.unix_new(stdout_fd);
                stdoutChannel.set_flags(GLib.IOFlags.NONBLOCK);

                var stderrChannel = GLib.IOChannel.unix_new(stderr_fd);
                stderrChannel.set_flags(GLib.IOFlags.NONBLOCK);

                GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(pid, status) {
                    this._debug("child_watch callback: pid=" + pid + ", status=" + status + ", state=" + this.currentState + ", customPrompt=" + (this._activeCustomPrompt ? this._activeCustomPrompt.name : "none"));
                    this._clearProcessingWatchdog();

                    var outputText = '';
                    try {
                        var [readStatus, stdoutData] = stdoutChannel.read_to_end();
                        if (stdoutData) {
                            outputText = stdoutData.toString().trim();
                        }
                        stdoutChannel.shutdown(false);
                    } catch (e) {
                        global.logError("[voice-keyboard] Error reading stdout: " + e);
                    }

                    var stderrText = '';
                    try {
                        var [readStatus2, stderrData] = stderrChannel.read_to_end();
                        if (stderrData) {
                            stderrText = stderrData.toString().trim();
                            if (stderrText) {
                                this._debug("Script stderr: " + stderrText);
                            }
                        }
                        stderrChannel.shutdown(false);
                    } catch (e) {
                        // Ignore stderr read errors
                    }

                    this._debug("child_watch: stdout_len=" + outputText.length + ", stderr_len=" + stderrText.length);

                    GLib.spawn_close_pid(pid);
                    this.recordingProcess = null;

                    var exitCode = 0;
                    if (status !== null) {
                        exitCode = (status >> 8) & 0xFF;
                    }

                    // Handle exit codes
                    if (exitCode === EXIT_SUCCESS) {
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_TIMEOUT) {
                        Main.notify(
                            "Voice Keyboard Perlover",
                            _("Maximum recording time reached")
                        );
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_TRANSCRIPTION_ERROR) {
                        this.errorMessage = _("Transcription failed");
                        Main.notify(
                            "Voice Keyboard Perlover",
                            _("Transcription failed")
                        );
                        this.setState(STATE_ERROR);

                    } else if (exitCode === EXIT_RECORDING_ERROR) {
                        this.errorMessage = _("Recording failed");
                        Main.notify(
                            "Voice Keyboard Perlover",
                            _("Recording failed")
                        );
                        this.setState(STATE_ERROR);

                    } else if (exitCode === EXIT_CONFIG_ERROR) {
                        Main.notify(
                            "Voice Keyboard Perlover",
                            _("Configuration error - please check settings")
                        );
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_CANCELLED) {
                        this.setState(STATE_IDLE);

                    } else if (exitCode === EXIT_CHAT_ERROR) {
                        this.errorMessage = _("AI chat processing failed");
                        Main.notify(
                            "Voice Keyboard Perlover",
                            _("AI chat processing failed")
                        );
                        this.setState(STATE_ERROR);

                    } else {
                        this.errorMessage = _("Process exited with code %d").replace("%d", exitCode);
                        Main.notify(
                            "Voice Keyboard Perlover",
                            _("Voice input failed")
                        );
                        this.setState(STATE_ERROR);
                    }

                    // Clear custom prompt state
                    this._activeCustomPrompt = null;
                }));
            }
        } catch (e) {
            Main.notifyError(
                _("Voice Input Error"),
                _("Failed to start voice input: ") + e.message
            );
            global.logError("Voice input error: " + e);
            this.errorMessage = _("Failed to start voice input: ") + e.message;
            this._activeCustomPrompt = null;
            this.setState(STATE_ERROR);
        }
    },

    /**
     * Start recording with standard transcription (no custom prompt)
     */
    startRecording: function() {
        if (!this.validateConfiguration()) {
            Main.notify(
                "Voice Keyboard Perlover",
                _("Settings are not configured")
            );
            Util.spawnCommandLine("cinnamon-settings applets " + this.metadata.uuid);
            return;
        }

        this._activeCustomPrompt = null;
        this.setState(STATE_RECORDING);
        var envp = this._buildBaseEnvp();
        this._spawnScript(envp);
    },

    /**
     * Start recording with a custom prompt for AI chat processing
     */
    _startCustomPromptRecording: function(promptData) {
        if (!this.validateConfiguration()) {
            Main.notify(
                "Voice Keyboard Perlover",
                _("Settings are not configured")
            );
            return;
        }
        this._debug("Custom prompt recording: name=" + promptData.name + ", chatModel=" + this.chatModel);
        this._activeCustomPrompt = promptData;
        this.setState(STATE_RECORDING);
        var envp = this._buildBaseEnvp();
        envp.push('CUSTOM_PROMPT=' + promptData.prompt);
        envp.push('CHAT_MODEL=' + (this.chatModel || 'gpt-4o-mini'));
        this._spawnScript(envp);
    },

    /**
     * Task 3.6: Implement stopRecording() function
     * Stop recording and transition to processing state
     */
    stopRecording: function() {
        this._debug("stopRecording() called, pid=" + (this.recordingProcess ? this.recordingProcess.pid : "null"));

        // Transition to PROCESSING state
        this.setState(STATE_PROCESSING);

        // Kill ffmpeg process if still running
        // The Python script will handle ffmpeg termination and continue with transcription
        // We send SIGTERM to stop recording but keep the script running
        if (this.recordingProcess && this.recordingProcess.pid) {
            try {
                // Send SIGTERM to the process to stop recording
                // The Python script should handle this gracefully and proceed to transcription
                this._debug("Sending SIGTERM to pid " + this.recordingProcess.pid);
                GLib.spawn_command_line_sync('kill -TERM ' + this.recordingProcess.pid);
            } catch (e) {
                global.logError("Error stopping recording: " + e);
            }
        }

        // Start watchdog timer to prevent infinite hang if server doesn't respond
        // Use longer timeout for custom prompts (2 API calls: transcription + chat)
        if (this._activeCustomPrompt) {
            this._debug("About to start watchdog timer (custom prompt mode, 120s)");
            this._startProcessingWatchdog(120000);
        } else {
            this._debug("About to start watchdog timer (standard mode)");
            this._startProcessingWatchdog();
        }
        this._debug("stopRecording() completed");

        // The recording process continues running for transcription
        // Process will be monitored via child_watch_add callback
    },

    /**
     * Start watchdog timer for STATE_PROCESSING
     * Automatically cancels transcription if it takes too long
     * @param {number} timeoutMs - optional timeout in ms (default: PROCESSING_WATCHDOG_MS)
     */
    _startProcessingWatchdog: function(timeoutMs) {
        var timeout = timeoutMs || PROCESSING_WATCHDOG_MS;
        // Clear any existing watchdog
        this._clearProcessingWatchdog();

        this._debug("Starting watchdog timer (" + timeout + "ms)");
        this._watchdogStartTime = Date.now();

        this._processingWatchdogId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeout,
            Lang.bind(this, function() {
                let elapsed = Date.now() - this._watchdogStartTime;
                this._debug("Watchdog callback fired after " + elapsed + "ms, state=" + this.currentState);
                if (this.currentState === STATE_PROCESSING) {
                    global.logError("[voice-keyboard] Processing watchdog timeout - server did not respond");
                    this.cancelTranscription();
                    Main.notify("Voice Keyboard Perlover", _("Server did not respond in time"));
                }
                this._processingWatchdogId = null;
                return GLib.SOURCE_REMOVE;
            })
        );

        this._debug("Watchdog timer ID: " + this._processingWatchdogId);
    },

    /**
     * Clear watchdog timer
     */
    _clearProcessingWatchdog: function() {
        if (this._processingWatchdogId) {
            let elapsed = this._watchdogStartTime ? (Date.now() - this._watchdogStartTime) : 0;
            this._debug("Clearing watchdog timer (ID: " + this._processingWatchdogId + ") after " + elapsed + "ms");
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

    /**
     * Run an async command and capture stdout
     */
    _runCommandAsync: function(argv, callback) {
        try {
            var [success, pid, stdin_fd, stdout_fd, stderr_fd] = GLib.spawn_async_with_pipes(
                null, argv, null,
                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null
            );
            if (success) {
                var stdoutChannel = GLib.IOChannel.unix_new(stdout_fd);
                stdoutChannel.set_flags(GLib.IOFlags.NONBLOCK);

                var stderrChannel = GLib.IOChannel.unix_new(stderr_fd);
                stderrChannel.set_flags(GLib.IOFlags.NONBLOCK);

                GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(pid, status) {
                    var output = '';
                    try {
                        var [readStatus, data] = stdoutChannel.read_to_end();
                        if (data) output = data.toString().trim();
                        stdoutChannel.shutdown(false);
                    } catch (e) { /* ignore */ }

                    try { stderrChannel.shutdown(false); } catch (e) { /* ignore */ }

                    GLib.spawn_close_pid(pid);
                    var exitCode = (status >> 8) & 0xFF;
                    callback(exitCode === 0, output);
                }));
            } else {
                callback(false, '');
            }
        } catch (e) {
            global.logError("[voice-keyboard] _runCommandAsync error: " + e);
            callback(false, '');
        }
    },

    /**
     * Build export data object from current settings
     * Dynamically reads settings-schema.json to include all data keys
     */
    _buildExportData: function() {
        var schemaPath = this.metadata.path + '/settings-schema.json';
        var [ok, contents] = GLib.file_get_contents(schemaPath);
        if (!ok) {
            global.logError("[voice-keyboard] Cannot read settings-schema.json");
            return null;
        }

        var schema = JSON.parse(contents);
        var skipTypes = ['label', 'header', 'separator', 'button'];
        var settings = {};

        for (var key in schema) {
            if (schema.hasOwnProperty(key)) {
                var entry = schema[key];
                if (skipTypes.indexOf(entry.type) >= 0) continue;
                try {
                    settings[key] = this.settings.getValue(key);
                } catch (e) {
                    this._debug("Cannot read setting: " + key + " - " + e);
                }
            }
        }

        return {
            "format": "voice-keyboard-settings",
            "version": this.metadata.version || "1.8.0",
            "exported": new Date().toISOString(),
            "settings": settings
        };
    },

    /**
     * Validate import data JSON text
     * Returns parsed object or null if invalid
     */
    _validateImportData: function(jsonText) {
        try {
            var data = JSON.parse(jsonText);
            if (data.format !== "voice-keyboard-settings") {
                return null;
            }
            if (!data.settings || typeof data.settings !== 'object') {
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    },

    /**
     * Apply imported settings data
     * Only applies keys that exist in current schema
     */
    _applyImportData: function(importData) {
        var schemaPath = this.metadata.path + '/settings-schema.json';
        var [ok, contents] = GLib.file_get_contents(schemaPath);
        if (!ok) return 0;

        var schema = JSON.parse(contents);
        var skipTypes = ['label', 'header', 'separator', 'button'];
        var applied = 0;

        for (var key in importData.settings) {
            if (importData.settings.hasOwnProperty(key)) {
                if (!schema.hasOwnProperty(key)) continue;
                if (skipTypes.indexOf(schema[key].type) >= 0) continue;
                try {
                    this.settings.setValue(key, importData.settings[key]);
                    applied++;
                } catch (e) {
                    this._debug("Cannot set setting: " + key + " - " + e);
                }
            }
        }

        return applied;
    },

    /**
     * Show confirmation dialog before importing settings
     */
    _showImportConfirmDialog: function(importData, onConfirm) {
        var dialog = new ModalDialog.ModalDialog();

        var contentBox = new St.BoxLayout({
            vertical: true,
            style_class: 'modal-dialog-content-box'
        });

        var titleLabel = new St.Label({
            text: _("Import Settings"),
            style: 'font-weight: bold; font-size: 14px; margin-bottom: 10px;'
        });
        contentBox.add(titleLabel);

        var settingsCount = Object.keys(importData.settings).length;
        var infoText = _("Version: %s").replace("%s", importData.version || "?") + "\n" +
                       _("Date: %s").replace("%s", importData.exported || "?") + "\n" +
                       _("Settings count: %d").replace("%d", settingsCount);

        var infoLabel = new St.Label({
            text: infoText,
            style: 'margin-bottom: 10px;'
        });
        contentBox.add(infoLabel);

        var warningLabel = new St.Label({
            text: _("All current settings will be overwritten. Continue?"),
            style: 'color: #ff8800; margin-bottom: 10px;'
        });
        contentBox.add(warningLabel);

        dialog.contentLayout.add(contentBox);

        dialog.setButtons([
            {
                label: _("Cancel"),
                action: Lang.bind(this, function() {
                    dialog.close();
                })
            },
            {
                label: _("Import"),
                action: Lang.bind(this, function() {
                    dialog.close();
                    onConfirm();
                })
            }
        ]);

        dialog.open();
    },

    /**
     * Check if export data contains API key and show warning
     */
    _checkApiKeyWarning: function(exportData) {
        if (exportData.settings['openai-api-key'] && exportData.settings['openai-api-key'].trim() !== '') {
            Main.notify(
                "Voice Keyboard Perlover",
                _("Warning: exported data contains your API key. Keep it secure!")
            );
        }
    },

    /**
     * Export settings to clipboard (called from settings panel button and right-click menu)
     */
    onExportToClipboard: function() {
        var exportData = this._buildExportData();
        if (!exportData) {
            Main.notify("Voice Keyboard Perlover", _("Failed to export settings"));
            return;
        }

        var jsonText = JSON.stringify(exportData, null, 2);
        var tmpFile = '/tmp/voice-keyboard-export.json';

        try {
            GLib.file_set_contents(tmpFile, jsonText);
        } catch (e) {
            Main.notify("Voice Keyboard Perlover", _("Failed to export settings"));
            return;
        }

        this._runCommandAsync(
            ['bash', '-c', 'xclip -selection clipboard < ' + tmpFile + ' && rm -f ' + tmpFile],
            Lang.bind(this, function(success) {
                // Clean up temp file in case of failure
                try { GLib.unlink(tmpFile); } catch (e) { /* ignore */ }

                if (success) {
                    this._checkApiKeyWarning(exportData);
                    Main.notify("Voice Keyboard Perlover", _("Settings exported to clipboard"));
                } else {
                    Main.notify("Voice Keyboard Perlover", _("Failed to copy to clipboard"));
                }
            })
        );
    },

    /**
     * Export settings to a file via zenity save dialog
     */
    onExportToFile: function() {
        var exportData = this._buildExportData();
        if (!exportData) {
            Main.notify("Voice Keyboard Perlover", _("Failed to export settings"));
            return;
        }

        this._runCommandAsync(
            ['zenity', '--file-selection', '--save', '--confirm-overwrite',
             '--title=' + _("Export Settings to File"),
             '--filename=voice-keyboard-settings.json',
             '--file-filter=JSON files (*.json)|*.json',
             '--file-filter=All files|*'],
            Lang.bind(this, function(success, filePath) {
                if (!success || !filePath) return;

                var jsonText = JSON.stringify(exportData, null, 2);
                try {
                    GLib.file_set_contents(filePath, jsonText);
                    this._checkApiKeyWarning(exportData);
                    Main.notify("Voice Keyboard Perlover", _("Settings exported to file"));
                } catch (e) {
                    Main.notify("Voice Keyboard Perlover", _("Failed to save file: ") + e.message);
                }
            })
        );
    },

    /**
     * Import settings from clipboard
     */
    onImportFromClipboard: function() {
        this._runCommandAsync(
            ['xclip', '-selection', 'clipboard', '-o'],
            Lang.bind(this, function(success, clipText) {
                if (!success || !clipText) {
                    Main.notify("Voice Keyboard Perlover", _("Clipboard is empty or cannot be read"));
                    return;
                }

                var importData = this._validateImportData(clipText);
                if (!importData) {
                    Main.notify("Voice Keyboard Perlover", _("Invalid settings format in clipboard"));
                    return;
                }

                this._showImportConfirmDialog(importData, Lang.bind(this, function() {
                    var applied = this._applyImportData(importData);
                    Main.notify("Voice Keyboard Perlover",
                        _("Settings imported successfully (%d applied)").replace("%d", applied));
                }));
            })
        );
    },

    /**
     * Import settings from file via zenity open dialog
     */
    onImportFromFile: function() {
        this._runCommandAsync(
            ['zenity', '--file-selection',
             '--title=' + _("Import Settings from File"),
             '--file-filter=JSON files (*.json)|*.json',
             '--file-filter=All files|*'],
            Lang.bind(this, function(success, filePath) {
                if (!success || !filePath) return;

                var [ok, contents] = [false, ''];
                try {
                    [ok, contents] = GLib.file_get_contents(filePath);
                } catch (e) {
                    Main.notify("Voice Keyboard Perlover", _("Failed to read file"));
                    return;
                }

                if (!ok) {
                    Main.notify("Voice Keyboard Perlover", _("Failed to read file"));
                    return;
                }

                var jsonText = contents.toString();
                var importData = this._validateImportData(jsonText);
                if (!importData) {
                    Main.notify("Voice Keyboard Perlover", _("Invalid settings file format"));
                    return;
                }

                this._showImportConfirmDialog(importData, Lang.bind(this, function() {
                    var applied = this._applyImportData(importData);
                    Main.notify("Voice Keyboard Perlover",
                        _("Settings imported successfully (%d applied)").replace("%d", applied));
                }));
            })
        );
    },

    on_applet_removed_from_panel: function() {
        // Clean up animations
        if (this.recordingAnimation) {
            this.stopRecordingAnimation();
        }
        if (this.processingAnimation || this.currentState === STATE_PROCESSING) {
            this._cleanupLoadingDots();
        }
        // Clean up watchdog timer
        this._clearProcessingWatchdog();
        this.settings.finalize();
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    return new VoiceKeyboardApplet(metadata, orientation, panel_height, instance_id);
}
