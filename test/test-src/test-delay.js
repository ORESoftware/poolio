// import * as suman from 'suman';

const suman = require('suman');
const test = suman.init(module, {
    pre: ['make-a-bet'],
    post: ['destroyAllPools']
});


test.describe('@TestsPoolio1', {parallel: true}, function (suite, path, async, assert, delay) {


    this.before(t => {
        console.log('before');
        delay();
    });

    this.it(t => {
        console.log('test case that will never be invoked')
    });


    this.describe('this block will never be invoked',function () {

        // this block will never be invoked, because delay is not called because it is inside the before hook
        // which will never get called until we register all describe blocks

        console.log('describe');

        this.it.cb(t => {
            console.log('in test case');
            setTimeout(t, 1000);
        });

    });

});




