/**
 * Created by amills001c on 10/12/15.
 */



var Pool = require('../index');


var pool = new Pool({
    pool_id:'***',
    size: 6,
    filePath: 'test/sample-file.js'
});

var pool_1 = new Pool({
    pool_id:'###',
    size: 5,
    filePath: 'test/sample-file.js'
});

var pool_2 = new Pool({
    size: 4,
    filePath: 'test/sample-file.js'
});


pool_1.any('dog');
pool_2.any('big');

setTimeout(function () {

    pool.any('run', function (err, result) {
        if(err){
            console.error(err);
        }
        else{
            console.log('RESULT:', result);
        }
    });


    pool.any('big',function(err,result){
        if(err){
            console.error(err);
        }
        else{
            console.log(result);
        }
    });

    pool.any('run');
    pool.any('run');
    pool_1.any('run');
    pool.any('run');
    pool.any('run');
    pool_2.any('run');
    pool.any('run');
    pool.any('run');
    pool.any('run');

}, Math.random() * 1000);

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);

//pool.killAll();

setTimeout(function () {
    pool_1.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


//pool.killAllImmediate();

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);

setTimeout(function () {
    pool_2.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool_1.any('run');
}, Math.random() * 1000);

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool_2.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool_1.any('run');
}, Math.random() * 1000);

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);

