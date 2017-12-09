'use strict';

const suman = require('suman');
const Test = suman.init(module, {
  pre: ['make-a-bet'],
  post: ['destroyAllPools']
});

Test.create('@TestsPoolio', {parallel: true},
  ['Pool', 'fixturesDir', function (b,suite, path, async, assert, it, after) {

    const {Pool, fixturesDir} = b.ioc;
    const filePath = path.resolve(`${fixturesDir}/sample-file.js`);

    const pool0 = new Pool({
      size: 1,
      filePath: filePath
    });

    const pool1 = new Pool({
      size: 3,
      filePath: filePath
    });

    const pool2 = new Pool({
      size: 4,
      filePath: filePath
    });

    const pool3 = new Pool({
      size: 1,
      filePath: filePath
    });

    it('tests poolio 1', t => {

      t.plan(1);

      return Promise.all([
        pool2.any('dog'),
        pool3.any('big')
      ])
      .catch(function (err) {
        t.confirm();
        assert(err);
      });

    });

    it('tests poolio 2', function* (t) {

      t.plan(1);
      try {
        yield pool2.any('dog');
        yield pool3.any('big');
      }
      catch (err) {
        t.confirm();
        assert(err, 'err not defined in catch block');
      }

    });

    it.cb('a', t => {

      var called = false;

      function call(err) {
        if (!called) {
          called = true;
          t.pass();
        }
      }

      pool0.any('run', function (err) {
        assert(err);
        call(err);
      });

      pool1.any('big', function (err) {
        assert(!err);
        call(err);
      });

    });

    it.cb('c', t => {

      setTimeout(function () {
        pool0.any('run').then(t.fail, function (err) {
          assert(err);
          t.done();
        });
      }, 1000);

    });

    after.cb(t => {

      async.each([pool0, pool1, pool2, pool3], function (p, cb) {

        p.on('worker-exited', function (code, signal, workerId) {
          console.log('worker exited with code/signal/workerId:', code, signal, workerId);
        });

        console.log('current stats for pool with id:' +
          p.__poolId + ' => ' + JSON.stringify(p.getCurrentStats()));

        p.killAllImmediately().once('all-killed', function (msg) {
          console.log('all workers killed for pool with id=', p.__poolId);
          cb();
        });

        p.once('error', cb);

      }, t);

    });

  }]);

