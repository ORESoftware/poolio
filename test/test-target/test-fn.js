'use strict';

// import * as suman from 'suman';

var suman = require('suman');
var test = suman.init(module, {
    pre: ['make-a-bet'],
    post: ['destroyAllPools']
});

test.describe('@TestsPoolio1', { parallel: true }, function (assert) {

    this.before(function (h) {
        // assert(typeof h === 'function');
    });

    this.it(function (t) {
        assert(typeof t.bind === 'function');
    });
});