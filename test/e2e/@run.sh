#!/usr/bin/env bash

cd $(dirname "$0");
echo "we are running @run.sh"
chmod -R 777 $(pwd)/@target

SUMAN_TARGET="${SUMAN_CHILD_TEST_PATH//@src/@target}"
SUMAN_RUNNABLE=${SUMAN_TARGET%.*}.js

echo "SUMAN_RUNNABLE => ${SUMAN_RUNNABLE}"
echo "node version => $(node -v)"
#node ${SUMAN_RUNNABLE} | tee -a run.sh.log

node ${SUMAN_RUNNABLE}

EXIT_CODE=$?;
echo "run.sh EXIT_CODE => $EXIT_CODE"
exit ${EXIT_CODE};
