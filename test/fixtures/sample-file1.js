
//
process.on('uncaughtException', function (e) {
    console.error('\n', ' => Poolio worker process uncaughtException:', e.stack || e, '\n');
});


process.on('error', function (e) {
    console.error('\n', ' => Poolio worker process error event:', e.stack || e, '\n');
});

process.on('message', function (data) {

    const workId = data.workId;

    console.log('workId:',workId,'workerId:',data.__poolioWorkerId);

    if (data.msg === 'run') {
        setImmediate(function(){
            process.send({
                msg: 'return/to/pool',
                workId: workId
            });
        });
        run(data);
    }
    else {
        console.log('unknown message!');
        process.send({
            msg: 'error',
            error: 'unknown message',
            result: null,
            workId: workId
        });
    }

    function run() {

        console.log('working...');

        setTimeout(function () {

            process.send({
                msg: 'done',
                workId: workId,
                result: 'chicken'
            });

        }, 300);

    }

});


