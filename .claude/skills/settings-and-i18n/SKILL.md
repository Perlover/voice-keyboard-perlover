---
name: settings-and-i18n
description: "End-to-end recipe for adding, changing or removing a user setting of the Voice Keyboard applet and for any user-visible string: settings-schema.json entry (types, dependency syntax, button callbacks, @@VERSION@@), settings.bind and env var passing in applet.js, reading the env var in scripts/whisper-voice-input, and translating into all 6 languages in po/*.po plus the hand-maintained .pot. Use when editing settings-schema.json, _buildBaseEnvp, validateConfiguration, export/import of settings, po/*.po or voice-keyboard@perlover.pot, languages.json, the i18n Makefile target; when adding a new option, mode, button, tooltip, notification, dialog text or any _() string; when renaming a label or a combobox choice; when a translation does not show up or the settings window shows English. Russian triggers: добавить настройку, новая опция, поменять настройку, перевод, переводы, локализация, i18n, po файлы, строки интерфейса, подсказка, tooltip."
---

# Settings and i18n

CLAUDE.md already covers the basics of `settings.bind`, `dependency` and the env var list.
This skill holds the full recipe: which files a setting touches, Cinnamon's behaviour, and the manual translation workflow.

## Checklist: a new setting (worked example: ca4a848, v1.10.0 `compat-*` settings)

1. **`settings-schema.json`**: add the entry. JSON key order is the UI order. Every key after `export-import-header`
   belongs to the Export/Import section, so new settings go above it.
2. **`applet.js` `_init`**: add `this.settings.bind("compat-base-url", "compatBaseUrl")` (the property is the
   camelCase form of the key). Pass `Lang.bind(this, this._rebuildMenu)` as a third argument only if the value
   changes the right-click menu (as `whisper-mode` and `custom-prompts` do).
3. **`applet.js` `_buildBaseEnvp`**: pass the value to the script inside the right `whisperMode` branch
   (shared values go before the branches). Put it there and not at a call site: `startRecording`,
   `_startCustomPromptRecording` and the retry path `_retryFromContext` all build on it. `CHAT_MODEL` is still
   pushed at the last two call sites; when v1.10.0 made it mode-dependent, both had to change, so the logic went
   into `_getChatModel()`. Encode booleans as `'1'`/`'0'`. `_showCompatModelPicker` builds its own envp for
   `--list-models`, so a var that command needs goes there too.
4. **`applet.js` `validateConfiguration`**: add the setting here if the mode cannot work without it. The applet
   then notifies "Settings are not configured" (and a left-click opens the settings) instead of recording,
   so the script does not have to fail with exit 1.
5. **`applet.js` `_checkApiKeyWarning`**: add the key to the list if it holds a secret (`openai-api-key`, `compat-api-key`).
6. **`scripts/whisper-voice-input` `main()`**: read it with `os.environ.get('COMPAT_MODEL', '').strip()`. If it is
   required, print `ERROR: COMPAT_MODEL is not set` to stderr and exit with `EXIT_CONFIG_ERROR`.
7. **A default can live in up to three places**: the schema `default`, the applet fallback (`this.openaiModel || 'whisper-1'`,
   `_getChatModel`) and the Python `os.environ.get(..., default)` (`'whisper-1'`, `'300'`, `'gpt-4o-mini'`). Change them together.
8. **i18n**: add every new `description`, `tooltip`, `units`, option label and column title to the .pot and to all 6 .po files (see below).
9. **Tests**: in `tests/test_python_script_modifications.py`, drive `main()` through `_run_main(module, env)`
   (it uses `unittest.mock.patch.dict(os.environ, ...)`). `test_main_compat_mode_wiring` is the model to follow.
10. **Docs**: add the env var to the "Environment variables for config" bullet under "Python Script Constraints" in CLAUDE.md
    and to the env table in the `whisper-voice-input` skill. Add a user-facing step in the README
    "Configure Voice Input" section, naming the setting by its schema `description` in **bold**.
11. Version bump and changelog are covered by the `git-release` skill.

Export/import needs no change: `_buildExportData` and `_applyImportData` read the installed schema at runtime.
The exception is a new non-value type. Add it to `skipTypes`, which is duplicated in both functions.

## Schema conventions

