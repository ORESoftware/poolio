#!/usr/bin/env bash

GIT_COMMIT_MSG=$1 # first argument to script

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "dev" ]]; then
  echo 'Aborting script because you are not on the right git branch (dev).';
  exit 1;
fi

npm version patch --force -m "Upgrade for several reasons" &&


git add . &&
git add -A &&
git commit --allow-empty  -am "publish/release:${GIT_COMMIT_MSG}" &&
git push &&
git checkout -b temp &&
npm run remove-private-dirs &&
npm run remove-private-files &&
git add . &&
git add -A &&
git commit --allow-empty  -am "publish/release:${GIT_COMMIT_MSG}" &&
git push origin HEAD:master -f &&
npm publish . &&
git checkout dev &&
git branch -D temp
