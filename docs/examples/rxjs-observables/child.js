const {Observable} = require('rxjs');
const {registerMessageHandler} = require('poolio');

let reg = Observable.fromCallback(registerMessageHandler);

let subscription = reg().subscribe(
  function (x) {
    console.log('Next: ' + x);
  },
  function (err) {
    console.log('Error: ' + err);
  },
  function () {
    console.log('Completed');
  }
);
