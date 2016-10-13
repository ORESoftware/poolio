

//******************************************************************************************************************************
// this file allows you to configure network dependencies so that the Suman test runner can check to see if all require
// network components are live and ready to be incorporated in the test. Of course, you could just run the tests and see if
// they are live, but this feature allows you to have a fail-fast up-front check that will only run once, thus avoiding
// any potential overload of any of your network components that may already be under load.
// ******************************************************************************************************************************


const util = require('util');


module.exports = data => {


    console.error(' => data in suman.once.pre.js => ', util.inspect(data));


    return {

        'make-a-bet': function(cb){
            process.nextTick(function(){
                cb(null,'a');
            });
        }

    }

};
