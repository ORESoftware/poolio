/**
 * Created by amills001c on 1/26/16.
 */



var JSON = require('idempotent-json');


var obj = {foo:"bar"};


var o = JSON.stringify(JSON.stringify(JSON.stringify(JSON.stringify(obj))));

console.log(o);


console.log(JSON.parse(JSON.parse(o)));