#!/usr/bin/env bash

if [[ ! -d "node_modules" ]]; then
 echo "looks like you are executing this command from the wrong pwd, or node_modules is not installed."
 exit 1;
fi

npm install -g suman@latest

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

mkdir -p coverage
chmod -R 777 coverage

# link to suman
npm link suman

# run tests
suman --default --coverage --inherit-all-stdio --inherit-stdio
