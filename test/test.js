/**
 * Created by amills001c on 10/12/15.
 */



var Pool = require('../index2');


var pool = new Pool({
    size: 3,
    filePath: 'sampleFile.js'
});



pool.any('run');
pool.any('run');
pool.any('run');
pool.any('run');
pool.any('run');

pool.any('run');

setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);

setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);

setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);

setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);



setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);

setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);


setTimeout(function(){
    pool.any('run');
}, Math.random() * 1000);