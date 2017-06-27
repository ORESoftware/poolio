'use strict';

// import * as suman from 'suman';
var suman = require('suman');
var Test = suman.init(module, {
  integrants: ['make-a-bet']
});

Test.describe('Test inits', { parallel: false }, function (Pool, assert, path) {

  var data = {
    size: 5,
    filePath: path.resolve(__dirname + '/../fixtures/sample-file.js')
  };

  var pool = new Pool(data);

  var size = pool.getCurrentStats().all;

  pool.on('worker-exited', function () {
    console.log('\n', 'worker-exited', Array.prototype.slice.apply(arguments));
  });

  pool.on('worker-removed', function () {
    console.log('\n', 'worker-removed', Array.prototype.slice.apply(arguments));
  });

  pool.on('worker-added', function () {
    console.log('\n', 'worker-added', Array.prototype.slice.apply(arguments));
  });

  this.describe('#remove workers', function () {

    this.beforeEach(function (t) {
      pool.removeWorker();
    });

    for (var i = 0; i < 5; i++) {
      this.it('remove worker =>' + i, function (t) {
        assert.equal(pool.getCurrentSize().all, --size);
      });
    }
  });

  this.describe('#add workers', function () {

    this.beforeEach(function (t) {
      pool.addWorker();
    });

    for (var i = 0; i < 5; i++) {
      this.it('add worker ' + i, function (t) {
        assert.equal(pool.getCurrentSize().all, ++size);
      });
    }
  });

  this.after(function (t) {

    process.nextTick(function () {
      setTimeout(function () {
        pool.removeAllListeners();
      }, 1000);
    });
  });
});