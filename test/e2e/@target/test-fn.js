'use strict';

// import * as suman from 'suman';

var suman = require('suman');
var test = suman.init(module, {
  pre: ['make-a-bet'],
  post: ['destroyAllPools']
});

test.describe('@TestsPoolio1', { parallel: true }, function (assert) {

  this.before.cb('bindo', function (h) {
    assert(typeof h === 'function');
    h.done();
  });

  this.it('yogurt', function (t) {
    assert(typeof t.bind === 'function');
  });
});
