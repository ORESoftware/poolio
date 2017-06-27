'use strict';

// import * as suman from 'suman';

var suman = require('suman');
var Test = suman.init(module, {
  pre: ['make-a-bet'],
  post: ['destroyAllPools']
});

Test.create.delay('@TestsPoolio1', { parallel: true }, function (suite, path, async, assert, fixturesDir, describe, it, after, before) {

  before(function (t) {
    console.log('before');
  });

  this.resume();

  it(function (t) {
    console.log('test case that will never be invoked');
  });

  describe('this block will never be invoked', function () {

    // this block will never be invoked, because delay is not called because it is inside the before hook
    // which will never get called until we register all describe blocks

    console.log('describe');

    it.cb(function (t) {
      console.log('in test case');
      setTimeout(t, 1000);
    });
  });
});
