

// import * as suman from 'suman';
const suman = require('suman');
const Test = suman.init(module,{
    integrants:['make-a-bet'],
});

//////

Test.describe('Test inits', {parallel: true}, function (Pool, assert, path) {


    const filePath = path.resolve(__dirname + '/../fixtures/sample-file.js');

    const data = [
        {
            size: 5,
            filePath: filePath,
            addWorkerOnExit: true //should not be invoked
        },
        {
            size: 5,
            filePath: filePath,
            addWorkerOnExit: true //should not be invoked
        },
        {
            size: 5,
            filePath: filePath,
            addWorkerOnExit: true //should not be invoked
        },
        {
            size: 5,
            filePath: filePath,
            addWorkerOnExit: true //should not be invoked
        }
    ];


    this.beforeEach(t => {

        const pool = t.data.pool = new Pool(t.value);

        pool.on('worker-exited', function () {
            throw new Error('Zero workers should exit.')
        });

        pool.on('worker-removed', function () {
            throw new Error('Zero workers should be removed.')
        });

        pool.on('worker-added', function () {
            throw new Error('Zero workers should be added.')
        });
    });

    this.beforeEach(t => {

        const pool = t.data.pool;

        return Promise.all([
            pool.any('big'),
            pool.any('big'),
            pool.any('big'),
            pool.any('big'),
            pool.any('big'),
            pool.any('big'),
            pool.any('big')
        ]);

    });

    //


    data.forEach((d,index) => {
        this.it.cb(String(index), {value: d}, t => {
            const pool = t.data.pool;
            assert.equal(pool.getCurrentStats().all, d.size);
            t.done();
            // process.nextTick(t.done);
            // process.nextTick(function(){
            //     t.done();
            // });
        });
    });

    // this.after(function(){
    //
    //     console.log('after all');
    //
    // });


});