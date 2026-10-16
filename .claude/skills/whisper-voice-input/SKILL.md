---
name: whisper-voice-input
description: "House style, applet contract and known pitfalls of the Python script scripts/whisper-voice-input and its test tests/test_python_script_modifications.py. Use when editing that script or test: a transcription backend (openai, openai-compatible, local), an env var the applet passes, exit codes, AUDIO_FILE/TEXT_FILE sentinels and the retry flow, --list-models JSON, requests timeouts and retries, base URL normalization, chat prompts and thinking/reasoning suppression, ffmpeg recording and SIGTERM, xclip/xdotool pasting, temp-file cleanup, or adding a Python test against a mock server. Also for debugging a failed transcription, a missing paste or a cancel that does not stop. Do NOT use for applet.js-only work (cinnamon-applet skill) or settings-schema.json and translations (settings-and-i18n skill). Russian: питоновский скрипт, скрипт распознавания, транскрипция, новый бэкенд распознавания, код выхода, повтор распознавания, вставка текста, запись ffmpeg, тест скрипта, список моделей."
---

# whisper-voice-input (Python script)

The applet runs this extension-less file once per dictation from the `script-path` setting
(default `/usr/bin/whisper-voice-input`). A repo edit does nothing on the desktop until you run
`sudo make install`, install a `.deb`, or point `script-path` at the repo file. To add a user
setting end to end, load the **settings-and-i18n** skill; for the applet side, **cinnamon-applet**.

## Verify every change

Beyond CLAUDE.md's `py_compile` and test run (22 tests, about 1 s, no network, X11 or mic):
```bash
python3 -m unittest tests.test_python_script_modifications.TestPythonScriptModifications.test_normalize_base_url
COMPAT_BASE_URL=http://host:8000 scripts/whisper-voice-input --list-models   # one JSON line, exit 0/1
```
`--list-models` is safe by hand: it never records or pastes. A full run pastes into the focused
window. `RETRY_TRANSCRIBE_FROM=<file.ogg>` skips the mic but **deletes that file on success**.

## Module layout (keep this order)

Docstring with `Usage:`, imports (the guarded `import requests` exits 1 if missing), constants
(non-obvious ones carry a *why* comment, like `MAX_LISTED_MODELS`), recording, `_post_with_retry`
and `normalize_base_url`, backends and `list_models*`, chat, X11 helpers, `_print_sentinel`,
`main()`, `__main__` guard. The guard is load-bearing: the tests import the file, and without it the
import would start recording. Helpers print `ERROR: ...` to stderr and return `None`, `False` or
`(False, False)`. **Only `main()` calls `sys.exit`**, apart from the import guard.

## Contract with the applet

`_buildBaseEnvp` starts from `GLib.get_environ()`, so session env vars leak in (settings-and-i18n
skill, "Env var trap"). It always adds
`WHISPER_MODE`, `WHISPER_LANGUAGE` and `RECORDING_DURATION`, then only the current mode's vars.
Callers push `CUSTOM_PROMPT`, `CHAT_MODEL` and `RETRY_*`. `_spawnScript` handles the result.

| Var | Default | Notes |
|---|---|---|
| `WHISPER_MODE` | `openai` | Lowercased. An unknown value exits 1. |
| `WHISPER_LANGUAGE` | `auto` | With `auto`, the `language` field is omitted. |
| `RECORDING_DURATION` | `300` | Parsed with `int()`, passed as ffmpeg `-t`. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | `''` / `whisper-1` | Required in `openai` mode, where it is also the chat key. Prompts are hidden in `local` mode, and the applet does not pass this key there. |
| `COMPAT_BASE_URL`, `COMPAT_MODEL` | required | Stripped. The URL always goes through `normalize_base_url`. |
| `COMPAT_API_KEY` | `''` | Optional. When empty, no `Authorization` header is sent. |
| `COMPAT_ENABLE_THINKING` | `''` | Only `'1'` allows reasoning. The applet sends `1` or `0`. |
| `WHISPER_LOCAL_URL` | required | A full endpoint (`.../asr`), not a base URL. Never normalized. |
| `CUSTOM_PROMPT` / `CHAT_MODEL` | `''` / `gpt-4o-mini` | A prompt adds the chat step. In compat mode, `_getChatModel` sends `compat-chat-model`. |
| `RETRY_TRANSCRIBE_FROM` | `''` | A preserved `.ogg`. Recording is skipped. A missing file exits 2. |
| `RETRY_CHAT_FROM` | `''` | A preserved `.txt`. Recording and transcription are skipped. A missing file exits 6. |

