---
name: cinnamon-applet
description: "House style and pitfalls of the Cinnamon applet applet/voice-keyboard@perlover/applet.js (with stylesheet.css, metadata.json) and its GJS tests tests/*.js. Use when editing applet.js: setState and the state machine, animations, GLib timeouts and the watchdog, spawning the script or helper commands (pipes, fd hygiene, exit codes, AUDIO_FILE/TEXT_FILE sentinels), the right-click menu, dialogs, notifications, panel icons, settings bindings and button callbacks, export/import, teardown, Cinnamon/Mint compatibility. Also for an endlessly pulsing icon, Too many open files, a settings window that will not open, or testing and reloading the applet. Not for Python-only work (whisper-voice-input skill), the settings-schema.json/.po workflow (settings-and-i18n skill) or releases (git-release skill). Russian triggers: апплет, иконка на панели, анимация, меню по правой кнопке, диалог, уведомление, утечка дескрипторов, зависла иконка, совместимость с Cinnamon, перезапустить Cinnamon."
---

# Cinnamon applet (applet.js)

CLAUDE.md already covers the GJS constraints, the state diagram, the click mapping and the debug flag. This skill adds how
the code is actually written and which bug taught each rule; the hashes point to the fix (`git show <hash>`).

## House style

- One prototype object, `VoiceKeyboardApplet.prototype = { __proto__: Applet.IconApplet.prototype, ... }`, plus `function main()`.
  Module level: imports, `UUID`, `_()`, `STATE_*` strings, `EXIT_*` numbers (mirroring the script), tunables as `UPPER_CASE`
  consts with a comment justifying each value, pure helpers (`modelFitsPurpose`).
- Naming: `_camelCase` for internal helpers and newer fields (`_spawnScript`, `_retryContext`); bare camelCase for the state-machine
  API and its older fields (`setState`, `handleLeftClick`, `currentState`, `recordingProcess`); `onXxx` for settings-button callbacks;
  `on_applet_*` for Cinnamon overrides. Settings bind to camelCase properties: `compat-base-url` → `compatBaseUrl`.
- New code uses `var` (about 105 `var` vs 14 `let`, which survive in older methods; do not churn them).
- `var` is function-scoped, so a callback created in a loop must capture its value: an IIFE as in `_rebuildMenu`
  (`(function(applet, promptData) { item.connect('activate', ...); })(this, prompt);`) or a factory like `createItem` in `_buildModelList`.
