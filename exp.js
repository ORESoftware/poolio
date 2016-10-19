/**
 * Created by t_millal on 10/19/16.
 */



function Proto() {


}

Proto.prototype = Object.create(Function.prototype);


Proto.prototype.foo = function () {
    console.log('foo');
};

const p = new Proto();


const f1 = function () {
    console.log('f');
};


console.log('typeof f before => ', typeof f1);

const f2 = Object.setPrototypeOf(f1, p);


console.log('typeof f after => ', typeof f2);





