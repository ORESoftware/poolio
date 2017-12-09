'use strict';

const suman = require('suman');
const Test = suman.init(module, {
  integrants: ['make-a-bet']
});

Test.create('@TestsPoolio', {parallel: true},
  ['Pool', 'fixturesDir', function (b, after, assert, path, async, describe, it) {

    const {Pool, fixturesDir} = b.ioc;

    const pool = new Pool({
      size: 3,
      filePath: path.resolve(`${fixturesDir}/worker1.js`)
    });

    const pool1 = new Pool({
      size: 9,
      filePath: path.resolve(`${fixturesDir}/worker1.js`)
    });

    describe('actual do the tests', {parallel: true}, b => {

      it('test worker1', function (t) {
        return pool.any('run').then(function (msg) {
          assert.equal(path.basename(msg, '.js'), 'worker1', t.desc + ' => failed');
        });
      });

      it('test worker1 non-timeout 22', {timeout: 8000}, function* (t) {
        yield pool.any('run');
        yield pool.any('run');
        yield pool.any('run');
      });

      it('test worker1 non-timeout 11', {timeout: 5000}, t => {

        return Promise.all([
          pool.any('run'),
          pool.any('run'),
          pool.any('run')
        ]);

      });

      it.cb('test worker1 expect-timeout', {timeout: 3000}, t => {

        console.log('current stats pool1:', pool1.getCurrentSize());

        const to = setTimeout(t.pass, 2000);

        Promise.all([
          pool1.any('run'),
          pool1.any('run'),
          pool1.any('run')
        ])
        .then(function () {
          clearTimeout(to);
          t.fail(new Error('Should have timed out, but didnt.'));
        });
      });

      it('test worker1 no-timeout 2', {timeout: 2600}, t => {

        console.log('current stats pool1:', pool1.getCurrentSize());

        return Promise.all([
          pool1.any('run'),
          pool1.any('run'),
          pool1.any('run'),
          pool1.any('run'),
          pool1.any('run'),
          pool1.any('run')
        ]);

      });


      after.cb(t => {

        async.each([pool, pool1], function (p, cb) {

          p.on('worker-exited', function () {
            console.log('worker exited with code/signal/workerId:',
              Array.prototype.slice.apply(arguments));
          });

          p.killAllImmediately().on('all-killed', function (msg) {
            p.removeAllListeners();
            console.log('all workers killed for pool with id=', pool.__poolId);
            cb();
          });

        }, t.done);

      });

    });

  }]);
