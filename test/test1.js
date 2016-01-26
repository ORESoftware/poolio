/**
 * Created by denman on 1/25/2016.
 */


var Pool = require('../promise');

var pool = new Pool({
    pool_id: '***',
    size: 2,
    filePath: 'test/sample-file1.js'
});


//pool.any('run', function (err, result) {
//    if (err) {
//        console.error(err);
//    }
//    else {
//        console.log('RESULT:', result);
//    }
//
//});
//
//pool.any('run', function (err, result) {
//    if (err) {
//        console.error(err);
//    }
//    else {
//        console.log('RESULT:', result);
//    }
//
//});
//
//pool.any('run').then(function (data) {
//    return pool.any('run');
//}).then(function(){
//    return pool.any('run');
//}).then(function(data){
//    console.log('data333:',data);
//}).catch(function (err) {
//    console.error('cholo:',err);
//});


Promise.all([
    pool.any('run'),
    pool.any('run'),
    pool.any('run'),
    pool.any('run'),
    pool.any('run'),
    pool.any('run'),
    pool.any('run'),
    pool.any('run')
]).then(function(results){
    console.log('rolo:\n',results);
    process.exit();
});