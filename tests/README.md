# Tests for Click-to-Toggle Voice Recording Feature

This directory contains all automated and manual tests for the click-to-toggle voice recording feature implemented across Task Groups 1-6.

## Test Files

### Automated Unit Tests (GJS)
- **`state-machine-tests.js`** - State machine foundation tests (Task 1.1, 8 tests)
- **`click-handler-tests.js`** - Click handler implementation tests (Task 2.1, 8 tests)
- **`idle-recording-tests.js`** - IDLE and RECORDING state tests (Task 3.1, 8 tests)
- **`processing-error-tests.js`** - PROCESSING and ERROR state tests (Task 4.1, 8 tests)

### Automated Unit Tests (Python)
- **`test_python_script_modifications.py`** - Python script modification tests (Task 5.1, 8 tests)

### Automated Integration Tests (GJS)
- **`integration-tests.js`** - End-to-end workflow tests (Task 6.5, 10 tests)

### Manual Tests
- **`MANUAL_TESTING_CHECKLIST.md`** - Comprehensive manual testing guide (Task 6.7, 15 scenarios)

### Test Utilities
- **`run-all-tests.sh`** - Automated test runner for all test suites
- **`TEST_SUMMARY.md`** - Complete test coverage documentation and analysis

## Running Tests

### Run All Automated Tests
```bash
cd /home/perlover/src/voice-keyboard@perlover/tests
./run-all-tests.sh
```

**Note:** GJS tests require Cinnamon desktop environment. Python tests will run in any environment.

### Run Python Tests Only
```bash
cd /home/perlover/src/voice-keyboard@perlover/tests
python3 test_python_script_modifications.py
```

### Run Individual GJS Tests (Requires Cinnamon)
```bash
cd /home/perlover/src/voice-keyboard@perlover/tests
gjs state-machine-tests.js
gjs click-handler-tests.js
gjs idle-recording-tests.js
gjs processing-error-tests.js
gjs integration-tests.js
```

### Run Manual Tests
1. Install the applet in Cinnamon desktop environment
2. Open `MANUAL_TESTING_CHECKLIST.md`
3. Follow each test scenario step-by-step
4. Check off completed tests
5. Document any issues found

## Test Coverage

### Summary
- **Unit Tests:** 40 tests (34 GJS + 8 Python)
- **Integration Tests:** 10 tests (GJS)
- **Manual Tests:** 15 test scenarios
- **Total:** 65 test cases

### By Feature
- State Machine: 8 tests
- Click Handlers: 8 tests
- IDLE/RECORDING States: 8 tests
- PROCESSING/ERROR States: 8 tests
- Python Script Modifications: 8 tests
- End-to-End Integration: 10 tests
- Manual Workflows: 15 scenarios

## Test Status

### Python Tests: ✅ PASSING
All 8 Python script modification tests pass successfully.

### GJS Tests: ⚠️ REQUIRE CINNAMON ENVIRONMENT
44 GJS tests are written and ready but require `gjs` runtime from Cinnamon desktop environment.

### Manual Tests: 📋 CHECKLIST PROVIDED
15 comprehensive manual test scenarios documented and ready for execution.

## Documentation

For detailed information about tests, coverage, and execution:
- See **`TEST_SUMMARY.md`** for comprehensive test documentation
- See **`MANUAL_TESTING_CHECKLIST.md`** for step-by-step manual testing guide
- See **`../agent-os/specs/2025-11-20-click-to-toggle-voice-recording/IMPLEMENTATION_COMPLETE.md`** for implementation summary

## Requirements

### For GJS Tests:
- Cinnamon desktop environment (5.8+)
- `gjs` runtime

### For Python Tests:
- Python 3
- No additional dependencies (tests use code inspection)

### For Manual Tests:
- Cinnamon desktop environment
- Voice Keyboard Perlover applet installed
- Working audio input (microphone)
- OpenAI API key OR local Whisper server
- `xdotool` installed
- `xclip` installed
- `ffmpeg` installed

## Test Execution Tips

### GJS Tests Not Running?
If you get "gjs: command not found":
- GJS tests require Cinnamon desktop environment
- Install Cinnamon and run tests from within that environment
- Alternatively, review tests for logic verification (they are well-structured)

### Python Tests Failing?
If Python tests fail:
- Verify you're in the tests directory
- Ensure the Python script exists at `../scripts/whisper-voice-input`
- Check that you have Python 3 installed

### Need Help?
- Check `TEST_SUMMARY.md` for detailed test documentation
- Review individual test files for specific test logic
- See `MANUAL_TESTING_CHECKLIST.md` for manual testing guidance

## Contributing

When adding new tests:
1. Follow existing test structure and naming conventions
2. Keep tests focused (2-8 tests per feature area)
3. Add integration tests for end-to-end workflows
4. Update `TEST_SUMMARY.md` with new test information
5. Update this README if adding new test files

## License

Tests are part of Voice Keyboard Perlover project and follow the same MIT License.

---

**Last Updated:** 2025-11-20
**Feature:** Click-to-Toggle Voice Recording v1.1.0
**Total Tests:** 65 (50 automated + 15 manual)
