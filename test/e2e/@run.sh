#!/usr/bin/env bash

set -e;

echo "we are running @run.sh"
mkdirp -p "${SUMAN_TARGET_DIR}"
chmod -R 777 "${SUMAN_TARGET_DIR}"

SUMAN_RUNNABLE=${SUMAN_TARGET_TEST_PATH%.*}.js

#node ${SUMAN_RUNNABLE} | tee -a run.sh.log
#node ${SUMAN_RUNNABLE}

#istanbul cover --report=json "${SUMAN_RUNNABLE}" --dir "${SUMAN_COVERAGE_DIR}"

istanbul cover --report=lcov "${SUMAN_RUNNABLE}" --dir "${SUMAN_COVERAGE_DIR}"

# nyc --dir "${SUMAN_COVERAGE_DIR}" node "${SUMAN_RUNNABLE}"
# nyc node "${SUMAN_RUNNABLE}"

EXIT_CODE=$?;
echo "run.sh EXIT_CODE => $EXIT_CODE"
exit ${EXIT_CODE};
