/**
 * Created by amills001c on 10/12/15.
 */



var Pool = require('../index2');


var pool = new Pool({
    size: 1,
    filePath: 'sampleFile.js'
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
pool.any('run');