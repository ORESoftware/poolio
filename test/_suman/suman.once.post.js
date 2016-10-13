/**
 * Created by t_millal on 10/11/16.
 */


const util = require('util');


module.exports = data => {


    console.error(' => data in suman.once.post.js => ', util.inspect(data));

    return {


        destroyAllPools: function * yolo() {

            const a = yield new Promise(function (resolve, reject) {
                setTimeout(function () {
                    resolve(3);
                }, 3000);
            });

            console.log('a =>', a);

            yield 7;
        }


    }


};