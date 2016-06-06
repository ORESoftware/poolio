/**
 * Created by denman on 2/4/2016.
 */

// const suman = require('C:\\Users\\denman\\WebstormProjects\\suman-private');
const suman = require('/Users/Olegzandr/WebstormProjects/suman');
const Test = suman.init(module, {});


console.log('cwd:', process.cwd());


Test.describe('@TestsPoolio', function (assert, path) {

    const Pool = require('../index');
    const pool = new Pool({
        size: 3,
        filePath: path.resolve(__dirname + '/test-workers/worker1')
    });


    this.describe({parallel: false}, function () {

        this.it('test worker1', function (t) {
            return pool.any('run').then(function (msg) {
                assert.equal(path.basename(msg, '.js'), 'worker1', t.desc + ' ---> failed');
            });
        });


        this.it('test worker1 non-timeout 1', {timeout: 10000}, t => {

            var to = setTimeout(function () {
                throw new Error('Timed out');
            }, 9000);

            return Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]).then(function () {
                clearTimeout(to);
            });

        });


        this.it.cb('test worker1 expect-timeout', {timeout: 3000}, t => {

            var to = setTimeout(function () {
                t.done();
            }, 2000);

            Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]).then(function () {
                clearTimeout(to);
                t.done(new Error('Should have timed out, but didnt.'));
            });
        });


        this.it('test worker1 no-timeout 2', {timeout: 10000}, t => {

            var to = setTimeout(function () {
                throw new Error('Timed out');
            }, 9000);

            return Promise.all([
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run'),
                pool.any('run')
            ]).then(function () {
                clearTimeout(to);
            });

        });


        this.after.cb(t => {

            pool.on('worker-exited', function () {
                console.log('worker-exited');
            });

            pool.killAllImmediate().on('all-killed', function (msg) {
                pool.removeAllListeners();
                console.log('all killed');
                t.done();
            });


        });

    });

});
