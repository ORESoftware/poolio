/**
 * Created by denman on 1/25/2016.
 */


var Pool = require('../index');

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

    pool.removeWorker();
    pool.removeWorker();
    console.log(pool.getCurrentSize());
    pool.removeWorker();
    pool.addWorker();
    pool.addWorker();
    pool.addWorker();
    pool.addWorker();


    pool.any('run').then(function(results){
        console.log('cholo1:\n',results);
    });
    pool.any('run').then(function(results){
        console.log('cholo2:\n',results);
    });

    console.log(pool.getCurrentSize());


    pool.removeWorker();
    pool.removeWorker();

    pool.removeWorker();
    pool.removeWorker();

    pool.removeWorker();
    pool.removeWorker();

    pool.removeWorker();
    pool.removeWorker();

    pool.removeWorker();
    pool.removeWorker();

    pool.any('run').then(function(results){
        console.log('cholo555:\n',results);
    });

    setTimeout(function(){
        console.log('now replenishing');
        pool.addWorker();
        pool.addWorker();
        pool.addWorker();

        pool.removeWorker();
        pool.removeWorker();

        pool.removeWorker();
        pool.removeWorker();

        pool.removeWorker();
        pool.removeWorker();

        pool.removeWorker();
        pool.removeWorker();

        console.log(pool.getCurrentSize());

    },3000);


    pool.any('run').then(function(results){
        console.log('cholo666:\n',results);
    });



});
