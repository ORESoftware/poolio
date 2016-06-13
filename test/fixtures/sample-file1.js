

process.on('message', function (data) {

    const workId = data.workId;

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