- `Lang.bind(this, ...)` wraps every callback that touches `this` (older dialog buttons use it even when they don't). Newer code
  uses plain closures over locals when `this` is not needed: `dialog.connect('closed', function() { dialogClosed = true; })`.
- Give each method a `/** ... */` block: what it does and, if not obvious, why ("NOTE: Does NOT clear watchdog timer").
  Comments and logs in English; the two Russian `stdin` comments from 0afedd4 are the exception.

## Logging

- `this._debug(msg)` calls `global.log("[voice-keyboard] " + msg)`, but only if `~/.voice-keyboard-debug` existed at `_init`.
  Log transitions with their context: the pid, `currentState`, the prompt name, and timer ids with the elapsed ms (as the
  watchdog functions do). Never log env values: the envp carries `OPENAI_API_KEY`/`COMPAT_API_KEY`; `_buildBaseEnvp` logs only the mode and language.
- Log real errors with `global.logError("[voice-keyboard] ...")` (not gated by the flag). Keep the prefix: three old calls lack
  it ("Voice input error", "Error stopping/cancelling ...") and the dev-loop grep misses them.
- Script stderr reaches the log only via `_debug("Script stderr: ...")` in `_spawnScript` (`_runCommandAsync` drops it); users see only `errorMessage`.

## State machine contract

- Change state only through `setState(newState)`. It stops whichever animation is running, assigns `currentState`, then
  enters the new state: `setIdleIcon`, `startRecordingAnimation`, `startProcessingAnimation` or `showErrorIcon`.
- `setState` never touches the process, the watchdog or `_retryContext`. The caller owns them:
  - Start: `_clearRetryContext()` → set `_activeCustomPrompt` → `setState(STATE_RECORDING)` → `_spawnScript(envp)`.
  - Stop: `setState(STATE_PROCESSING)` → SIGTERM (the script stops ffmpeg and goes on to transcribe) → `_startProcessingWatchdog(ms)`.
  - Retry: null `_retryContext` first (the new run now owns the preserved file) → PROCESSING → watchdog → spawn.
- Icon tint: `this.actor.get_first_child()` is Cinnamon's `_applet_icon_box`; `showErrorIcon` sets `'color: #ff4444;'` on it and only
  `setIdleIcon` clears it with `set_style(null)`. So a retry (ERROR → PROCESSING) keeps the red tint until IDLE. Never pass `''`
  to `set_style`: an empty string floods the log with St-CRITICAL cr_parser errors (026c736).
- The `child_watch` callback in `_spawnScript` must reach `setState` on every path. A single ReferenceError there (the
  undefined `EXIT_NEEDS_TYPING`, fabc0e9) left the icon pulsing forever, because the watchdog was already cleared. Wrap any new
  parsing in try/catch. Grep both files when you add or remove an exit code.
- `cancelTranscription` clears the watchdog, sends SIGTERM (`kill <pid>`), nulls `recordingProcess` and sets IDLE. The child_watch
  still fires later with no "cancelled" guard and acts on whatever exit code arrives: if the killed script exits 3 with
  `AUDIO_FILE=`, the retry dialog opens after a cancel. Add a guard if you touch this path.

## Exit codes → UI (child_watch in `_spawnScript`)

| Code | Reaction |
|---|---|
| 0 SUCCESS / 4 CANCELLED | clear retry, IDLE, silent |
| 1 CONFIG_ERROR | notify "Configuration error...", IDLE |
| 2 RECORDING_ERROR | notify, ERROR |
| 3 TRANSCRIPTION_ERROR | with `AUDIO_FILE=` → `_retryContext`, ERROR, `showRetryDialog`; else notify, ERROR |
| 5 TIMEOUT | text pasted; notify "Maximum recording time reached", IDLE |
| 6 CHAT_ERROR | with `TEXT_FILE=` and a custom prompt → chat-only retry dialog; else notify, ERROR |
| 7 PASTE_ERROR | text is in the clipboard; notify "paste it manually", IDLE |
| other | `errorMessage = "Process exited with code %d"`, ERROR |

In ERROR the next left click opens `showRetryDialog` (when `_retryContext` is set) or `showErrorDialog`.

To add an exit code: use the same number in the script and in applet.js; add a child_watch branch that ends in `setState`
(with `_clearRetryContext()` unless it creates a retry); add a translated message, the CLAUDE.md exit-code entry and
a test in tests/test_python_script_modifications.py (`test_exit_codes_defined`).

## Spawning processes

Two helpers own every `spawn_async_with_pipes` (the other spawns are fire-and-forget); reuse them, do not add a third:
- `_spawnScript(envp)` is the dictation run. It sets `this.recordingProcess = { pid: pid }`, maps the exit codes and strips the sentinels.
- `_runCommandAsync(argv, callback(success, stdout), envp)` runs xclip, zenity and `--list-models`.

File-descriptor discipline (0afedd4, after leaks caused "Too many open files" over many dictations):
1. Call `GLib.close(stdin_fd)` right after the spawn.
2. Wrap stdout and stderr each in `GLib.IOChannel.unix_new(fd)`, then call `set_flags(GLib.IOFlags.NONBLOCK)` and `set_close_on_unref(true)`.
3. In `child_watch_add`, `read_to_end()` what you need, then `shutdown(false)` on both channels, even an unused one. Then
   `GLib.spawn_close_pid(pid)`. The exit code is `(status >> 8) & 0xFF` (`status` is a wait status), so a child killed by a
   signal reads as 0, i.e. a silent SUCCESS.
4. To verify, run `ls /proc/$(pgrep -x cinnamon)/fd | wc -l` before and after several runs. The count must not grow.

- The pipes are read only after the child exits, so each stream must stay under the 64 KB pipe buffer, or the child blocks
  on write: in PROCESSING until the watchdog SIGTERMs it, in `_runCommandAsync` forever (it has no timeout). This is why
  `--list-models` stops at `MAX_LISTED_MODELS = 500` (ca4a848).
- stdout carries the `AUDIO_FILE=` / `TEXT_FILE=` sentinel lines and, on success, the pasted text (unused); `--list-models`
  prints one JSON object. Extend the protocol with new `KEY=` lines that child_watch strips, not a new channel.
- Configuration travels as env. `_buildBaseEnvp` starts from `GLib.get_environ()` and pushes `'KEY=' + value` per `whisperMode`
  branch. Booleans are `'1'`/`'0'` and optional strings default to `''`. A new required field also goes into `validateConfiguration()`.
- Pass argv arrays, not shell strings; the only `bash -c` is in `onExportToClipboard`. Signals go through
  `GLib.spawn_command_line_sync('kill -TERM ' + pid)`.
- `this.scriptPath` (the `script-path` setting) may point at an older script, so new flags must fail safe. For example,
  `_showCompatModelPicker` sets `WHISPER_MODE=openai-compatible`, so an old script exits instead of starting a recording.

## Timers and teardown

- Keep every `GLib.timeout_add` id in a `this._xxxId` field, with one stop function:
  `if (id) { GLib.source_remove(id); id = null; }`. A callback that returns `SOURCE_REMOVE` must null its id; the `catch`
  branches of both animation steps don't, so a later stop calls `source_remove` on a dead id (GLib "Source ID ... was not found").
- For animations, copy `_animateRecordingStep`: a step counter at `PRIORITY_DEFAULT` (never HIGH, no `queue_redraw()`, 026c736);
  the first line checks `currentState` and self-removes; opacity only, 255↔77 (848c3ee); a try/catch that returns `SOURCE_REMOVE`.
- The watchdog is not part of the animations (f7e0bbe). Clear it only in child_watch, in `cancelTranscription`, in its own callback,
  when re-arming it, and at teardown. Never clear it in `_cleanupLoadingDots` or `setState`.
- The watchdog must outlast the script. Transcription: 3 × (10 s connect + 30 s read) + 1 s + 3 s backoff ≈ 124 s → 150 s
  `PROCESSING_WATCHDOG_MS`. The chat step posts with `timeout=(10, 60)` (≈ 214 s worst case), so a custom prompt can need ≈ 338 s
  while `PROCESSING_WATCHDOG_CUSTOM_PROMPT_MS` is 240 s. Read timeouts are per socket read, not hard bounds. Recompute both when
  the script's timeouts or retries change (history: 60 → 45 → 150/240 s).
- `on_applet_removed_from_panel` stops the animations and the watchdog and calls `settings.finalize()`. It does not kill a
  running script or call `_clearRetryContext()` (despite that function's comment), so preserved files stay in /tmp. Add the
  cleanup for every new timer, signal or long-lived resource there.

## UI building blocks

- **Menu:** `_rebuildMenu()` rebuilds the menu from scratch, starting with `this.menu.removeAll()`. Settings that affect the menu are
  bound with `Lang.bind(this, this._rebuildMenu)` as their callback (`whisper-mode`, `custom-prompts`). Create items as
  `PopupMenu.PopupIconMenuItem(_("..."), "x-symbolic", St.IconType.SYMBOLIC)` and separate groups with `PopupSeparatorMenuItem`.
- **Clicks:** our `_onButtonPressEvent` shadows the method Cinnamon's `Applet._init` connects (checked in 6.4 `js/ui/applet.js`),
  bypassing the stock context menu and `on_applet_clicked` (dead code). Our extra `connect` in `_init` is redundant: for left/right
  clicks the first call already returned `Clutter.EVENT_STOP`. Keep the name: renamed, right-click opens Cinnamon's stock menu.
- **Dialogs:** `new ModalDialog.ModalDialog()` → a vertical `St.BoxLayout({ style_class: 'modal-dialog-content-box' })` with a bold
  title label (`'font-weight: bold; font-size: 14px; margin-bottom: 10px;'`) and a message label → `contentLayout.add(box)` →
  `setButtons([{ label: _("..."), action: ... }])` → `open()`. Warning text uses `#ff8800`; long text needs
  `clutter_text.line_wrap = true`. If a dialog waits for an async result, track `dialogClosed` and drop late results
  (`_showCompatModelPicker`). `showErrorDialog` returns to IDLE through its `closed` signal; `showRetryDialog` stays in ERROR
  unless the user presses Cancel, so a click reopens it.
- **Notifications:** `Main.notify("Voice Keyboard Perlover", _("..."))`. The title is the same untranslated literal everywhere.
  `Main.notifyError` is used only when the spawn itself throws.
- **Panel icons** use themed symbolic names: `audio-input-microphone-symbolic` for idle (it pulses while recording),
  `send-to-symbolic` for processing, and `dialog-warning-symbolic` tinted `#ff4444` for errors. The non-symbolic `cloud-upload` was
  invisible on dark panels (193ccf6). `icon.svg` is used by nothing: the Applets list looks for `icon.png` (cinnamon-settings `ExtensionCore.py`).
- **Styles:** Cinnamon loads stylesheet.css automatically. Prefix its classes with `voice-keyboard-`. Only `voice-keyboard-model-item`
  and `voice-keyboard-model-current` are used by the code. Keep one-off dialog styles inline in `style:`.

## Settings and i18n (applet side)

Adding a setting, button callbacks, export/import `skipTypes`, `_checkApiKeyWarning`, `_()` and placeholders: load the
**settings-and-i18n** skill. Applet-only rules:
- Read the bound properties (`this.compatModel`). For a key chosen at runtime, use `this.settings.getValue(key)` and `setValue(key, v)`.
- Open the settings window only with `Util.spawnCommandLine("xlet-settings applet " + this.metadata.uuid + " -i " + this.instance_id)`,
  as all four call sites do. The old `cinnamon-settings applets <uuid>` worked on earlier Cinnamon but fails on 6.6, where argparse rejects the extra argument (2ea39b9).
- A schema button calls the method named in its `"callback"`; nothing checks the name, so renaming an `onXxx` method silently breaks the button.
- Wrap only user-visible text in `_()`, never log text.

## Cinnamon compatibility

- `cinnamon-version` in metadata.json acts as a minimum: Cinnamon's `versionCheck` (`extension.js`) accepts any running version
  that is ≥ a listed one. Adding 6.6 only documented a tested release; removing 5.8 would raise the floor. Keep `gettext-domain`
  equal to the uuid; the `uuid` must equal the directory name.
- Prefer APIs the file already uses; anything new must exist in Cinnamon 5.8. The dev machine ran Cinnamon 6.4.14 / gjs 1.80.2 (2026-10).

## Testing

- The GJS suites run under plain `gjs`, no Cinnamon session needed. They test mock objects that copy the logic into each test
  file; none loads applet.js, so a green run proves nothing about an applet.js change: check it on the desktop. tests/MANUAL_TESTING_CHECKLIST.md predates the retry dialog, custom prompts, compat mode and export/import.
- `tests/state-machine-tests.js` dies before running any test, with `ImportError: No JS module 'ui' found in search path`: assigning
  `imports.ui = ...` triggers the importer. As a result `./tests/run-all-tests.sh` exits 1 with 5 of 6 suites passing. This is a known
  failure, not your regression.
- To check syntax against the real engine (the reported line numbers are 2 too high):
  ```bash
  gjs -c 'const GLib = imports.gi.GLib; let [ok, b] = GLib.file_get_contents(ARGV[0]); new Function(new TextDecoder().decode(b)); print("parses OK");' applet/voice-keyboard@perlover/applet.js
  ```

## Dev loop

1. `sudo make install` copies the applet to `/usr/share/cinnamon/applets/voice-keyboard@perlover/`, the script to `/usr/bin` and the `.mo` files.
2. Restart Cinnamon (Ctrl+Alt+Esc) or reload only the applet; this runs `on_applet_removed_from_panel`, then `_init` (re-reads the debug flag):
   ```bash
   dbus-send --session --dest=org.Cinnamon --type=method_call /org/Cinnamon org.Cinnamon.ReloadXlet string:voice-keyboard@perlover string:APPLET
   ```
3. Check the log with `grep -E '\[voice-keyboard\]|voice-keyboard@perlover' ~/.xsession-errors | tail -40`. A successful load prints
   `Loaded applet voice-keyboard@perlover in N ms`; a syntax or import error is logged with the uuid instead.
4. Exercise start/stop, a cancel during PROCESSING, a failing server (retry dialog) and a custom prompt, then repeat the fd count.
