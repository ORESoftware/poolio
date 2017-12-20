#!/usr/bin/env bash

if [[ ! -d "node_modules" ]]; then
 echo "looks like you are executing this command from the wrong pwd, or node_modules is not installed."
 exit 1;
fi

which_suman="$(which suman)"
if [[ -z "$which_suman" ]]; then
    npm install -g suman@latest
fi

lib_name="poolio";

IS_GLOBALLY_SYMLINKED=`suman-tools --is-symlinked-globally="${lib_name}"`
IS_LOCALLY_SYMLINKED=`suman-tools --is-symlinked-locally="${lib_name}"`

which_istanbul="$(which istanbul)";

if [[ -z ${which_istanbul} ]]; then
    npm install -g istanbul
fi

if [[ ${IS_GLOBALLY_SYMLINKED} != *"affirmative"* ]]; then
    npm link # create a global symlink for this library, so that we can create a local symlink
fi

if [[ ${IS_LOCALLY_SYMLINKED} != *"affirmative"* || ${IS_GLOBALLY_SYMLINKED} != *"affirmative"* ]]; then
    npm link "${lib_name}" # create a local symlink
fi

mkdir -p coverage
chmod -R 777 coverage

# link to suman
npm link suman

# run tests
suman --default --coverage --inherit-all-stdio --inherit-stdio
