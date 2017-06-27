'use strict';

var _suman = require('suman');

var suman = _interopRequireWildcard(_suman);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var Test = suman.init(module, {
  pre: ['make-a-bet'],
  post: ['destroyAllPools']
});

Test.describe('@TestsPoolio1', { parallel: true }, function (suite, path, async, assert) {

  this.it.cb('micro-biome', function (t) {
    setTimeout(t, 100);
  });
});

Test.describe('@TestsPoolio2', { parallel: true }, function (suite, path, async, assert) {

  this.it.cb('micro-biota', function (t) {
    setTimeout(t, 100);
  });
});
