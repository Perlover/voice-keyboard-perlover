#!/usr/bin/env python3
"""
Task 5.1: Tests for Python Script Modifications
Test text pasting, window tracking, maximum duration, clipboard operations, and exit codes
"""

import unittest
import subprocess
import os
import sys
import time
import tempfile
from pathlib import Path

# Add scripts directory to path
SCRIPT_PATH = Path(__file__).parent.parent / "scripts" / "whisper-voice-input"


class TestPythonScriptModifications(unittest.TestCase):
    """Test suite for Python script modifications in Task Group 5"""

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
        Task 5.3: Test that active window tracking functions exist
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
        Task 5.5: Test that maximum duration is handled correctly
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
        Task 5.6: Test that exit code system is properly defined
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


def run_tests():
    """Run all tests and return success status"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestPythonScriptModifications)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 70)
    print(f"Task Group 5 Python Script Tests Summary:")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success: {result.wasSuccessful()}")
    print("=" * 70)

    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
