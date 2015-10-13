/**
 * Created by amills001c on 10/12/15.
 */



process.on('message', function (msg) {

    DoIt();

});


function DoIt() {

    console.log('working...');

    setTimeout(function () {

        process.send('isAvailable');

    }, 100);

}


