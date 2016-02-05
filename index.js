/**
 * Created by denman on 1/25/2016.
 */


//TODO: https://devnet.jetbrains.com/message/5507221
//TODO: https://youtrack.jetbrains.com/issue/WEB-1919
//TODO: after spawning cps, how do we know if they are ready to receive messages and do work?


///////////////////////////////////////////////////

const cp = require('child_process');
const _ = require('underscore');
const path = require('path');
const debug = require('debug')('poolio');
const EE = require('events');
const util = require('util');

/////////////////////////////////////////////////////

const acceptableConstructorOptions = ['execArgs', 'args', 'size', 'filePath'];

var id = 0;

function Pool(options) {

    EE.call(this);

    this.kill = false;
    this.all = [];
    this.available = [];
    this.msgQueue = [];
    this.resolutions = {};
    this.removeNext = false;
    this.workerIdCounter = 0;
    this.jobIdCounter = 0;
    this.okToDelegate = false;
    this.filePath = null;
    this.size = null;
    this.execArgs = null;
    this.args = null;


    if (typeof options !== 'object') {
        throw new Error('Options object should be defined for your poolio pool, even if it is an empty object, it is needed');
    }

    var opts = _.defaults(_.pick(options, acceptableConstructorOptions), {
        size: 1,
        __pool_id: '@poolio_pool_' + id++
    });

    if (opts.args && !Array.isArray(opts.args)) {
        throw new Error('"args" option passed to poolio pool, but args was not an array.');
    }

    if (opts.execArgs && !Array.isArray(opts.execArgs)) {
        throw new Error('"execArgs" option passed to poolio pool, but execArgs was not an array.');
    }

    Object.keys(opts).forEach(key => {
        this[key] = opts[key];
    });

    if (this.filePath == null || this.size == null) {
        throw new Error('need to provide filePath value and size value for Poolio constructor');
    }

    for (var i = 0; i < this.size; i++) {
        this.addWorker();
    }

    this.okToDelegate = true;

}

util.inherits(Pool, EE);


Pool.prototype.addWorker = function () {

    var n = cp.fork(path.resolve(this.filePath), this.args || [], {
        execArgs: this.execArgs || []
    });

    n.on('error', (err) => {
        this.emit('worker-error', err);
    });

    n.once('exit', () => {
        this.emit('worker-exited');
    });

    n.workerId = this.workerIdCounter++;

    this.all.push(n);

    this.emit('worker-created');

    n.on('message', data => {
        debug('message from worker: ' + data);
        switch (data.msg) {
            case 'done':
                handleCallback.bind(this)(data);
                break;
            case 'return/to/pool':
                delegateWorker.bind(this)(n);
                break;
            case 'done/return/to/pool':
                handleCallback.bind(this)(data);  //probably want to handle callback first
                delegateWorker.bind(this)(n);
                break;
            case 'error':
                console.error(data);
                this.emit('error', data);
                handleCallback.bind(this)(data);
                delegateWorker.bind(this)(n);
                break;
            case 'fatal':
                console.error(data);
                this.emit('error', data);
                handleCallback.bind(this)(data);
                removeSpecificWorker.bind(this)(n);
                this.addWorker();
                break;
            default:
                console.error('warning: your Poolio worker sent a message that was not recognized.');
        }
    });

    if (this.okToDelegate) {
        //TODO: bug - we should be able to just call delegateCP from here, but there is some problem with that
        if (this.msgQueue.length > 0) {
            n.send(this.msgQueue.shift());
        }
        else {
            debug('worker is available and is back in the pool');
            this.available.push(n);
            debug('pool size for pool ' + this.pool_id + ' is: ' + this.available.length);
        }
    }
    else {
        this.available.push(n);
    }
};


function removeSpecificWorker(n) {

    if (n) {
        n.tempId = 'gonna-die';
        this.available = _.without(this.available, _.findWhere(this.available, {tempId: 'gonna-die'}));
        this.all = _.without(this.all, _.findWhere(this.all, {tempId: 'gonna-die'}));
        n.kill();
    }
    else {
        console.error('no worker passed to removeWorker function.');
    }
}


Pool.prototype.removeWorker = function () {

    var n = this.available.pop();

    if (n) {
        n.tempId = 'gonna-die';
        this.all = _.without(this.all, _.findWhere(this.all, {tempId: 'gonna-die'}));
        n.kill();
    }
    else {
        this.removeNext = true;
    }

};


Pool.prototype.getCurrentSize = function () {
    return {
        available: this.available.length,
        all: this.all.length
    }
};


function handleCallback(data) {

    var workId = data.workId;

    var cbOrPromise = this.resolutions[workId];

    delete this.resolutions[workId];

    if (cbOrPromise) {
        if (data.error) {
            var err = new Error(data.error);
            if (cbOrPromise.cb) {
                cbOrPromise.cb(err);
            }
            else if (cbOrPromise.reject) {
                cbOrPromise.reject(err)
            }
            else {
                console.error('this should not happen 1')
            }
        }
        else {
            if (cbOrPromise.cb) {
                cbOrPromise.cb(null, data.result);
            }
            else if (cbOrPromise.resolve) {
                cbOrPromise.resolve(data.result);
            }
            else {
                console.error('this should not happen 2')
            }
        }
    }
    else {
        console.error('this should not happen 3 - but might if a callback is attempted to be called more than once.')
    }
}


function delegateWorker(n) {

    if (this.kill) {
        n.kill();
        return;
    }

    if (this.removeNext) {
        this.removeNext = false;
        n.tempId = 'gonna-die';
        this.all = _.without(this.all, _.findWhere(this.all, {tempId: 'gonna-die'}));
        n.kill();
        return;  //don't push cp back on available queue
    }

    if (this.msgQueue.length > 0) {
        var msg = this.msgQueue.shift();
        msg.__poolioWorkerId = n.workerId;
        n.send(msg);
    }
    else {
        debug('worker is available and is back in the pool');
        this.available.push(n);
        debug('pool size for pool ' + this.pool_id + ' is: ' + this.available.length);
    }
}


Pool.prototype.any = function (msg, cb) {


    if (this.kill) {
        console.log('warning: pool.any called on pool of dead/dying workers');
        return;
    }

    debug('current available pool size for pool_id ' + this.pool_id + ' is: ' + this.available.length);

    var workId = this.jobIdCounter++;

    setImmediate(() => {
        if (this.available.length > 0) {
            var n = this.available.shift();
            n.send({
                msg: msg,
                workId: workId,
                __poolioWorkerId: n.workerId
            });
        }
        else {

            if (this.all.length < 1) {
                console.log('warning: your Poolio pool has been reduced to size of 0 workers, you will have to add a worker to process new and/or existing messages.');
            }

            this.msgQueue.push({
                workId: workId,
                msg: msg
            });
        }
    });

    if (typeof cb === 'function') {
        this.resolutions[workId] = {
            cb: cb
        };
    }
    else {
        return new Promise((resolve, reject) => {
            this.resolutions[workId] = {
                resolve: resolve,
                reject: reject
            };
        });
    }
};


Pool.prototype.killAll = function () {

    this.kill = true;
    this.available.forEach(n => {
        n.kill();
    });

    return this;
};


Pool.prototype.killAllImmediate = function () {

    this.kill = true;
    var length = this.all.length;
    var killed = 0;
    this.all.forEach(n => {
        n.kill();
        n.once('exit', () => {
            killed++;
            if (killed >= length) {
                this.emit('all-killed');
            }
        });
    });

    return this;
};


module.exports = Pool;