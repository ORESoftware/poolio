// import * as suman from 'suman';
const suman = require('suman');
const Test = suman.init(module, {
    pre:['make-a-bet'],
    post: ['destroyAllPools']
});

Test.describe('@TestsPoolio', {parallel: true}, function (suite, path, async, assert, Pool) {


    const filePath = path.resolve(__dirname + '/../fixtures/sample-file.js');

    const pool0 = new Pool({
        size: 1,
        filePath: filePath
    });

    const pool1 = new Pool({
        size: 3,
        filePath: filePath
    });

    const pool2 = new Pool({
        size: 4,
        filePath: filePath
    });

    const pool3 = new Pool({
        size: 1,
        filePath: filePath
    });


    this.it('tests poolio 1', t => {

        t.plan(1);

        return Promise.all([
            pool2.any('dog'),
            pool3.any('big')
        ]).catch(function (err) {
            t.confirm();
            throw err;
        });

    });

    this.it('tests poolio 2', function * gen(t) {

        t.plan(1);
        yield pool2.any('dog');
        yield pool3.any('big');
        t.confirm();
        assert(err, 'err not defined in catch block');

    });

    this.it.cb('a', t => {

        var called = false;

        function call(err) {
            if (!called) {
                called = true;
                t.pass();
            }
        }

        pool0.any('run', function (err) {
            assert(err);
            call(err);
        });

        pool1.any('big', function (err) {
            assert(!err);
            call(err);
        });
    });

    this.it.cb('c', t => {

        setTimeout(function () {
            pool0.any('run').then(t.fail, function (err) {
                assert(err);
                t.done();
            });
        }, 1000);

    });

    this.after.cb(t => {

        async.each([pool0, pool1, pool2, pool3], function (p, cb) {

            p.on('worker-exited', function (code, signal, workerId) {
                console.log('worker exited with code/signal/workerId:', code, signal, workerId);
            });

            console.log('current stats for pool with id:' + p.__poolId + ' => ' + JSON.stringify(p.getCurrentStats()));

            p.killAllImmediately().once('all-killed', function (msg) {
                console.log('all workers killed for pool with id=', p.__poolId);
                cb();
            });

            p.once('error', cb);

        }, t.done);

    });

});