**Output.** stdout holds the final text after a paste, the sentinel lines `AUDIO_FILE=`/
`TEXT_FILE=` (from `_print_sentinel`, matched by prefix), or the `--list-models` JSON line. stderr
is a free-form log that the applet keeps only via `_debug` (`~/.voice-keyboard-debug`). Users see
only a fixed message for each exit code. **Both pipes are read only after the process exits**, so
more than 64 KB in either one blocks the script on write (same class of bug as 01e030c). Truncate
any server body you print (`[:300]`).

**Silence and captions.** Backends return `None` on failure (exit 3, audio kept for a retry) and
`''` for an empty answer. `drop_hallucinations` runs on every backend's text before the chat step:
Whisper answers silence or noise with a training-data caption (hub/stt: "Продолжение следует..."
4 of 4 times, 2026-10-16), and a short caption or a text without letters becomes `''`, a longer
text loses only a short caption sentence at its end. `''` exits 8 (`EXIT_NO_SPEECH`): no paste, no
chat request, no retry file. The phrase list follows the Tolmach server (`~/src/tolmach/server/
translator.py`, `HALLUCINATIONS`). Its whole-phrase phantoms ("Спасибо", "Thank you") are left
out on purpose: without a VAD a real "Спасибо!" would be lost.

**Exit codes.** How the applet reacts to each code, and the checklist for adding one, are in the
**cinnamon-applet** skill ("Exit codes → UI"). 3 and 6 lead to a retry dialog only if
`AUDIO_FILE=`/`TEXT_FILE=` was printed. 4 (`EXIT_CANCELLED`) is defined but never emitted.
An uncaught exception exits 1, which the user reads as **"check your settings"**, so catch
exceptions inside each step. A kill by signal decodes as 0 (`(status >> 8) & 0xFF`), i.e. success.

## HTTP calls

- **Timeouts.** Use `requests` only, always with a tuple timeout: transcription `(10, 30)`, chat
  `(10, 60)`, and `list_models` `(5, 15)`. `list_models` makes one attempt because the user waits.
- **Retries.** Every POST goes through `_post_with_retry(label, build_request)`. It tries 3 times
  with `[1, 3]` s backoff and retries **only** `Timeout`/`ConnectionError`. HTTP status codes go
  back to the caller, and it returns `None` when every attempt fails. **`build_request` must
  re-open the audio file on each attempt**, because the previous attempt consumed the stream.
- **Watchdog budget.** The applet kills a run that outlasts `PROCESSING_WATCHDOG_*`. If you change
  timeouts or attempts, recompute both values (math in the cinnamon-applet skill, "Timers").
- **Auth and errors.** Send `Authorization: Bearer` only when the key is non-empty. **Never send
  `OPENAI_API_KEY` to a compat server** (`test_main_compat_mode_wiring`). Shared code logs
  `ERROR: {label}: ...`; `transcribe_local` and `chat_completion` still use fixed prefixes.
- **Multipart.** Send the file as `(basename, f, 'audio/ogg')` and the model as `(None, model)`.
  Local mode sends the field `audio_file`, with `language` in `data=`.

## OpenAI-compatible mode and `--list-models` (ca4a848)

