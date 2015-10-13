/**
 * Created by amills001c on 10/12/15.
 */



var Pool = require('../index3');


var pool = new Pool({
    size: 5,
    filePath: 'sampleFile.js'
});

setTimeout(function () {

    pool.any('run', function (err, result) {
        console.log('ERROR:', err, 'RESULT:', result);
    });


    pool.any('big',function(err,result){
        console.log('ERROR:', err, 'RESULT:', result);
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

}, Math.random() * 10);

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

setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function () {
    pool.any('run');
}, Math.random() * 1000);

