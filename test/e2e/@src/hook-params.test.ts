'use strict';

import suman = require('suman');
const Test = suman.init(module, {
  pre: ['make-a-bet'],
});

Test.create('Test inits', {parallel: true}, ['Pool', 'fixturesDir', function (b, assert, path, beforeEach, it) {

  const {Pool, fixturesDir} = b.ioc;
  const filePath = path.resolve(`${fixturesDir}/sample-file.js`);

  process.stdout.setMaxListeners(50);
  process.stderr.setMaxListeners(50);

  const data = [
    {  //
      size: 5,
      filePath: filePath,
      addWorkerOnExit: true //should not be invoked
    },
    {
      size: 5,
      filePath: filePath,
      addWorkerOnExit: true //should not be invoked
    },
    {
      size: 5,
      filePath: filePath,
      addWorkerOnExit: true //should not be invoked
    },
    {
      size: 5,
      filePath: filePath,
      addWorkerOnExit: true //should not be invoked
    }
  ];

  beforeEach(t => {

    const pool = t.data.pool = new Pool(t.value);

    pool.on('worker-exited', function () {
      throw new Error('Zero workers should exit.')
    });

    pool.on('worker-removed', function () {
      throw new Error('Zero workers should be removed.')
    });

    pool.on('worker-added', function () {
      throw new Error('Zero workers should be added.')
    });
  });

  beforeEach(t => {

    const pool = t.data.pool;

    return Promise.all([
      pool.any('big'),
      pool.any('big'),
      pool.any('big'),
      pool.any('big'),
      pool.any('big'),
      pool.any('big'),
      pool.any('big')
    ]);

  });

  data.forEach((d, index) => {
    it.cb(String(index), {value: d}, t => {
      const pool = t.data.pool;
      assert.equal(pool.getCurrentStats().all, d.size);
      t.done();
    });
  });

}]);
