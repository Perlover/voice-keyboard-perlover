#!/bin/bash
#
# Run All Tests for Click-to-Toggle Feature
# Task Group 6.6: Run feature-specific tests only
#

set -e

TESTS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$TESTS_DIR")"

echo "========================================="
echo "Running Click-to-Toggle Feature Tests"
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

# Run Task Group 1: State Machine Tests
run_test "Task Group 1: State Machine Foundation" "$TESTS_DIR/state-machine-tests.js" "gjs"

# Run Task Group 2: Click Handler Tests
run_test "Task Group 2: Click Handlers" "$TESTS_DIR/click-handler-tests.js" "gjs"

# Run Task Group 3: IDLE & RECORDING Tests
run_test "Task Group 3: IDLE & RECORDING States" "$TESTS_DIR/idle-recording-tests.js" "gjs"

# Run Task Group 4: PROCESSING & ERROR Tests
run_test "Task Group 4: PROCESSING & ERROR States" "$TESTS_DIR/processing-error-tests.js" "gjs"

# Run Task Group 5: Python Script Tests
run_test "Task Group 5: Python Script Modifications" "$TESTS_DIR/test_python_script_modifications.py" "python"

# Run Task Group 6: Integration Tests
run_test "Task Group 6: Integration Tests" "$TESTS_DIR/integration-tests.js" "gjs"

# Print final summary
echo ""
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo "Total test groups run: $TOTAL_TESTS"
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
