'use strict';

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var suman = require('suman');
var Test = suman.init(module, {
  integrants: ['make-a-bet']
});

Test.create('@TestsPoolio', { parallel: true }, function (after, assert, path, async, Pool, fixturesDir, describe, it) {

  var pool = new Pool({
    size: 3,
    filePath: path.resolve(fixturesDir + '/worker1.js')
  });

  var pool1 = new Pool({
    size: 9,
    filePath: path.resolve(fixturesDir + '/worker1.js')
  });

  describe('actual do the tests', { parallel: true }, function () {

    it('test worker1', function (t) {
      return pool.any('run').then(function (msg) {
        assert.equal(path.basename(msg, '.js'), 'worker1', t.desc + ' => failed');
      });
    });

    it('test worker1 non-timeout 22', { timeout: 8000 }, _regenerator2.default.mark(function _callee(t) {
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return pool.any('run');

            case 2:
              _context.next = 4;
              return pool.any('run');

            case 4:
              _context.next = 6;
              return pool.any('run');

            case 6:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    it('test worker1 non-timeout 11', { timeout: 5000 }, function (t) {

      return _promise2.default.all([pool.any('run'), pool.any('run'), pool.any('run')]);
    });

    it.cb('test worker1 expect-timeout', { timeout: 3000 }, function (t) {

      console.log('current stats pool1:', pool1.getCurrentSize());

      var to = setTimeout(t.pass, 2000);

      _promise2.default.all([pool1.any('run'), pool1.any('run'), pool1.any('run')]).then(function () {
        clearTimeout(to);
        t.fail(new Error('Should have timed out, but didnt.'));
      });
    });

    it('test worker1 no-timeout 2', { timeout: 2600 }, function (t) {

      console.log('current stats pool1:', pool1.getCurrentSize());

      return _promise2.default.all([pool1.any('run'), pool1.any('run'), pool1.any('run'), pool1.any('run'), pool1.any('run'), pool1.any('run')]);
    });

    it('whoa', function (t) {

      console.log('typeof =>', typeof t === 'undefined' ? 'undefined' : (0, _typeof3.default)(t));
      assert(typeof t.apply === 'function');
    });

    after.cb(function (t) {

      async.each([pool, pool1], function (p, cb) {

        p.on('worker-exited', function () {
          console.log('worker exited with code/signal/workerId:', Array.prototype.slice.apply(arguments));
        });

        p.killAllImmediately().on('all-killed', function (msg) {
          p.removeAllListeners();
          console.log('all workers killed for pool with id=', pool.__poolId);
          cb();
        });
      }, t.done);
    });
  });
});
