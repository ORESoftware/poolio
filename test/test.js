/**
 * Created by amills001c on 10/12/15.
 */


//const suman = require('C:\\Users\\denman\\WebstormProjects\\suman');
const suman = require('/Users/amills001c/WebstormProjects/ORESoftware/suman');
const Test = suman.init(module, 'suman.conf.js');


Test.describe('@TestsPoolio', function (suite, path) {

    var Pool = require('../index');

    var pool0 = new Pool({
        pool_id: '***',
        size: 1,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    var pool1 = new Pool({
        pool_id: '**',
        size: 3,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    var pool2 = new Pool({
        pool_id: '###',
        size: 4,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    var pool3 = new Pool({
        size: 1,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });


    this.it('tests poolio', t => {

        return Promise.all([
            pool2.any('dog'),
            pool3.any('big')
        ]).then(function (values) {
            console.log('values:', values);
        }).catch(function (err) {
            console.log('err:', err);
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
                done(err);
            });
        }, 1000);

    });

});

