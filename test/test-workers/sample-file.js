/**
 * Created by amills001c on 10/12/15.
 */



process.on('message', function (msg) {

    console.log(msg);

    if (msg.msg === 'run') {
        run(msg);
    }
    else if (msg === 'big') {
        DoBig(msg);
    }
    else if (msg === 'SIGTERM') {
        console.log('dead');
    }
    else {
        process.send({
            msg: 'done/return/to/pool',
            error: 'unknown message',
            result: null,
            workId: msg.workId
        });
    }
});


function run(msg) {

    console.log('working...');

    setTimeout(function () {

        process.send({
            msg: 'error',
            error: 'beetles',
            result: null,
            workId: msg.workId
        });

    }, 100);

}


function DoBig(msg) {

    console.log('working...');

    setTimeout(function () {

        process.send({
            msg: 'done/return/to/pool',
            error: null,
            result: 'parties',
            workId: msg.workId
        });

    }, 100);

}
