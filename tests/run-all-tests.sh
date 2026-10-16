#!/bin/bash
#
# Run all automated tests (GJS + Python)
#

set -e

TESTS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$TESTS_DIR")"

echo "========================================="
echo "Running Voice Keyboard Tests"
echo "========================================="
echo ""

TOTAL_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_script="$2"
    local test_type="${3:-gjs}"  # Default to gjs

    echo ""
    echo "========================================="
    echo "Running: $test_name"
    echo "========================================="

    if [ "$test_type" = "python" ]; then
        if python3 "$test_script"; then
            echo "✓ $test_name PASSED"
        else
            echo "✗ $test_name FAILED"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        if gjs "$test_script"; then
            echo "✓ $test_name PASSED"
        else
            echo "✗ $test_name FAILED"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

run_test "State Machine Foundation" "$TESTS_DIR/state-machine-tests.js" "gjs"
run_test "Click Handlers" "$TESTS_DIR/click-handler-tests.js" "gjs"
run_test "IDLE & RECORDING States" "$TESTS_DIR/idle-recording-tests.js" "gjs"
run_test "PROCESSING & ERROR States" "$TESTS_DIR/processing-error-tests.js" "gjs"
run_test "Python Script" "$TESTS_DIR/test_python_script_modifications.py" "python"
run_test "Integration Tests" "$TESTS_DIR/integration-tests.js" "gjs"

# Print final summary
echo ""
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo "Total test suites run: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo "✓ ALL TESTS PASSED"
    echo ""
    exit 0
else
    echo "✗ SOME TESTS FAILED"
    echo ""
    exit 1
fi
