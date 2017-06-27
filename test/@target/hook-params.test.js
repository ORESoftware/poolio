'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var suman = require('suman');
var Test = suman.init(module, {
    pre: ['make-a-bet']
});

Test.describe('Test inits', { parallel: true }, function (Pool, assert, path) {
    var _this = this;

    var filePath = path.resolve(__dirname + '/../fixtures/sample-file.js');

    var data = [{ //
        size: 5,
        filePath: filePath,
        addWorkerOnExit: true //should not be invoked
    }, {
        size: 5,
        filePath: filePath,
        addWorkerOnExit: true //should not be invoked
    }, {
        size: 5,
        filePath: filePath,
        addWorkerOnExit: true //should not be invoked
    }, {
        size: 5,
        filePath: filePath,
        addWorkerOnExit: true //should not be invoked
    }];

    this.beforeEach(function (t) {

        var pool = t.data.pool = new Pool(t.value);

        pool.on('worker-exited', function () {
            throw new Error('Zero workers should exit.');
        });

        pool.on('worker-removed', function () {
            throw new Error('Zero workers should be removed.');
        });

        pool.on('worker-added', function () {
            throw new Error('Zero workers should be added.');
        });
    });

    this.beforeEach(function (t) {

        var pool = t.data.pool;

        return _promise2.default.all([pool.any('big'), pool.any('big'), pool.any('big'), pool.any('big'), pool.any('big'), pool.any('big'), pool.any('big')]);
    });

    //


    data.forEach(function (d, index) {
        _this.it.cb(String(index), { value: d }, function (t) {
            var pool = t.data.pool;
            assert.equal(pool.getCurrentStats().all, d.size);
            t.done();
            // process.nextTick(t.done);
            // process.nextTick(function(){
            //     t.done();
            // });
        });
    });
});