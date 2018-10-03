////
process.on('uncaughtException', function (e) {
  console.error('\n', ' => Poolio worker process uncaughtException:', e.stack || e, '\n');
});

process.on('error', function (e) {
  console.error('\n', ' => Poolio worker process error event:', e.stack || e, '\n');
});

//
process.on('message', function (data) {

  const workId = data.workId;

  console.log('workId:', workId, 'workerId:', data.poolioWorkerId);

  if (data.msg === 'run') {
    run(data);
  }
  else if (data.msg === 'big') {
    DoBig(data);
  }
  else if (data.msg === 'SIGTERM') {
    console.log('dead');
  }
  else {
    process.nextTick(function () {
      process.send({
        msg: 'error',
        error: '(some user error)',
        result: null,
        workId: workId
      });
    });
  }

  function run() {

    console.log('working (run)...');

    setTimeout(function () {

      process.send({
        msg: 'error',
        error: 'beetles',
        result: null,
        workId: workId
      });

    }, 100);

  }

  function DoBig() {

    console.log('working (DoBig)...');

    setTimeout(function () {

      process.send({
        msg: 'done/return/to/pool',
        error: null,
        result: 'parties',
        workId: workId
      });

    }, 100);

  }
});


