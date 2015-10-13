/**
 * Created by amills001c on 10/12/15.
 */



var Pool = require('../index');


var pool = new Pool({
    size: 5,
    filePath: 'sampleFile.js'
});

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
    pool.any('run');
    pool.any('run');
    pool.any('run');
    pool.any('run');
    pool.any('run');
    pool.any('run');
    pool.any('run');

}, Math.random() * 1000);

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);

//pool.killAll();

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


pool.killAllImmediate();

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

