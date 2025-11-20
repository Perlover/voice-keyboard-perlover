const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Main = imports.ui.main;
const Settings = imports.ui.settings;
const Util = imports.misc.util;

function VoiceKeyboardApplet(metadata, orientation, panel_height, instance_id) {
    this._init(metadata, orientation, panel_height, instance_id);
}

VoiceKeyboardApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instance_id) {
        Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

        this.metadata = metadata;
        this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);

        // Bind settings
        this.settings.bind("whisper-mode", "whisperMode");
        this.settings.bind("openai-api-key", "openaiApiKey");
        this.settings.bind("local-url", "localUrl");
        this.settings.bind("language", "language");
        this.settings.bind("recording-duration", "recordingDuration");
        this.settings.bind("script-path", "scriptPath");

        // Set icon
        this.set_applet_icon_symbolic_name("audio-input-microphone");
        this.set_applet_tooltip(_("Voice Keyboard - Click to start voice input"));

        // Create menu
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        // Add voice input menu item
        let voiceItem = new PopupMenu.PopupIconMenuItem(
            _("Start Voice Input"),
            "audio-input-microphone-symbolic",
            St.IconType.SYMBOLIC
        );
        voiceItem.connect('activate', Lang.bind(this, this._startVoiceInput));
        this.menu.addMenuItem(voiceItem);

        // Add separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Add settings menu item
        let settingsItem = new PopupMenu.PopupIconMenuItem(
            _("Settings"),
            "preferences-system-symbolic",
            St.IconType.SYMBOLIC
        );
        settingsItem.connect('activate', Lang.bind(this, function() {
            Util.spawnCommandLine("cinnamon-settings applets " + metadata.uuid);
        }));
        this.menu.addMenuItem(settingsItem);
    },

    _startVoiceInput: function() {
        // Close menu
        this.menu.close();

        // Show notification
        Main.notify(
            "Voice Input",
            "Recording started, please speak..."
        );

        // Prepare environment variables
        let envp = GLib.get_environ();
        envp.push('WHISPER_MODE=' + this.whisperMode);
        envp.push('WHISPER_LANGUAGE=' + this.language);
        envp.push('RECORDING_DURATION=' + this.recordingDuration);

        if (this.whisperMode === 'openai') {
            envp.push('OPENAI_API_KEY=' + this.openaiApiKey);
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
                // Watch for process completion
                GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(pid, status) {
                    GLib.spawn_close_pid(pid);

                    // Read output
                    let outReader = new Gio.DataInputStream({
                        base_stream: new Gio.UnixInputStream({ fd: stdout, close_fd: true })
                    });

                    let [line, length] = outReader.read_line(null);
                    if (line !== null) {
                        let text = line.toString().trim();
                        if (text.length > 0) {
                            Main.notify(
                                "Voice Input",
                                "Recognized: " + text
                            );
                        } else {
                            Main.notify(
                                "Voice Input",
                                "No speech detected"
                            );
                        }
                    }
                }));
            }
        } catch (e) {
            Main.notifyError(
                "Voice Input Error",
                "Failed to start voice input: " + e.message
            );
            global.logError("Voice input error: " + e);
        }
    },

    on_applet_clicked: function(event) {
        this.menu.toggle();
    },

    on_applet_removed_from_panel: function() {
        this.settings.finalize();
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    return new VoiceKeyboardApplet(metadata, orientation, panel_height, instance_id);
}
