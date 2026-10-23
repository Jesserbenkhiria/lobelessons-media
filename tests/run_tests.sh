#!/usr/bin/env bash
# Full test suite. Usage: bash tests/run_tests.sh   (about 4 minutes; exit 1 if anything fails)
cd "$(dirname "$0")/.."
export NODE_PATH=/opt/npm-tools/node_modules
bash pipeline/setup.sh >/dev/null
fail=0
run() { echo; echo "=== $1"; shift; "$@" || { fail=1; echo ">>> FAILED"; }; }
run "finance math + fact checks"     python3 tests/test_finance.py
run "ElevenLabs splitter"            python3 tests/test_el_split.py
run "video QA (broken videos)"       python3 tests/test_video_qa.py
run "regression catches a change"    python3 tests/test_regress.py
run "Shorts regression (current)"    python3 qa/regress.py --determinism
echo; [ $fail = 0 ] && echo "ALL TESTS PASSED" || echo "SOME TESTS FAILED"
exit $fail
