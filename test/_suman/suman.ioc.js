//******************************************************************************************************************
// this is for dependency injection, y'all
// the purpose is to inject dependencies / values that are acquired *asynchronously*
// synchronous deps should be loaded with the require function, as per usual,
// but deps and values (such as db values) can and should be loaded via this module
// tests will run in separate processes, but you can use code sharing (not memory sharing) to share setup between tests,
// which is actually pretty cool
// ******************************************************************************************************************

const path = require('path');

module.exports = data => {  //load async deps for any of your suman tests

  return {

    dependencies: {

      'async': function () {
        return require('async');
      },

      Pool: function () {
        return require('poolio').Pool
      },

      testVals: function (cb) {
        cb(null, [1, 2, 3]);
      },

      fixturesDir: function(){
        return path.resolve(__dirname + '/../fixtures');
      }
    }

  }

};

