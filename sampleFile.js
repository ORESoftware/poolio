/**
 * Created by amills001c on 10/12/15.
 */



process.on('message', function (msg) {

    if(msg === 'run'){
        DoIt();
    }
    else{
        console.log('msg is not "run"',msg);
    }

});


function DoIt() {

    console.log('working...');

    setTimeout(function () {

        process.send('isAvailable');

    }, Math.random() * 1000);

}


