'use strict';

// import * as suman from 'suman';
var suman = require('suman');
var Test = suman.init(module, {
  integrants: ['make-a-bet']
});

Test.create('Test inits', { parallel: false }, ['Pool', 'fixturesDir', function (b, assert, path, describe, it, beforeEach, after) {
  var _b$ioc = b.ioc,
      Pool = _b$ioc.Pool,
      fixturesDir = _b$ioc.fixturesDir;


  var data = {
    size: 5,
    filePath: path.resolve(fixturesDir + '/sample-file.js')
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

  describe('#remove workers', function (b) {

    beforeEach(function (t) {
      pool.removeWorker();
    });

    for (var i = 0; i < 5; i++) {
      it('remove worker =>' + i, function (t) {
        assert.equal(pool.getCurrentSize().all, --size);
      });
    }
  });

  describe('#add workers', function (b) {

    beforeEach(function (t) {
      pool.addWorker();
    });

    for (var i = 0; i < 5; i++) {
      it('add worker ' + i, function (t) {
        assert.equal(pool.getCurrentSize().all, ++size);
      });
    }
  });

  after(function (t) {

    process.nextTick(function () {
      setTimeout(function () {
        pool.removeAllListeners();
      }, 1000);
    });
  });
}]);
