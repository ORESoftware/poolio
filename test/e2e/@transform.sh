#!/usr/bin/env bash

echo "we are running @transform.sh"

cd $(dirname "$0");
chmod -R 777 $(pwd)/@target

SUMAN_TARGET="${SUMAN_CHILD_TEST_PATH//@src/@target}"
SUMAN_RUNNABLE=${SUMAN_TARGET%.*}.js

echo "SUMAN_CHILD_TEST_PATH => $SUMAN_CHILD_TEST_PATH"
echo "SUMAN_RUNNABLE => $SUMAN_RUNNABLE"

if [[ ${SUMAN_RUNNABLE} -nt ${SUMAN_CHILD_TEST_PATH} ]]; then
    echo "no need to transpile...since the transpiled file is correct."
else
    echo "we must transpile file."
#    tsc $(pwd)/@src/*.ts --outDir $(pwd)/@target

    babel ${SUMAN_CHILD_TEST_PATH} --out-file ${SUMAN_RUNNABLE}
    chmod -R 777 $(pwd)/@target
fi
