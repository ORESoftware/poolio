

//////
process.on('message', function (data) {

    const workId = data.workId;

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
        process.send({
            msg: 'error',
            error: '[some user error]',
            result: null,
            workId: workId
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


