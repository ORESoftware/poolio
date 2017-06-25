#!/usr/bin/env bash

SUMAN=$(which suman);

if [[ -z ${SUMAN} ]]; then
 npm install -g suman
fi

suman test