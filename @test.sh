#!/usr/bin/env bash

SUMAN=$(which suman);

if [[ -z ${SUMAN} ]]; then
 npm install -g sumanjs/suman#rebase_branch
fi

npm link &&
npm link poolio &&
suman test
