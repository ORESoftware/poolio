'use strict';

// import * as suman from 'suman';

var suman = require('suman');
var Test = suman.init(module, {
    pre: ['make-a-bet'],
    post: ['destroyAllPools']
});

Test.describe.skip('@TestsPoolio1', { parallel: true }, function (suite, path, async, assert) {

    this.it.cb(function (t) {
        setTimeout(t, 1000);
    });
});

Test.describe('@TestsPoolio2', { parallel: true }, function (suite, path, async, assert) {

    this.it.cb(function (t) {
        setTimeout(t, 1000);
    });
});