/**
 * Created by denman on 2/4/2016.
 */



process.on('message', function (data) {

    if (data.msg === 'run') {
        console.log(data.__poolioWorkerId);
        run(data);
    }

});


function run(data) {

    console.log(module.filename + ' running ...');

    setTimeout(function () {

        process.send({
            msg: 'done/return/to/pool',
            workId: data.workId,
            result: module.filename
        });

    }, 2000);
}