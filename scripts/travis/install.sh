#!/usr/bin/env bash


which_istanbul="$(which istanbul)";

if [[ -z "$which_istanbul" ]]; then
    npm install -g istanbul
fi

rm -rf node_modules && npm install --silent
