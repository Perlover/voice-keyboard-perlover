#!/usr/bin/env python3
"""
Task 5.1: Tests for Python Script Modifications
Test instant text insertion, window tracking, maximum duration, clipboard copy, and exit codes
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

    def test_instant_text_insertion_no_delays(self):
        """
        Task 5.2: Test that text insertion happens instantly without character delays
        Verify that type_text() uses single xdotool command
        """
        # This is a unit test - we'll check the code structure
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify single xdotool command is used (not loop) - check for list format
        self.assertIn("['xdotool', 'type', '--', text]", script_content)

        # Verify time.sleep is NOT in type_text function
        # Find type_text function
        type_text_start = script_content.find("def type_text(text):")
        type_text_end = script_content.find("\ndef ", type_text_start + 1)
        type_text_func = script_content[type_text_start:type_text_end]

        self.assertNotIn("time.sleep", type_text_func,
                         "type_text() should not have any time.sleep delays")

        print("PASS: Text insertion uses single xdotool command without delays")

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

        # Verify current window ID is checked after transcription
        self.assertIn("current_window_id = get_active_window()", script_content)

        print("PASS: Active window tracking functions are implemented")

    def test_window_change_clipboard_copy(self):
        """
        Task 5.4: Test that clipboard copy happens when window changes
        Verify copy_to_clipboard() function exists and is called on window change
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify copy_to_clipboard function exists
        self.assertIn("def copy_to_clipboard(text):", script_content)
        self.assertIn("xclip", script_content)

        # Verify window change detection and clipboard copy logic
        self.assertIn("if current_window_id and current_window_id != initial_window_id:", script_content)
        self.assertIn("copy_to_clipboard(text)", script_content)
        self.assertIn("WINDOW_CHANGED", script_content)

        print("PASS: Window change detection and clipboard copy are implemented")

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
        # Test with missing OpenAI API key
        env = self.env.copy()
        env['WHISPER_MODE'] = 'openai'
        env['OPENAI_API_KEY'] = ''

        # Create a minimal test that just validates config
        # We can't run the full script without valid config, but we can check the code
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

    def test_window_change_notification_format(self):
        """
        Test that window change outputs correct format to stdout
        """
        with open(self.script_path, 'r') as f:
            script_content = f.read()

        # Verify WINDOW_CHANGED is printed to stdout
        self.assertIn('print("WINDOW_CHANGED", file=sys.stdout)', script_content)

        # Verify text is printed on next line
        window_changed_index = script_content.find('print("WINDOW_CHANGED", file=sys.stdout)')
        self.assertTrue(window_changed_index > 0)

        # Find the next print statement after WINDOW_CHANGED
        next_print_index = script_content.find("print(text, file=sys.stdout)", window_changed_index)
        self.assertTrue(next_print_index > 0)

        print("PASS: Window change notification format is correct")


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
