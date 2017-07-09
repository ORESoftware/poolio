'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var suman = require('suman');
var Test = suman.init(module, {
  pre: ['make-a-bet'],
  post: ['destroyAllPools']
});

Test.create('@TestsPoolio', { parallel: true }, function (suite, path, async, assert, Pool, describe, it, after, fixturesDir) {

  var filePath = path.resolve(fixturesDir + '/sample-file.js');

  var data = [{
    size: 1,
    filePath: filePath
  }, {
    size: 3,
    filePath: filePath
  }, {
    size: 4,
    filePath: filePath
  }, {
    size: 1,
    filePath: filePath
  }];

  describe('test delay feature', { parallel: true }, function () {

    data.forEach(function (p) {

      var pool = new Pool(p);

      pool.on('error', function (err) {
        console.error(err.stack || err);
      });

      describe('test unique pool', function () {

        it('tests poolio', function (t) {

          t.plan(1);

          return _promise2.default.all([pool.any('dog'), pool.any('big')]).then(function (values) {}).catch(function (e) {
            t.confirm(); ////
          });
        });

        it.cb('a', function (t) {

          var called = false;

          function call(err) {
            if (!called) {
              called = true;
              t.pass();
            }
          }

          pool.any('run', function (err) {
            assert(err);
            call(err);
          });

          pool.any('big', function (err) {
            assert(!err);
            call(err);
          });
        });

        it.cb('c', function (t) {

          t.plan(1);
          setTimeout(function () {
            pool.any('run').then(t.fail, function (err) {
              t.confirm();
              assert(err);
              t.done();
            });
          }, 1000);
        });

        after.cb(function (t) {

          // t.plan(1);

          pool.on('worker-exited', function (code, signal, workerId) {
            console.log('worker exited with code/signal:', code, signal, workerId);
          });

          pool.killAllImmediately().once('all-killed', function (msg) {
            // t.confirm();
            console.log('all workers killed for pool with id=', pool.__poolId);
            t.ctn();
          });

          pool.once('error', t.fatal);
        });
      });
    });
  });
});