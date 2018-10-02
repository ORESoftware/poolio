'use strict';

process.on('unhandledRejection', (r, p) => {
  console.error('unhandledRejection:', r, p);
  process.exit(1);
});

const path = require('path');
const Pool = require('poolio');
const workerScript = require.resolve(path.resolve(__dirname + '/child.js'));

const pool = new Pool({
  filePath: workerScript,    //path is relative to root of your project
  size: 3
});

pool.anyp({action: 'all', data: {foo: 'bar'}}).then(v => {
  console.log('completed task:', v);
});
