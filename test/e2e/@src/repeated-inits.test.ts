// import * as suman from 'suman';
const suman = require('suman');
const Test = suman.init(module, {
  integrants: ['make-a-bet'],
});

Test.create('Test inits', {parallel: false, inject: ['Pool', 'fixturesDir']},
  [function (b, assert, path, describe, it, beforeEach, after) {

    const {Pool, fixturesDir} = b.ioc;

    const data = {
      size: 5,
      filePath: path.resolve(`${fixturesDir}/sample-file.js`)
    };

    const pool = new Pool(data);

    let size = pool.getCurrentStats().all;

    pool.on('worker-exited', function () {
      console.log('worker-exited', ...arguments);
    });

    pool.on('worker-removed', function () {
      console.log('worker-removed', ...arguments);
    });

    pool.on('worker-added', function () {
      console.log('worker-added', ...arguments);
    });

    describe('#remove workers', function (b) {

      beforeEach(t => {
        pool.removeWorker();
      });

      5..times(function (i) {
        it('remove worker =>' + i, t => {
          assert.equal(pool.getCurrentSize().all, --size);
        });
      });

    });

    describe('#add workers', function (b) {

      beforeEach(t => {
        pool.addWorker();
      });

      5..times(function (i) {
        it('add worker ' + i, t => {
          assert.equal(pool.getCurrentSize().all, ++size);
        });
      });

    });

    after.cb(t => {

      setTimeout(function () {
        pool.removeAllListeners();
        t.done(null)
      }, 100);

    });

  }]);
