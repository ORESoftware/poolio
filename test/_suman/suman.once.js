/**
 * Created by Olegzandr on 11/7/16.
 */


const util = require('util');


module.exports = data => {

    console.error('\n\n',' => data in suman.once.pre.js => ', util.inspect(data));

    return {

        'make-a-bet': function(cb){
            process.nextTick(function(){
                cb(null,'a');
            });
        }

    }

};

