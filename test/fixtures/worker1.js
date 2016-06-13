/**
 * Created by denman on 2/4/2016.
 */



process.on('message', function (data) {

    const workId = data.workId;

    if (data.msg === 'run') {
        console.log(data.__poolioWorkerId);
        run();
    }
    else{
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


