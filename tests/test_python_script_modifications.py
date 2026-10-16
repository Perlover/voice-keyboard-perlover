#!/usr/bin/env python3
"""
Tests for scripts/whisper-voice-input
Test text pasting, window tracking, maximum duration, clipboard operations, and exit codes
"""

import unittest
import subprocess
import os
import sys
import time
import tempfile
import io
import json
import contextlib
import threading
import http.server
import unittest.mock
import importlib.machinery
import importlib.util
from pathlib import Path

# Add scripts directory to path
SCRIPT_PATH = Path(__file__).parent.parent / "scripts" / "whisper-voice-input"


class TestPythonScriptModifications(unittest.TestCase):
    """Tests for scripts/whisper-voice-input"""

    def setUp(self):
        """Set up test environment"""
        self.script_path = str(SCRIPT_PATH)
        self.env = os.environ.copy()

    def test_paste_text_function(self):
        """
        Test that paste_text() function uses clipboard + Shift+Insert method
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify paste_text function exists
        self.assertIn("def paste_text(text, window_id=None):", script_content)

        # Verify it copies to clipboard
        self.assertIn("'xclip', '-selection', 'clipboard', '-i'", script_content)

        # Verify it also copies to PRIMARY (for terminals)
        self.assertIn("'xclip', '-selection', 'primary', '-i'", script_content)

        # Verify Shift+Insert is used for pasting
        self.assertIn("'xdotool', 'key', '--clearmodifiers', 'shift+Insert'", script_content)

        print("PASS: paste_text uses clipboard + Shift+Insert method")

    def test_active_window_tracking_functions(self):
        """
        Test that active window tracking functions exist
        Verify get_active_window() function is implemented
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify get_active_window function exists
        self.assertIn("def get_active_window():", script_content)
        self.assertIn("'xdotool', 'getactivewindow'", script_content)

        # Verify initial window ID is captured
        self.assertIn("initial_window_id = get_active_window()", script_content)

        print("PASS: Active window tracking functions are implemented")

    def test_window_activation_before_paste(self):
        """
        Test that window is activated before pasting text
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify window activation code exists in paste_text
        self.assertIn("'xdotool', 'windowactivate', '--sync', window_id", script_content)

        # Verify paste_text is called with initial_window_id
        self.assertIn("paste_text(text, initial_window_id)", script_content)

        print("PASS: Window activation before paste is implemented")

    def test_maximum_duration_handling(self):
        """
        Test that maximum duration is handled correctly
        Verify record_audio_user_controlled uses max_duration parameter
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify user-controlled recording function exists
        self.assertIn("def record_audio_user_controlled(", script_content)

        # Verify max_duration parameter
        self.assertIn("max_duration=300", script_content)

        # Verify SIGTERM handler
        self.assertIn("signal.SIGTERM", script_content)
        self.assertIn("signal_handler", script_content)

        # Verify max duration is read from environment
        self.assertIn("RECORDING_DURATION", script_content)

        print("PASS: Maximum duration handling is implemented")

    def test_exit_codes_defined(self):
        """
        Test that exit code system is properly defined
        Verify all required exit codes are defined
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify exit code constants
        self.assertIn("EXIT_SUCCESS = 0", script_content)
        self.assertIn("EXIT_CONFIG_ERROR = 1", script_content)
        self.assertIn("EXIT_RECORDING_ERROR = 2", script_content)
        self.assertIn("EXIT_TRANSCRIPTION_ERROR = 3", script_content)
        self.assertIn("EXIT_CANCELLED = 4", script_content)
        self.assertIn("EXIT_TIMEOUT = 5", script_content)

        # Verify exit codes are used
        self.assertIn("sys.exit(EXIT_SUCCESS)", script_content)
        self.assertIn("sys.exit(EXIT_CONFIG_ERROR)", script_content)
        self.assertIn("sys.exit(EXIT_RECORDING_ERROR)", script_content)
        self.assertIn("sys.exit(EXIT_TRANSCRIPTION_ERROR)", script_content)
        self.assertIn("sys.exit(EXIT_TIMEOUT)", script_content)

        print("PASS: All exit codes are properly defined and used")

    def test_configuration_validation(self):
        """
        Test that configuration errors return proper exit code
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify configuration validation exists
        self.assertIn("if not api_key:", script_content)
        self.assertIn("EXIT_CONFIG_ERROR", script_content)

        print("PASS: Configuration validation returns proper exit codes")

    def test_recording_returns_tuple(self):
        """
        Test that recording function returns tuple with success and reached_max flags
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify record_audio_user_controlled returns tuple
        self.assertIn("return (True, True)", script_content)  # Success, reached max
        self.assertIn("return (True, False)", script_content)  # Success, user stopped
        self.assertIn("return (False, False)", script_content)  # Failure

        # Verify tuple is unpacked correctly
        self.assertIn("success, reached_max = record_audio_user_controlled", script_content)

        print("PASS: Recording function returns proper tuple")

    def test_no_paste_method_option(self):
        """
        Test that PASTE_METHOD environment variable is not used anymore
        Clipboard + Shift+Insert is the only method now
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify PASTE_METHOD is not used
        self.assertNotIn("PASTE_METHOD", script_content)

        # Verify type_text_primary function is removed
        self.assertNotIn("def type_text_primary(", script_content)

        # Verify old type_text with method parameter is removed
        self.assertNotIn("def type_text(text, method=", script_content)

        print("PASS: Paste method option removed, only clipboard method remains")

    def test_chat_completion_function(self):
        """
        Test that chat_completion() function exists for custom prompt processing
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify chat_completion function exists
        self.assertIn("def chat_completion(text, system_prompt, api_key, model=", script_content)

        # Verify it uses Chat API endpoint
        self.assertIn("/v1/chat/completions", script_content)

        # Verify it sends system and user messages
        self.assertIn('"role": "system"', script_content)
        self.assertIn('"role": "user"', script_content)

        print("PASS: chat_completion function is implemented")

    def test_custom_prompt_env_vars(self):
        """
        Test that CUSTOM_PROMPT and CHAT_MODEL environment variables are handled
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify CUSTOM_PROMPT env var is read
        self.assertIn("CUSTOM_PROMPT", script_content)

        # Verify CHAT_MODEL env var is read
        self.assertIn("CHAT_MODEL", script_content)

        # Verify custom prompt triggers chat_completion
        self.assertIn("if custom_prompt:", script_content)

        print("PASS: Custom prompt environment variables are handled")

    def test_exit_chat_error_defined(self):
        """
        Test that EXIT_CHAT_ERROR exit code is defined and used
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify EXIT_CHAT_ERROR constant
        self.assertIn("EXIT_CHAT_ERROR = 6", script_content)

        # Verify it is used
        self.assertIn("sys.exit(EXIT_CHAT_ERROR)", script_content)

        print("PASS: EXIT_CHAT_ERROR exit code is defined and used")

    def _load_script_module(self):
        """Import the extensionless script as a module (main() is not run)"""
        loader = importlib.machinery.SourceFileLoader("whisper_voice_input", self.script_path)
        spec = importlib.util.spec_from_loader(loader.name, loader)
        module = importlib.util.module_from_spec(spec)
        loader.exec_module(module)
        return module

    def test_compat_mode_env_vars(self):
        """
        Test that OpenAI-compatible mode reads its config and validates it
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        self.assertIn("whisper_mode == 'openai-compatible'", script_content)
        self.assertIn("COMPAT_BASE_URL", script_content)
        self.assertIn("COMPAT_API_KEY", script_content)
        self.assertIn("COMPAT_MODEL", script_content)
        self.assertIn("'--list-models'", script_content)

        print("PASS: OpenAI-compatible mode environment variables are handled")

    def test_normalize_base_url(self):
        """
        Test base URL normalization: trailing slash, pasted endpoint, bare host
        """
        module = self._load_script_module()
        cases = {
            "https://hub.example.com/v1": "https://hub.example.com/v1",
            "https://hub.example.com/v1/": "https://hub.example.com/v1",
            "https://hub.example.com": "https://hub.example.com/v1",
            "https://hub.example.com/v1/audio/transcriptions": "https://hub.example.com/v1",
            "https://hub.example.com/openai/v1/models/": "https://hub.example.com/openai/v1",
        }
        for url, expected in cases.items():
            self.assertEqual(module.normalize_base_url(url), expected, url)

        print("PASS: Base URL normalization works")

    def test_list_models_against_mock_server(self):
        """
        Test list_models() with a local OpenAI-compatible mock server:
        key is sent as Bearer, duplicates are dropped, bad key gives an error
        """
        module = self._load_script_module()

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_GET(self):
                if self.headers.get("Authorization") != "Bearer test-key":
                    code, payload = 401, {"error": "unauthorized"}
                else:
                    code, payload = 200, {"object": "list", "data": [
                        {"id": "llama-3"}, {"id": "My-Whisper-Custom"}, {"id": "llama-3"}]}
                body = json.dumps(payload).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base_url = f"http://127.0.0.1:{server.server_port}/v1"

            models, error = module.list_models(base_url, "test-key")
            self.assertIsNone(error)
            self.assertEqual(models, ["llama-3", "My-Whisper-Custom"])

            models, error = module.list_models(base_url, "wrong-key")
            self.assertIsNone(models)
            self.assertIn("401", error)
        finally:
            server.shutdown()
            server.server_close()

        print("PASS: list_models works against an OpenAI-compatible server")

    def test_chat_completion_against_compatible_server(self):
        """
        Test chat_completion() with a custom base URL: request goes to
        {base}/chat/completions, no key means no Authorization header,
        a reasoning model's <think> block is not returned
        """
        module = self._load_script_module()
        requests_seen = []

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_POST(self):
                length = int(self.headers.get("Content-Length", 0))
                requests_seen.append({
                    "path": self.path,
                    "auth": self.headers.get("Authorization"),
                    "body": json.loads(self.rfile.read(length)),
                })
                answer = "<think>\nthe user wants a fix\n</think>\n\nFixed text."
                body = json.dumps({"choices": [{"message": {"content": answer}}]}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base_url = f"http://127.0.0.1:{server.server_port}/v1"
            result = module.chat_completion("fix me", "Fix grammar", "", "hub/chat",
                                            base_url=base_url, label="test chat")
            self.assertEqual(result, "Fixed text.")
            self.assertEqual(requests_seen[0]["path"], "/v1/chat/completions")
            self.assertIsNone(requests_seen[0]["auth"])
            self.assertEqual(requests_seen[0]["body"]["model"], "hub/chat")
            self.assertEqual(requests_seen[0]["body"]["messages"][0],
                             {"role": "system", "content": "Fix grammar"})
            # The function itself leaves reasoning to the model; main() switches it
            # off by default (see test_main_compat_mode_wiring)
            self.assertNotIn("chat_template_kwargs", requests_seen[0]["body"])

            module.chat_completion("fix me", "Fix grammar", "", "hub/instruct",
                                   base_url=base_url, disable_thinking=True)
            self.assertEqual(requests_seen[1]["body"]["chat_template_kwargs"],
                             {"enable_thinking": False})
            requests_seen.pop()

            # Empty model is a configuration error, not a request
            self.assertIsNone(module.chat_completion("x", "y", "", "", base_url=base_url))
            self.assertEqual(len(requests_seen), 1)
        finally:
            server.shutdown()
            server.server_close()

        print("PASS: chat_completion works against an OpenAI-compatible server")

    def _start_compat_server(self, chat_answer="Ahoj."):
        """
        Mock OpenAI-compatible server shaped after a recorded LiteLLM gateway
        (2026-10-16): /v1/models filtered by key, 403 for a model the key may
        not use. Returns (server, requests_seen); call server.shutdown().
        """
        requests_seen = []

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def _reply(self, code, payload):
                body = json.dumps(payload).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_GET(self):
                requests_seen.append({"path": self.path, "auth": self.headers.get("Authorization")})
                if self.headers.get("Authorization") != "Bearer compat-key":
                    return self._reply(401, {"error": {"message": "Invalid key"}})
                self._reply(200, {"data": [{"id": "hub/stt", "object": "model",
                                            "owned_by": "openai", "max_input_tokens": 448}],
                                  "object": "list"})

            def do_POST(self):
                raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
                seen = {"path": self.path, "auth": self.headers.get("Authorization"), "raw": raw}
                requests_seen.append(seen)
                if self.path == "/v1/audio/transcriptions":
                    return self._reply(200, {"text": " Ahoj světe. "})
                body = json.loads(raw)
                seen["body"] = body
                if body["model"] != "hub/instruct":
                    return self._reply(403, {"error": {
                        "message": f"The requested model '{body['model']}' is not available for this API key",
                        "type": "key_model_access_denied", "code": "403"}})
                self._reply(200, {"choices": [{"message": {"content": chat_answer}}]})

        server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        return server, requests_seen

    def _run_main(self, module, env):
        """Run main() with env; paste and window tracking stubbed. Returns (exit code, pasted)"""
        pasted = []
        module.get_active_window = lambda: None
        module.paste_text = lambda text, window_id=None: pasted.append(text) or True
        with unittest.mock.patch.dict(os.environ, env), \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            try:
                module.main()
            except SystemExit as e:
                return e.code, pasted
        return None, pasted

    def test_main_compat_mode_wiring(self):
        """
        Test main() in openai-compatible mode end to end (recording skipped via
        RETRY_TRANSCRIBE_FROM): transcription and prompt go to the compatible
        server with its key — never the OpenAI key — and reasoning is off by
        default
        """
        module = self._load_script_module()
        server, requests_seen = self._start_compat_server()
        try:
            for allow_thinking in ("", "1"):
                requests_seen.clear()
                audio = tempfile.NamedTemporaryFile(suffix=".ogg", delete=False)
                audio.write(b"\x00" * 64)
                audio.close()
                env = {
                    "WHISPER_MODE": "openai-compatible",
                    # Bare host: the script must append /v1 itself
                    "COMPAT_BASE_URL": f"http://127.0.0.1:{server.server_port}",
                    "COMPAT_API_KEY": "compat-key",
                    "COMPAT_MODEL": "hub/stt",
                    "COMPAT_ENABLE_THINKING": allow_thinking,
                    "OPENAI_API_KEY": "openai-key-must-not-leak",
                    "CUSTOM_PROMPT": "Translate to Czech",
                    "CHAT_MODEL": "hub/instruct",
                    "RETRY_TRANSCRIBE_FROM": audio.name,
                    "RETRY_CHAT_FROM": "",
                }
                code, pasted = self._run_main(module, env)
                self.assertEqual(code, module.EXIT_SUCCESS)
                self.assertEqual(pasted, ["Ahoj."])

                transcription, chat = requests_seen
                self.assertEqual(transcription["path"], "/v1/audio/transcriptions")
                self.assertEqual(transcription["auth"], "Bearer compat-key")
                self.assertIn(b'name="model"\r\n\r\nhub/stt', transcription["raw"])
                self.assertEqual(chat["path"], "/v1/chat/completions")
                self.assertEqual(chat["auth"], "Bearer compat-key")
                if allow_thinking:
                    self.assertNotIn("chat_template_kwargs", chat["body"])
                else:
                    self.assertEqual(chat["body"]["chat_template_kwargs"], {"enable_thinking": False})
        finally:
            server.shutdown()
            server.server_close()

        print("PASS: main() routes compat mode to the compatible server with its key")

    def test_main_compat_chat_denied_keeps_text_for_retry(self):
        """
        Test that a 403 for the chat model (key without access) ends with
        EXIT_CHAT_ERROR and a TEXT_FILE sentinel, so the applet can retry
        """
        module = self._load_script_module()
        server, requests_seen = self._start_compat_server()
        audio = tempfile.NamedTemporaryFile(suffix=".ogg", delete=False)
        audio.write(b"\x00" * 64)
        audio.close()
        stdout = io.StringIO()
        try:
            module.get_active_window = lambda: None
            module.paste_text = lambda text, window_id=None: True
            env = {
                "WHISPER_MODE": "openai-compatible",
                "COMPAT_BASE_URL": f"http://127.0.0.1:{server.server_port}/v1",
                "COMPAT_API_KEY": "compat-key",
                "COMPAT_MODEL": "hub/stt",
                "CUSTOM_PROMPT": "Translate to Czech",
                "CHAT_MODEL": "hub/chat",
                "RETRY_TRANSCRIBE_FROM": audio.name,
                "RETRY_CHAT_FROM": "",
            }
            with unittest.mock.patch.dict(os.environ, env), \
                    contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as ctx:
                    module.main()
            self.assertEqual(ctx.exception.code, module.EXIT_CHAT_ERROR)
            text_files = [line[len("TEXT_FILE="):] for line in stdout.getvalue().splitlines()
                          if line.startswith("TEXT_FILE=")]
            self.assertEqual(len(text_files), 1)
            with open(text_files[0], encoding="utf-8") as f:
                self.assertEqual(f.read(), "Ahoj světe.")
            os.remove(text_files[0])
        finally:
            server.shutdown()
            server.server_close()

        print("PASS: denied chat model keeps recognized text for retry")

    def test_list_models_command_output(self):
        """
        Test the --list-models contract the applet parses: JSON on stdout and
        exit code, for success and for a rejected key
        """
        module = self._load_script_module()
        server, _ = self._start_compat_server()
        try:
            base = f"http://127.0.0.1:{server.server_port}/v1/"
            for key, expected_code in (("compat-key", module.EXIT_SUCCESS),
                                       ("wrong-key", module.EXIT_CONFIG_ERROR)):
                stdout = io.StringIO()
                with unittest.mock.patch.dict(os.environ, {"COMPAT_BASE_URL": base, "COMPAT_API_KEY": key}), \
                        contextlib.redirect_stdout(stdout):
                    code = module.list_models_command()
                self.assertEqual(code, expected_code)
                result = json.loads(stdout.getvalue())
                if expected_code == module.EXIT_SUCCESS:
                    self.assertEqual(result["models"], ["hub/stt"])
                    self.assertEqual(result["total"], 1)
                else:
                    self.assertIn("401", result["error"])
        finally:
            server.shutdown()
            server.server_close()

        print("PASS: --list-models prints the JSON contract the applet reads")

    def test_list_models_output_fits_pipe_buffer(self):
        """
        Test that a huge model list is capped: the applet reads stdout only
        after the process exits, so output above 64 KB would block it forever
        """
        module = self._load_script_module()
        names = [f"vendor/model-with-a-rather-long-descriptive-name-{i:05d}" for i in range(3000)]
        stdout = io.StringIO()
        with unittest.mock.patch.object(module, "list_models", lambda base, key: (names, None)), \
                unittest.mock.patch.dict(os.environ, {"COMPAT_BASE_URL": "http://h/v1"}), \
                contextlib.redirect_stdout(stdout):
            self.assertEqual(module.list_models_command(), module.EXIT_SUCCESS)
        result = json.loads(stdout.getvalue())
        self.assertEqual(result["total"], 3000)
        self.assertEqual(len(result["models"]), module.MAX_LISTED_MODELS)
        self.assertLess(len(stdout.getvalue().encode()), 64 * 1024)

        print("PASS: --list-models output stays within the pipe buffer")

    def test_thinking_without_opening_tag_is_stripped(self):
        """
        Test that reasoning of DeepSeek-R1 / QwQ style models, whose <think> is
        opened by the prompt template, is not returned (and pasted)
        """
        module = self._load_script_module()
        answers = {
            "reasoning goes here\n</think>\n\nAhoj.": "Ahoj.",
            "<think>\nreasoning\n</think>\n\nAhoj.": "Ahoj.",
            "Ahoj.": "Ahoj.",
        }
        for raw, expected in answers.items():
            server, _ = self._start_compat_server(chat_answer=raw)
            try:
                with contextlib.redirect_stderr(io.StringIO()):
                    result = module.chat_completion(
                        "x", "Translate", "compat-key", "hub/instruct",
                        base_url=f"http://127.0.0.1:{server.server_port}/v1")
                self.assertEqual(result, expected, raw)
            finally:
                server.shutdown()
                server.server_close()

        print("PASS: model thinking is never returned")


def run_tests():
    """Run all tests and return success status"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestPythonScriptModifications)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 70)
    print("Python Script Tests Summary:")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success: {result.wasSuccessful()}")
    print("=" * 70)

    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
