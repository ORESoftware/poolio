#!/usr/bin/env bash

SUMAN=$(which suman);

if [[ -z ${SUMAN} ]]; then
    npm install -g sumanjs/suman#rebase_branch
fi

LIB_NAME="poolio";

IS_GLOBALLY_SYMLINKED=`suman-tools --is-symlinked-globally="${LIB_NAME}"`
IS_LOCALLY_SYMLINKED=`suman-tools --is-symlinked-locally="${LIB_NAME}"`

WHICH_ISTANBUL=$(which istanbul);

if [[ -z ${WHICH_ISTANBUL} ]]; then
    npm install -g istanbul
fi

if [[ ${IS_GLOBALLY_SYMLINKED} != *"affirmative"* ]]; then
    npm link # create a global symlink for this library, so that we can create a local symlink
fi

if [[ ${IS_LOCALLY_SYMLINKED} != *"affirmative"* || ${IS_GLOBALLY_SYMLINKED} != *"affirmative"* ]]; then
    npm link "${LIB_NAME}" # create a local symlink
fi

suman test/e2e/@src/*.js --inherit-stdio