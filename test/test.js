/**
 * Created by amills001c on 10/12/15.
 */


const suman = require('C:\\Users\\denman\\WebstormProjects\\suman-private');
//const suman = require('/Users/amills001c/WebstormProjects/ORESoftware/suman');
const Test = suman.init(module, {});


Test.describe('@TestsPoolio', function (suite, path, async, assert) {


    const Pool = require('../index');

    const pool0 = new Pool({
        pool_id: '***',
        size: 1,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    const pool1 = new Pool({
        pool_id: '**',
        size: 3,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    const pool2 = new Pool({
        pool_id: '###',
        size: 4,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    const pool3 = new Pool({
        size: 1,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });


    this.it('tests poolio', t => {

        return Promise.all([
            pool2.any('dog'),
            pool3.any('big')
        ]).then(function (values) {

        }).catch(function (err) {
            console.log('expected err:', err);
        });

    });


    this.it('a', function (t, done) {

        var called = false;

        function call(err) {
            if (!called) {
                called = true;
                done(err);
            }
        }

        pool0.any('run', function (err) {
            call(err);
        });

        pool1.any('big', function (err) {
            call(err);
        });
    });


    this.it('c', function (done) {

        setTimeout(function () {
            pool0.any('run').then(function () {
                done();
            }, function (err) {
                assert(err);
                done();
            });
        }, 1000);

    });


    this.after(function (done) {

        async.each([pool0, pool1, pool2, pool3], function (p, cb) {

            p.on('worker-exited', function () {
                console.log('worker-exited');
            });

            p.killAllImmediate().once('all-killed', function (msg) {
                p.removeAllListeners();
                console.log('all killed');
                cb();
            });

            p.once('error', cb);

        }, done);


    });

});

