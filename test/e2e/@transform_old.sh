#!/usr/bin/env bash

set -e;

echo "we are running @transform.sh"

#echo "SUMAN_TARGET_DIR => $SUMAN_TARGET_DIR"
#echo "SUMAN_SRC_DIR => $SUMAN_SRC_DIR"
#echo "SUMAN_CHILD_TEST_PATH => $SUMAN_CHILD_TEST_PATH"
#echo "SUMAN_TARGET_TEST_PATH => $SUMAN_TARGET_TEST_PATH"

mkdir -p "${SUMAN_TARGET_DIR}"
chmod -R 777 "${SUMAN_TARGET_DIR}"

if [[ "${SUMAN_TARGET_TEST_PATH}" -nt "${SUMAN_CHILD_TEST_PATH}" ]]; then
    echo "no need to transpile...since the transpiled file is correct."
else
    echo "we must transpile file."
#    tsc $(pwd)/@src/*.ts --outDir $(pwd)/@target

    babel "${SUMAN_CHILD_TEST_PATH}" --out-file "${SUMAN_TARGET_TEST_PATH}"
    chmod -R 777 "${SUMAN_TARGET_DIR}"
fi
