// import * as suman from 'suman';

const suman = require('suman');
const test = suman.init(module, {
    pre: ['make-a-bet'],
    post: ['destroyAllPools']
});


test.describe('@TestsPoolio1', {parallel: true}, function (assert) {


    this.before(h => {
        // assert(typeof h === 'function');
    });

    this.it(t => {
        assert(typeof t === 'function');
    });

});