- **Shared request code.** `transcribe_openai` is `transcribe_openai_compatible` with
  `OPENAI_BASE_URL`, so a fix to request logic goes in one place.
- **`normalize_base_url`** strips whitespace, trailing `/` and **one** pasted endpoint suffix
  (`/audio/transcriptions`, `/chat/completions`, `/models`), and appends `/v1` to a bare host. Add
  a `test_normalize_base_url` case for every new rule.
- **`--list-models`** is dispatched first in `main()`, before validation and before any side
  effect. It reads only `COMPAT_BASE_URL` and `COMPAT_API_KEY`.
  Success prints `{"models": [...], "total": N, "base_url": ...}` and exits 0, with the list capped
  at `MAX_LISTED_MODELS` (500) to fit the 64 KB pipe. Failure prints `{"error": "...", "base_url":
  ...}` (no `base_url` when the URL is unset) and exits 1. The applet shows `error` **verbatim**, so
  write it as a plain English sentence. Print nothing else to stdout, or `JSON.parse` fails and the
  user sees "Unexpected response".
- **Older scripts.** The applet also sets `WHISPER_MODE=openai-compatible`, so an old script that
  ignores argv exits on the unknown mode instead of recording. Keep that property for new flags.

## Chat step and thinking suppression

- **`_is_reasoning_model`** (a `gpt-5.` prefix or a `-pro` suffix, not `gpt-5-mini`) means no
  `temperature`. All other models, compat ones included, get `0.3`: at 1.0 gpt-4o-mini sometimes
  ignored prompts (5e63604). No model gets `reasoning_effort`, because forcing it low leaked
  source-language words (211f449). This rule changed in 4 releases on 2026-02-12, so check the
  model docs before you touch it.
- **Compat mode** sends `chat_template_kwargs: {"enable_thinking": false}` (a vLLM/SGLang
  extension) unless thinking is allowed. Never send it to OpenAI.
- **Every mode** strips `^.*?</think>` (DOTALL), because some templates open `<think>` in the
  prompt. An empty answer returns `None`, which gives `EXIT_CHAT_ERROR` with the text kept.

## Retry flow and temp files (39b8b1c)

- **Temp files.** Audio is `tempfile.mktemp` `whisper-voice-*.ogg`; `whisper-voice-text-*.txt` is
  written only when chat fails. `preserve_audio`/`preserve_text` mark what to keep, and the
  `finally` in `main()` deletes everything else.
- **Ownership.** The script owns a file until it sets the preserve flag and prints the sentinel,
  right before `sys.exit(3|6)`. Then the applet owns it (`_clearRetryContext` deletes it). A retry
  hands the path back to the script, which deletes it on success.

## Recording and SIGTERM

- **ffmpeg.** Run `-f pulse -i default -t N -c:a libopus -b:a 32k -ar 16000 -ac 1` with stdout and
  stderr to **`DEVNULL`**, because an unread `PIPE` froze ffmpeg (01e030c). Record OGG, not M4A:
  M4A writes its moov atom at exit, so stopped recordings were corrupt (d4ace3c).
- **Stop.** `stopRecording` sends `kill -TERM`. The handler terminates ffmpeg (killed after 5 s)
  and raises `InterruptedError` out of `wait()`. The result is `(success, reached_max)`; ffmpeg
  exit 0 means the `-t` limit was hit.
- **The handler stays installed for the rest of a normal run** (reproduced 2026-10-16). A cancel
  or watchdog `kill` during HTTP surfaces as `ConnectionError('Connection aborted.',
  InterruptedError)`, so `_post_with_retry` re-sends and the script still pastes. Retry runs never
  install it: SIGTERM kills them outright, the applet reads exit 0, and the retry file stays in
  `/tmp` (no `finally`). A real cancel needs a flag set in the handler, a check in the retry loop,
  and `sys.exit(EXIT_CANCELLED)`.

