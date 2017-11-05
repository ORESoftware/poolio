// import * as suman from 'suman';

const suman = require('suman');
const test = suman.init(module, {
  pre: ['make-a-bet'],
  post: ['destroyAllPools']
});

test.describe('@TestsPoolio1', {parallel: true}, function (assert) {

  this.before.cb('bindo', h => {
    assert(typeof h === 'function');
    h.done();
  });

  this.it('yogurt', t => {
    assert(typeof t.bind === 'function');
  });

});





