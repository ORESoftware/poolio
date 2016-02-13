/**
 * Created by amills001c on 10/12/15.
 */


const suman = require('C:\\Users\\denman\\WebstormProjects\\suman');
const Test = suman.init(module, 'suman.conf.js');


Test.describe('@TestsPoolio', function () {


    var Pool = require('../index');

    var pool = new Pool({
        pool_id: '***',
        size: 1,
        filePath: 'test/sample-file.js'
    });


    var pool1 = new Pool({
        pool_id: '***',
        size: 3,
        filePath: 'test/sample-file.js'
    });


    var pool_1 = new Pool({
        pool_id: '###',
        size: 4,
        filePath: 'test/sample-file.js'
    });

    var pool_2 = new Pool({
        size: 12,
        filePath: 'test/sample-file.js'
    });


    Promise.all([
        pool_1.any('dog'),
        pool_2.any('big')
    ]).then(function (values) {
        console.log('values:',values);
    }).catch(function(err){
        console.log('err:',err);
    });


    //setTimeout(function () {
    //
    //    pool.any('run', function (err, result) {
    //        if (err) {
    //            console.error(err);
    //        }
    //        else {
    //            console.log('RESULT:', result);
    //        }
    //    });
    //
    //
    //    pool.any('big', function (err, result) {
    //        if (err) {
    //            console.error(err);
    //        }
    //        else {
    //            console.log(result);
    //        }
    //    });
    //
    //    //pool.any('run');
    //    //pool.any('run');
    //    //pool_1.any('run');
    //    //pool.any('run');
    //    //pool.any('run');
    //    //pool_2.any('run');
    //    //pool.any('run');
    //    //pool.any('run');
    //    //pool.any('run');
    //
    //}, 1000);

//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
////pool.killAll();
//
//    setTimeout(function () {
//        pool_1.any('run');
//    },  1000);
//
//
//    setTimeout(function () {
//        pool.any('run');
//    }, 1000);
//
//
////pool.killAllImmediate();
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//    setTimeout(function () {
//        pool_2.any('run');
//    }, 1000);
//
//
//    setTimeout(function () {
//        pool.any('run');
//    }, Math.random() * 1000);
//
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//
//    setTimeout(function () {
//        pool_1.any('run');
//    }, Math.random() * 1000);
//
//    setTimeout(function () {
//        pool.any('run');
//    }, 1000);
//
//
//    setTimeout(function () {
//        pool_2.any('run');
//    }, 1000);
//
//
//    setTimeout(function () {
//        pool_1.any('run');
//    },  1000);
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);
//
//
//    setTimeout(function () {
//        pool.any('run');
//    },  1000);


});

