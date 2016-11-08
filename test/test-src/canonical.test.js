

const suman = require('suman');
const Test = suman.init(module, {
    pre: ['make-a-bet'],
    post: ['destroyAllPools']
});



Test.describe('@TestsPoolio', {parallel: true}, function (suite, path, async, assert, Pool) {

    const filePath = path.resolve(__dirname + '/../fixtures/sample-file.js');

    const data = [
        {
            size: 1,
            filePath: filePath
        },
        {
            size: 3,
            filePath: filePath
        },
        {
            size: 4,
            filePath: filePath
        },
        {
            size: 1,
            filePath: filePath
        }
    ];

    this.describe('test delay feature', {parallel: true}, function () {

        data.forEach(p => {

            const pool = new Pool(p);

            pool.on('error', function (err) {
                console.error(err.stack || err);
            });

            this.describe('test unique pool', function () {

                this.it('tests poolio', t => {

                    t.plan(1);

                    return Promise.all([
                        pool.any('dog'),
                        pool.any('big')
                    ]).then(function (values) {

                    }).catch(function (e) {
                        t.confirm(); ////
                    });

                });

                this.it.cb('a', t => {

                    var called = false;

                    function call(err) {
                        if (!called) {
                            called = true;
                            t.pass();
                        }
                    }

                    pool.any('run', function (err) {
                        assert(err);
                        call(err);
                    });

                    pool.any('big', function (err) {
                        assert(!err);
                        call(err);
                    });
                });

                this.it.cb('c', t => {

                    t.plan(1);
                    setTimeout(function () {
                        pool.any('run').then(t.fail, function (err) {
                            t.confirm();
                            assert(err);
                            t.done();
                        });
                    }, 1000);

                });

                this.after.cb(t => {

                    // t.plan(1);

                    pool.on('worker-exited', function (code, signal, workerId) {
                        console.log('worker exited with code/signal:', code, signal, workerId);
                    });

                    pool.killAllImmediately().once('all-killed', function (msg) {
                        // t.confirm();
                        console.log('all workers killed for pool with id=', pool.__poolId);
                        t.ctn();
                    });

                    pool.once('error', t.fatal);

                });

            });

        });

    });


});

