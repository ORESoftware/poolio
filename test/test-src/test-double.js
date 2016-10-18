// import * as suman from 'suman';

const suman = require('suman');
const Test = suman.init(module, {
    pre: ['make-a-bet'],
    post: ['destroyAllPools']
});


Test.describe('@TestsPoolio1', {parallel: true}, function (suite, path, async, assert) {


    this.it.cb(t => {
        setTimeout(t, 1000);
    });

});


Test.describe('@TestsPoolio2', {parallel: true}, function (suite, path, async, assert) {

    this.it.cb(t => {
        setTimeout(t, 1000);
    });


});
