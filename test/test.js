
const suman = require('suman');
const Test = suman.init(module, {});

//////////

Test.describe('@TestsPoolio', {parallel: true}, function (suite, path, async, assert) {

	const Pool = require('..');

	const pool0 = new Pool({
		size: 1,
		filePath: path.resolve(__dirname + '/fixtures/sample-file.js')
	});

	const pool1 = new Pool({
		size: 3,
		filePath: path.resolve(__dirname + '/fixtures/sample-file.js')
	});

	const pool2 = new Pool({
		size: 4,
		filePath: path.resolve(__dirname + '/fixtures/sample-file.js')
	});

	const pool3 = new Pool({
		size: 1,
		filePath: path.resolve(__dirname + '/fixtures/sample-file.js')
	});

	this.it('tests poolio', t => {

		t.plan(1);

		return Promise.all([
			pool2.any('dog'),
			pool3.any('big')
		]).then(function (values) {

		}).catch(function (err) {
			t.confirm(); //
			assert(err, 'err not defined in catch block');
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
				console.log('worker exited with code/signal/workerId:',code, signal, workerId);
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