- **Keys**: kebab-case, prefixed with the mode they belong to (`openai-*`, `compat-*`, `local-*`). Mode-independent keys
  have no prefix (`language`, `recording-duration`, `script-path`, `custom-prompts`); the older `chat-model` is
  OpenAI-only despite that. Env vars are SCREAMING_SNAKE (`compat-model` → `COMPAT_MODEL`). Exceptions:
  `local-url` → `WHISPER_LOCAL_URL`, `language` → `WHISPER_LANGUAGE`, and both `chat-model` and `compat-chat-model`
  → `CHAT_MODEL` (picked by `_getChatModel`).
- **Types in use**:
  - `entry`: URLs, keys, free-text model names.
  - `combobox`: `"options": {"Translatable Label": "stable-value"}`. The value goes to the config and the env, the label goes to the .pot.
  - `spinbutton`: needs `min`, `max`, `step`, and `units` is translated.
  - `switch`: not `checkbox` (marked deprecated in Cinnamon's `xlet-settings.py`).
  - `list`: needs `columns`, and each column `title` is translated.
  - `button`, `label` (help text, version) and `header` (starts a new section).
  - Value types also need `default` and `description`. A missing required field makes Cinnamon's `settings.js`
    log `Settings key X is missing property Y`: existing users silently keep the old schema ("upgrade failed"),
    and a fresh install gets no settings at all.
- **Button**: `"callback": "onCheckCompatConnection"` must name a method on `VoiceKeyboardApplet.prototype`
  (house style: `onX`). Cinnamon calls it over D-Bus (`activateCallback` in `cinnamonDBus.js`) with no arguments, bound to the applet.
  - House pattern: thin `onX` wrappers call one private helper with the setting key (`_showCompatModelPicker('compat-model')`).
  - Write results back with `this.settings.setValue(key, value)`. An open settings window picks the value up through its file monitor.
- **`dependency`**: one condition per entry. The forms are `key`, `!key`, `key=v`, `key!=v`, `<`, `>`, `<=`, `>=`.
  - There is no AND/OR. To show an entry in two of the three modes, exclude the third: `"whisper-mode!=local"` (custom prompts).
  - For a `switch`, use a bare `key` or `!key`, never `key=false`. Cinnamon casts the string with `bool("false")`, which gives `True`.
- **`@@VERSION@@`** appears only in `version-label`. `sed` replaces it in the installed copy of `settings-schema.json`
  (`make install`, `debian/rules`). Never commit a real version there. Running from the source tree shows the literal placeholder, as expected.
- Opening the settings window from code (`xlet-settings`, not `cinnamon-settings`, 2ea39b9): see the `cinnamon-applet` skill.

## Changing an existing setting: what users keep

When the applet loads with a schema whose md5 has changed, Cinnamon (`_doUpgrade` in `settings.js`) merges the schema into
`~/.config/cinnamon/spices/voice-keyboard@perlover/voice-keyboard@perlover.json` (named after the uuid: metadata sets
no `max-instances`, so the applet is single-instance):
- **Renaming a key loses the user's value.** Old keys are dropped, and `_applyImportData` skips unknown keys in old export files. Do not rename keys.
- **Changing `default`** does not touch existing users: their stored value is kept.
- **Removing a combobox value** resets users who had it selected to the default. This happened in v1.7.6, which removed `gpt-5-nano` and `gpt-5-mini`.
- **spinbutton**: the old value is kept only if `min < v < max`, strictly (`_checkSanity`, Cinnamon 6.4.14).
  A value exactly at `min` or `max` is reset to the default on every schema change: `recording-duration` set to 600 falls back to 300.
- **Schema text edits** show up in the settings window only after an install and a Cinnamon restart (Ctrl+Alt+Esc),
  because the window renders from that config copy, not from the installed schema.

## Env var trap (verified 2026-10-16)

`_buildBaseEnvp` and `_showCompatModelPicker` start from `GLib.get_environ()` and `push` the settings. If the Cinnamon
session already exports the same name (for example `OPENAI_API_KEY` in `~/.profile`), Python's `os.environ` keeps the
first occurrence, so **the session value wins and the setting is ignored**. The existing vars still have this latent bug.
For a new var, use `envp = GLib.environ_setenv(envp, 'NAME', value, true);`, which replaces the variable instead of duplicating it.

## How translation works here

- One gettext domain, the uuid `voice-keyboard@perlover`, and one .pot for both applet.js and schema strings.
  applet.js uses `UUID`, and `xlet-settings` calls `gettext.translation(uuid, ...)`. The `gettext-domain` field in
  `metadata.json` (added in 4cc5ebe) must stay equal to the uuid, although Cinnamon 6.4.14 never reads it.
- **applet.js**: `_()` calls `Gettext.bindtextdomain(UUID, "/usr/share/locale")` on every call. Cinnamon's appletManager
  re-binds the domain to `~/.local/share/locale` after the applet loads (4cc5ebe), so do not hoist the bind to module level.
- **Settings window** (`xlet-settings`, Python) translates `description`, `tooltip`, `units`, option labels, column
  titles and the `metadata.json` `name` (window title, currently missing from the .pot). It looks in `~/.local/share/locale`
  first, so a stale `.mo` there shadows the system one.
- **Not translated by design**:
  - The notification title `"Voice Keyboard Perlover"` and the `version-label`.
  - Python stderr: English, written to the debug log only.
  - The raw `--list-models` error detail, which `_showCompatModelPicker` shows as is.
  - Every other user-visible failure is an exit code that applet.js maps to a `_()` string, never script text.
- **Placeholders**: `_("Connected. Models available: %d").replace("%d", n)`. Use one placeholder per string,
  because `replace` only changes the first match. The code has no `ngettext`, so word a count so that one form
  fits every number ("Models available: %d").
- **Exact match**: the msgid must equal the source string byte for byte. The button `"Export Settings to File..."` and
  the zenity title `"Export Settings to File"` need two entries. Commit 16682c8 fixed the missing ones.

## Adding or changing a string (manual workflow, all 6 languages)

The .pot is **hand-maintained**. There is no xgettext or `cinnamon-xlet-makepot` target, its header has stayed at 1.8.0,
and all 7 files keep the **same entry order**. Do not regenerate it: that would rewrite every context comment.
1. Add the entry to `po/voice-keyboard@perlover.pot` with a context comment:
   - `#. applet.js - <where>`, for example `#. applet.js - compatible server connection dialog`.
   - `#. settings-schema.json`, optionally followed by ` - <key> <role>`.
   - Then `msgstr ""`. Put schema strings next to their schema neighbours and append applet.js strings at the end.
2. Insert the same entry at the same position in **ru, es, de, fr, zh and ja**, with real translations, in the same commit.
   An empty `msgstr` silently falls back to English.
3. **Changing English text** means editing the msgid in all 7 files and translating it again. **Removing a string** means
   deleting it in all 7 files. e491009 and dadda15 changed `chat-model` labels without doing this, which left
   dead msgids and English labels behind.
4. Keep `%s`/`%d`, `\"` escapes, technical tokens (`/v1`, `chat_template_kwargs`) and a trailing `...`, `: ` or
   space exactly as they are. When a tooltip names another control, use that control's translated label in native quotes
   (ru/es «…», fr « … », de „…“, zh “…”, ja 「…」).

## Validate

From the repo root:

```bash
python3 -m json.tool applet/voice-keyboard@perlover/settings-schema.json >/dev/null
for po in applet/voice-keyboard@perlover/po/*.po; do msgfmt -c -o /dev/null "$po" || echo "FAIL $po"; done  # debian/rules runs this at build
for l in ru es de fr zh ja; do msgcmp applet/voice-keyboard@perlover/po/$l.po applet/voice-keyboard@perlover/po/voice-keyboard@perlover.pot; done
python3 .claude/skills/settings-and-i18n/check-i18n.py
```

`msgfmt -c` does **not** catch an empty `msgstr` or a dropped `%s`, because the entries carry no `c-format` flag;
`check-i18n.py` does, and also lists strings missing from the .pot or no longer used. It prints nothing when everything
is clean. As of v1.10.0 (2026-10-16) it reports known debt: `seconds`, `GPT-4o`, `GPT-4o Mini` and
`GPT-5.2 (most powerful)` NOT IN .pot, three old chat-model labels STALE. Judge only new lines.

To check on the desktop:
1. Run `sudo make install`. Its `i18n` prerequisite compiles into the gitignored `applet/.../locale/`; install substitutes
   `@@VERSION@@` and it installs the `.mo` files to `/usr/share/locale`.
2. Restart Cinnamon and open the settings.
3. For a headless check of an installed translation, run
   `LANGUAGE=ru python3 -c "import gettext; print(gettext.translation('voice-keyboard@perlover','/usr/share/locale').gettext('Server Base URL'))"`.

## languages.json

Nothing in the code, tests or build reads it; `cp -r applet/...` merely ships it. It mirrors the schema `language` options (the recognition languages
`auto`, `ru`, `en`, `es`, `de`, `fr`, `zh`, `ja`), not the UI locales. The UI languages are the `po/*.po` files.
To add a recognition language, update the schema `language` options and their English label in the .pot and the .po files,
and keep `languages.json` in sync.
