/**
 * Created by denman on 2/4/2016.
 */



//const suman = require('C:\\Users\\denman\\WebstormProjects\\suman');
const suman = require('/Users/amills001c/WebstormProjects/ORESoftware/suman');
const Test = suman.init(module, 'suman.conf.js');


Test.describe('@TestsPoolio', function () {


    const assert = require('assert');
    const path = require('path');
    const Pool = require('../index');


    var pool = new Pool({
        size: 3,
        filePath: path.resolve(__dirname + '/test-workers/worker1')
    });


    this.describe({parallel: false}, function () {

        this.it('test worker1', function (t) {
            return pool.any('run').then(function (msg) {
                assert.equal(path.basename(msg, '.js'), 'worker1', t.desc + ' ---> failed');
            });
        });


        this.it('test worker1 non-timeout 1', {timeout: 10000}, function (t) {

            var to = setTimeout(function () {
                throw new Error('Timed out');
            }, 9000);

            return Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]).then(function(){
                clearTimeout(to);
            });

        });


        this.it('test worker1 expect-timeout', {timeout: 3000}, function (t, done) {

            var to = setTimeout(function () {
                done();
            }, 2000);

            Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]).then(function () {
                clearTimeout(to);
                done(new Error('Should have timed out, but didnt.'));
            });
        });


        this.it('test worker1 no-timeout 2', {timeout: 10000}, function (t) {

          var to =  setTimeout(function () {
                throw new Error('Timed out');
            }, 9000);

            return Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]).then(function(){
                clearTimeout(to);
            });

        });


        this.after(function (done) {
            console.log('listening for kill all msg.');
            pool.killAllImmediate().on('all-killed', function (msg) {
                console.log('all killed');
                pool.removeAllListeners();
                done();
            });

            pool.on('worker-exited', function () {
                console.log('worker-exited');
            });
        });

    });


});
