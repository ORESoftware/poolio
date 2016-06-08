const suman = require('suman');
const Test = suman.init(module, {});

Test.describe('@TestsPoolio', {parallel: true}, function (suite, path, async, assert) {

	const Pool = require('../index');

	const data = [
		{
			pool_id: '***',
			size: 1,
			filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
		},
		{
			pool_id: '**',
			size: 3,
			filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
		},
		{
			pool_id: '###',
			size: 4,
			filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
		},
		{
			size: 1,
			filePath: path.resolve(__dirname + '/test-workers/sample-file.js')
		}
	];

	data.forEach(p => {

		const pool = new Pool(p);

		this.describe('test unique pool', function () {

			this.it('tests poolio', t => {

				return Promise.all([
					pool.any('dog'),
					pool.any('big')
				]).then(function (values) {

				}).catch(function (err) {
					console.log('Poolio expected err:', err);
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

				pool.on('worker-exited', function () {
					console.log('worker-exited');
				});

				pool.killAllImmediate().once('all-killed', function (msg) {
					// t.confirm();
					pool.removeAllListeners();
					console.log('all workers killed for pool with id=', pool.__poolId);
					t.ctn();
				});

				pool.once('error', t.fatal);

			});

		});

	});

});

