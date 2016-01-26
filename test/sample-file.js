/**
 * Created by amills001c on 10/12/15.
 */



process.on('message', function (msg) {

    if (msg === 'run') {
        DoRun(msg);
    }
    else if (msg === 'big') {
        DoBig(msg);
    }
    else if (msg === 'SIGTERM') {
        console.log('dead');
    }
    else {
        process.send({
            msg: 'done',
            error: 'unknown message',
            result: null
        });
    }
});


function DoRun() {

    console.log('working...');

    setTimeout(function () {

        process.send({
            msg: 'done',
            error: 'beetles',
            result: null
        });

    }, 100);

}


function DoBig() {

    console.log('working...');

    setTimeout(function () {

        process.send({
            msg: 'done',
            error: null,
            result: 'parties'
        });

    }, 100);

}
