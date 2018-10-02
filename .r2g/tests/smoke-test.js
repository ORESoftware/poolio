#!/usr/bin/env node
'use strict';

process.on('unhandledRejection', (r, p) => {
  console.error('unhandledRejection:', r, p);
  process.exit(1);
});

const {Pool} = require('poolio');

const path = require('path');
const workerScript = require.resolve(path.resolve(__dirname + '/../fixtures/child.js'));

const pool = new Pool({
  filePath: workerScript,    //path is relative to root of your project
  size: 1
});

console.log('this is phase-T');

// const to = setTimeout(() => {
//   console.error('poolio test timed out.');
//   process.exit(1);
// }, 2000);

let to;

pool.anyp({action: 'all', data: {foo: 'bar'}}).then(v => {
  clearTimeout(to);
  console.log('completed task:', v);
  process.exit(0);
});
