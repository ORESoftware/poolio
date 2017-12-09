process.on('uncaughtException', function (e) {
  console.error('\n', ' => Poolio worker process uncaughtException:', e.stack || e, '\n');
});

process.on('error', function (e) {
  console.error('\n', ' => Poolio worker process error event:', e.stack || e, '\n');
});

process.on('message', function (data) {

  const workId = data.workId;

  console.log('workId:', workId, 'workerId:', data.__poolioWorkerId);

  if (data.msg === 'run') {
    console.log(data.__poolioWorkerId);
    run();
  }
  else {
    process.send({
      msg: 'error',
      error: new Error('No action listed').stack,
      workId: workId,
      result: module.filename
    });
  }

  function run() {

    setTimeout(function () {

      process.send({
        msg: 'done/return/to/pool',
        workId: workId,
        result: module.filename
      });

    }, 2000);
  }

});


