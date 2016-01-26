/**
 * Created by amills001c on 10/12/15.
 */

//TODO: https://devnet.jetbrains.com/message/5507221
//TODO: https://youtrack.jetbrains.com/issue/WEB-1919

var cp = require('child_process');
var _ = require('underscore');
var path = require('path');
var debug = require('debug')('poolio');
var colors = require('colors/safe');
var appRootPath = require('app-root-path');


var id = 0;

function Pool(options) {

    this.kill = false;

    this.all = [];
    this.available = [];
    this.msgQueue = [];
    this.resolutions = [];

    this.counter = 0;

    var opts = _.defaults(options, {
        size: 1,
        pool_id: '@pool_' + id++
    });

    for (var option in opts) {
        if (opts.hasOwnProperty(option)) {
            this[option] = opts[option];
        }
    }

    if (this.filePath == null) {
        throw new Error('need to provide filepath value for Poolio constructor');
    }

    for (var i = 0; i < this.size; i++) {
        var n = cp.fork(path.resolve(appRootPath + '/' + this.filePath), [], {
            execArgs: []
        });
        this.available.push(n);
        this.all.push(n);
    }

    var self = this;
    this.available.forEach(function (cp) {
        cp.on('message', function (data) {
            switch (data.msg) {
                case 'done':
                    var workId = cp.workId;
                    delegateCP.bind(self)(cp);
                    handleCallback.bind(self)(workId, data);
                    break;
                default:
                    console.log(colors.bgYellow('warning: your Poolio worker sent a message that was not recognized.'));
            }
        });
    });

}


function findRemoveAndReturn(workId) {

    var ret = null;


    for (var i = 0; i < this.resolutions.length; i++) {
        if (this.resolutions[i].workId === workId) {
            ret = this.resolutions[i].cb;
            break;
        }
    }

    this.resolutions = this.resolutions.splice(i - 1, 1);

    return ret;

}

function handleCallback(workId, data) {

    if (workId === -1) {
        debug('no cb passed so do nothing');
        return;
    }

    var cb = findRemoveAndReturn.bind(this)(workId);

    if (cb) {
        if (data.error) {
            cb(new Error(data.error));
        }
        else {
            cb(null, data.result);
        }
    }
    else {
        debug(colors.bgRed('this shouldnt happen'));
    }
}


function delegateCP(cp) {

    if (this.kill) {
        cp.send('SIGTERM');
        return;
    }

    if (this.msgQueue.length > 0) {
        var obj = this.msgQueue.shift();
        cp.workId = obj.workId;
        cp.send(obj.msg);
    }
    else {
        debug(colors.yellow('worker is available and is back in the pool'));
        delete cp.workId;
        this.available.push(cp);
        debug('pool size for pool ' + this.pool_id + ' is: ' + this.available.length);
    }
}


Pool.prototype.any = function (msg, cb) {

    if (this.kill) {
        console.log('warning: pool.any called on pool of dead/dying workers');
        return;
    }

    debug('current available pool size for pool_id ' + this.pool_id + ' is: ' + this.available.length);

    var workId = this.counter++;

    if (typeof cb === 'function') {
        this.resolutions.push({
            workId: workId,
            cb: cb
        });
    }
    else {
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


Pool.prototype.killAll = function () {

    this.kill = true;
    this.available.forEach(function (cp) {
        cp.send('SIGTERM');
    });

};


Pool.prototype.killAllImmediate = function () {

    this.kill = true;
    this.all.forEach(function (cp) {
        cp.send('SIGTERM');
    });

};


module.exports = Pool;