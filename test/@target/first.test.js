'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import * as suman from 'suman';
var suman = require('suman');
var Test = suman.init(module, {
    pre: ['make-a-bet'],
    post: ['destroyAllPools']
});

Test.describe('@TestsPoolio', { parallel: true }, function (suite, path, async, assert, Pool) {

    var filePath = path.resolve(__dirname + '/../fixtures/sample-file.js');

    var pool0 = new Pool({
        size: 1,
        filePath: filePath
    });

    var pool1 = new Pool({
        size: 3,
        filePath: filePath
    });

    var pool2 = new Pool({
        size: 4,
        filePath: filePath
    });

    var pool3 = new Pool({
        size: 1,
        filePath: filePath
    });

    this.it('tests poolio 1', function (t) {

        t.plan(1);

        return _promise2.default.all([pool2.any('dog'), pool3.any('big')]).catch(function (err) {
            t.confirm();
            throw err;
        });
    });

    this.it('tests poolio 2', _regenerator2.default.mark(function _callee(t) {
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:

                        t.plan(1);
                        _context.prev = 1;
                        _context.next = 4;
                        return pool2.any('dog');

                    case 4:
                        _context.next = 6;
                        return pool3.any('big');

                    case 6:
                        _context.next = 12;
                        break;

                    case 8:
                        _context.prev = 8;
                        _context.t0 = _context['catch'](1);

                        t.confirm();
                        assert(_context.t0, 'err not defined in catch block');

                    case 12:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this, [[1, 8]]);
    }));

    this.it.cb('a', function (t) {

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

    this.it.cb('c', function (t) {

        setTimeout(function () {
            pool0.any('run').then(t.fail, function (err) {
                assert(err);
                t.done();
            });
        }, 1000);
    });

    this.after.cb(function (t) {

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