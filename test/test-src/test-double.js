// import * as suman from 'suman';

const suman = require('suman');
const test = suman.init(module, {
    pre: ['make-a-bet'],
    post: ['destroyAllPools']
});


test.describe('@TestsPoolio1', {parallel: true}, function (suite, path, async, assert) {


    this.it.cb(t => {
        setTimeout(t, 1000);
    });

});


test.describe('@TestsPoolio2', {parallel: true}, function (suite, path, async, assert) {

    this.it.cb(t => {
        setTimeout(t, 1000);
    });


});



