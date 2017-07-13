#!/usr/bin/env bash

echo "we are running @transform.sh"

cd $(dirname "$0");
chmod -R 777 $(pwd)/@target

SUMAN_TARGET="${SUMAN_CHILD_TEST_PATH//@src/@target}"

echo "SUMAN_CHILD_TEST_PATH => $SUMAN_CHILD_TEST_PATH"
echo "SUMAN_TARGET => $SUMAN_TARGET"

if [[ "${SUMAN_TARGET}" -nt "${SUMAN_CHILD_TEST_PATH}" ]]; then
    echo "no need to transpile...since the transpiled file is correct."
else
    echo "we must transpile file."
#    tsc $(pwd)/@src/*.ts --outDir $(pwd)/@target

    babel ${SUMAN_CHILD_TEST_PATH} --out-file ${SUMAN_TARGET}
    chmod -R 777 $(pwd)/@target
fi
