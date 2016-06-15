

const suman = require('suman');
const Test = suman.init(module);


//

Test.describe('Test inits', {parallel: true}, function (Pool, assert, path) {

    const data = [
        {
            size: 5,
            filePath: path.resolve(__dirname + '/fixtures/sample-file.js'),
            addWorkerOnExit: true //should not be invoked
        },
        {
            size: 5,
            filePath: path.resolve(__dirname + '/fixtures/sample-file.js'),
            addWorkerOnExit: true //should not be invoked
        },
        {
            size: 5,
            filePath: path.resolve(__dirname + '/fixtures/sample-file.js'),
            addWorkerOnExit: true //should not be invoked
        },
        {
            size: 5,
            filePath: path.resolve(__dirname + '/fixtures/sample-file.js'),
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


    data.forEach(d => {
        this.it.cb({value: d}, t => {
            const pool = t.data.pool;
            assert.equal(pool.getCurrentStats().all, d.size);
            t.done();
        });
    });


});