## Pasting

- **Target window.** `get_active_window()` runs *before* recording, so the text lands where
  dictation began. Then `windowactivate --sync` and a 0.05 s sleep; a failure is a `WARNING:`.
- **Clipboard, then keys.** Copy to CLIPBOARD (required) and to PRIMARY (best effort: terminals
  paste PRIMARY on Shift+Insert, 3641d01). Then run `xdotool key --clearmodifiers shift+Insert`.
  Never use `xdotool type`: it flooded X11 and froze Cinnamon (69c64d2).
- **Run xclip with `DEVNULL`, never `capture_output=True`.** xclip forks to own the selection
  (`-silent`, the default), and the fork keeps the pipe open, so `run()` blocks until its timeout.

## Style and dependencies

- **Code.** Multi-line docstrings open with `"""` on their own line and state the return contract
  ("Returns (models, None) on success or (None, error_message) on failure"). Comments say *why*.
  Private helpers start with `_`. Use f-strings.
- **Logs.** Prefix with `ERROR:` or `WARNING:` (`WARN:` only in `_post_with_retry`). Progress lines
  are plain. Log sizes and lengths, never API keys.
- **Dependencies.** Stdlib plus `requests` only. A new binary goes into `debian/control` `Depends`.

## Adding a test

Add a stdlib-only method to `TestPythonScriptModifications`. Start each behaviour test with
`self._load_script_module()` for a fresh module, because tests monkeypatch module attributes.

- **Mock server.** `self._start_compat_server(chat_answer=...)` mimics a recorded LiteLLM gateway
  (dated in its docstring): `GET /v1/models` needs `Bearer compat-key` (else 401) and lists
  `hub/stt`; chat allows only `hub/instruct` (others get 403); POSTs never check auth, so assert the
  header from `requests_seen`. For another shape: `HTTPServer(("127.0.0.1", 0), Handler)` on a
  daemon thread, no-op `log_message`, `shutdown()` and `server_close()` in `finally`.
- **Running `main()`.** `self._run_main(module, env)` returns `(exit_code, pasted)`. It stubs paste
  and window lookup and swallows stdout. To check sentinels, redirect stdout yourself, as
  `test_main_compat_chat_denied_keeps_text_for_retry` does.
- **Skipping recording.** Put a fresh 64-byte `.ogg` in `RETRY_TRANSCRIBE_FROM` for each run,
  because `main()` deletes it on success. `patch.dict` merges with your shell env, so blank unused
  vars (`"RETRY_CHAT_FROM": ""`).
- **Backoff.** If every attempt fails with a connection error, the test sleeps 4 s unless you patch
  `NETWORK_RETRY_BACKOFF` to `[0, 0]`. End each test with `print("PASS: ...")`.
- **Source-grep tests.** 12 of the 22 tests do `assertIn("<exact text>", script_content)`.
  Reformatting quoted text breaks them: the xdotool argv, `paste_text(text, initial_window_id)`,
  `EXIT_CHAT_ERROR = 6`, and `/v1/chat/completions` (now only in the `chat_completion` docstring).
  Update them in the same change, and prefer behaviour tests for new code.

## Known gaps (as of 2026-10-16; do not "fix" silently, delete a line once it is fixed)

- **Cancel and the watchdog do not stop processing** (see SIGTERM above). A SIGTERM during the
  backoff `time.sleep` becomes `None` via the backend's broad `except`, so the script exits 3 or 6
  with a sentinel and `child_watch` opens a retry dialog after the cancel (reproduced 2026-10-16).
- **Exit 7** follows any `paste_text()` failure, even a failed CLIPBOARD copy, so "text is in the
  clipboard" can be false.
- **Leftovers.** Unused: `copy_to_clipboard()` (with the `capture_output` hang), `Path`,
  `EXIT_CANCELLED`, and the default `output_file`. Some error branches print all of `response.text`.
