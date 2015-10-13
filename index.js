/**
 * Created by amills001c on 10/12/15.
 */


var cp = require('child_process');
var _ = require('underscore');
var path = require('path');


function Pool(options) {

    this.available = [];
    this.msgQueue = [];
    this.callbacks = [];

    this.counter = 0;

    var opts = _.defaults(options, {
        size: 1
    });

    for (var option in opts) {
        if (opts.hasOwnProperty(option)) {
            this[option] = opts[option];
        }
    }

    for (var i = 0; i < this.size; i++) {
        this.available.push(cp.fork(path.resolve(__dirname + '/' + this.filePath)));
    }

    var self = this;
    this.available.forEach(function (cp) {
        cp.on('message', function (data) {
            switch (data.msg) {
                case 'done':
                    var workId = cp.workId;
                    delegateCP.bind(self)(cp);
                    handleCallback.bind(self)(workId,data);
                    break;
                default:
                    console.log('warning: your Poolio worker sent a message that was not recognized.');
            }
        });
    });

}


function findRemoveAndReturn(workId){

    var ret = null;

    for(var i = 0; i < this.callbacks.length; i++){
        if(this.callbacks[i].workId === workId){
            ret = this.callbacks[i].cb;
            break;
        }
    }

    this.callbacks = this.callbacks.splice(i-1,1);
    return ret;

}

function handleCallback(workId,data){

    if(workId === -1){
        console.log('no cb passed so do nothing');
        return;
    }

    var cb = findRemoveAndReturn.bind(this)(workId);

    if(cb){
        if (data.error) {
            cb(new Error(data.error));
        }
        else {
            cb(null, data.result);
        }
    }
    else{
        throw new Error('this shouldnt happen');
    }
}


function delegateCP(cp) {
    if (this.msgQueue.length > 0) {
        var obj = this.msgQueue.shift();
        cp.workId =obj.workId;
        cp.send(obj.msg);
    }
    else {
        console.log('worker is available and is back in the pool');
        delete cp.workId;
        this.available.push(cp);
    }
}


Pool.prototype.any = function (msg, cb) {

    console.log('pool size:', this.available.length);

    var workId = this.counter++;

    if (typeof cb === 'function') {
        this.callbacks.push({
            workId: workId,
            cb: cb
        });
    }
    else{
        workId = -1;
    }

    if (this.available.length > 0) {
        var cp = this.available.shift();
        cp.workId = workId;
        cp.send(msg);
    }
    else {
        this.msgQueue.push({
            workId: workId,
            msg: msg
        });
    }

};


module.exports = Pool;