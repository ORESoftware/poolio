'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _suman = require('suman');

var suman = _interopRequireWildcard(_suman);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Test = suman.init(module);

Test.create('@TestsPoolio', { parallel: true }, function (Pool, suite, path, async, assert, it, after, fixturesDir) {

  var pool0 = new Pool({
    size: 1,
    filePath: path.resolve(fixturesDir + '/sample-file.js')
  });

  var pool1 = new Pool({
    size: 3,
    filePath: path.resolve(fixturesDir + '/sample-file.js')
  });

  var pool2 = new Pool({
    size: 4,
    filePath: path.resolve(fixturesDir + '/sample-file.js')
  });

  var pool3 = new Pool({
    size: 1,
    filePath: path.resolve(fixturesDir + '/sample-file.js')
  });

  it('tests poolio', function (t) {

    t.plan(1);

    return _promise2.default.all([pool2.any('dog'), pool3.any('big')]).then(function (values) {}).catch(function (err) {
      t.confirm(); //
      assert(err, 'err not defined in catch block');
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

    pool0.any('run', function (err) {
      assert(err);
      call(err);
    });

    pool1.any('big', function (err) {
      assert(!err);
      call(err);
    });
  });

  it.cb('c', function (t) {

    setTimeout(function () {
      pool0.any('run').then(t.fail, function (err) {
        assert(err);
        t.done();
      });
    }, 1000);
  });

  after.cb(function (t) {

    async.each([pool0, pool1, pool2, pool3], function (p, cb) {

      p.on('worker-exited', function (code, signal, workerId) {
        console.log('worker exited with code/signal/workerId:', code, signal, workerId);
      });

      console.log('current stats for pool with id:' + p.__poolId + ' => ' + (0, _stringify2.default)(p.getCurrentStats()));

      p.killAllImmediately().once('all-killed', function (msg) {
        console.log('all workers killed for pool with id=', p.__poolId);
        cb();
      });

      p.once('error', cb);
    }, t.done);
  });
});
