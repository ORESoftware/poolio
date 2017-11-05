const util = require('util');

/////////////////////////////////////

module.exports = data => {

  console.error('\n\n', ' => data in suman.once.post.js => ', util.inspect(data));

  return {

    dependencies: {

      destroyAllPools: function * yolo() {

        const a = yield new Promise(function (resolve, reject) {
          setTimeout(function () {
            resolve(3);
          }, 100);
        });

        yield 7;
      }
    }

  }

};
