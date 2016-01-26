/**
 * Created by denman on 1/25/2016.
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
            result: 'chicken'
        });

    }, 300);

}