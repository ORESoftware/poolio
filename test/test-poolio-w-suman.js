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


    this.describe({parallel: true}, function () {

        this.it('test worker1', {parallel: false}, function (t) {
            return pool.any('run').then(function (msg) {
                assert.equal(path.basename(msg, '.js'), 'worker1', t.desc + ' ---> failed');
            });
        });


        this.it('test worker1 non-timeout 1', {parallel: true}, function (t) {

            setTimeout(function () {
                throw new Error('Timed out');
            }, 5500);

            return Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]);

        });


        this.it('test worker1 expect-timeout', {parallel: true}, function (t, done) {

            setTimeout(function () {
                done();
            }, 2000);

            Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]).then(function () {
                done(new Error('Should have timed out, but didnt.'));
            });

        });


        this.it('test worker1 no-timeout 2', {parallel: true}, function (t) {

            setTimeout(function () {
                throw new Error('Timed out');
            }, 6500);

            return Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]);

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