/**
 * Created by amills001c on 10/12/15.
 */

var path = require('path');

//const suman = require('C:\\Users\\denman\\WebstormProjects\\suman');
const suman = require('/Users/amills001c/WebstormProjects/ORESoftware/suman');
const Test = suman.init(module, 'suman.conf.js');


Test.describe('@TestsPoolio', function () {

    var Pool = require('../index');

    var pool = new Pool({
        pool_id: '***',
        size: 1,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    var pool1 = new Pool({
        pool_id: '***',
        size: 3,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    var pool_1 = new Pool({
        pool_id: '###',
        size: 4,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });

    var pool_2 = new Pool({
        size: 1,
        filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
    });


    this.it('tests poolio', t => {

        return Promise.all([
            pool_1.any('dog'),
            pool_2.any('big')
        ]).then(function (values) {
            console.log('values:', values);
        }).catch(function (err) {
            console.log('err:', err);
        });

    });


    this.it('a', function (done) {

        var called = false;

        function call(err) {
            if (!called) {
                called = true;
                done(err);
            }
        }

        pool.any('run', function (err) {
            call(err);
        });

        pool.any('big', function (err) {
            call(err);
        });
    });

    this.it('c', function (done) {

        setTimeout(function () {
            pool.any('run').then(function () {
                done();
            }).catch(function (err) {
                done(err);
            });
        }, 1000);

    });

});

