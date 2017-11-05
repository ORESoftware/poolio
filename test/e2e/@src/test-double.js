

import * as suman from 'suman';

const Test = suman.init(module, {
  pre: ['make-a-bet'],
  post: ['destroyAllPools']
});

Test.describe('@TestsPoolio1', {parallel: true}, function (suite, path, async, assert) {

  this.it.cb('micro-biome', t => {
    setTimeout(t, 100);
  });

});

Test.describe('@TestsPoolio2', {parallel: true}, function (suite, path, async, assert) {

  this.it.cb('micro-biota', t => {
    setTimeout(t, 100);
  });

});



