/**
 * Created by denman on 1/25/2016.
 */


process.on('message', function (msg) {

    console.log(msg);

    if (msg.msg === 'run') {
        setImmediate(function(){
            process.send({
                msg: 'return/to/pool',
                workId: msg.workId
            });
        });
        run(msg);
    }
    else {
        console.log('unknown message!');
        process.send({
            msg: 'done',
            error: 'unknown message',
            result: null
        });
    }
});


function run(msg) {

    console.log('working...');

    setTimeout(function () {

        process.send({
            msg: 'done',
            workId: msg.workId,
            result: 'chicken'
        });

    }, 300);

}