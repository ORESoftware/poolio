const util = require('util');

module.exports = data => {

  return {

    dependencies: {

      'make-a-bet': function (data, cb) {
        process.nextTick(function () {
          cb(null, 'a');
        });
      }

    }

  }

};

