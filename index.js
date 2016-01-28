/**
 * Created by denman on 1/25/2016.
 */

/**
 * Created by amills001c on 10/12/15.
 */

//TODO: https://devnet.jetbrains.com/message/5507221
//TODO: https://youtrack.jetbrains.com/issue/WEB-1919
//TODO: after spawning cps, how do we know if they are ready to receive messages and do work?

var cp = require('child_process');
var _ = require('underscore');
var path = require('path');
var debug = require('debug')('poolio');
var EE = require('events');

var id = 0;

function Pool(options) {

    this.kill = false;
    this.all = [];
    this.available = [];
    this.msgQueue = [];
    this.resolutions = {};
    this.removeNext = false;
    this.counter = 0;
    this.okToDelegate = false;

    this.ee = new EE();

    var opts = _.defaults(options, {
        size: 1,
        pool_id: '@pool_' + id++
    });

    for (var option in opts) {
        if (opts.hasOwnProperty(option)) {
            this[option] = opts[option];
        }
    }

    if (this.filePath == null || this.size == null) {
        throw new Error('need to provide filePath value and size value for Poolio constructor');
    }

    for (var i = 0; i < this.size; i++) {
        this.addWorker();
    }

    this.okToDelegate = true;

}


Pool.prototype.addWorker = function () {

    var n = cp.fork(path.resolve(this.filePath), [], {
        execArgs: []
    });

    this.all.push(n);

    n.on('message', data => {
        debug('message from worker: ' + data);
        var workId = data.workId;
        switch (data.msg) {
            case 'done':
                handleCallback.bind(this)(data);
                break;
            case 'return/to/pool':
                delegateCP.bind(this)(n);
                break;
            //case 'done/return/to/pool':
            //    delegateCP.bind(this)(n);
            //    handleCallback.bind(this)(workId, data);
            //    break;
            case 'error':
                console.error(data);
                handleCallback.bind(this)(data);
                delegateCP.bind(this)(n);
                break;
            case 'fatal':
                console.error(data);
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

    console.log('data in handleCallback:',data);

    var workId = data.workId;

    var cbOrPromise = this.resolutions[workId];

    debug('cbOrPromise: ' + cbOrPromise);

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


function delegateCP(n) {

    if (this.kill) {
        //cp.send('SIGTERM');
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
        n.send(this.msgQueue.shift());
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

    var workId = this.counter++;

    setImmediate(() => {
        if (this.available.length > 0) {
            var n = this.available.shift();
            n.send({
                msg: msg,
                workId: workId
            });
        }
        else {

            if (this.all.length < 1) {
                console.log('warning: Poolio pool has been reduced to size of 0 workers, you will have to add a worker to process new and/or existing messages.');
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
        n.once('exit', () => {
            this.ee.emit('killed');
        });
        n.once('error', (err) => {
            this.ee.emit('error', err);
        });
    });

    return this.ee;
};


Pool.prototype.killAllImmediate = function () {

    this.kill = true;
    var length = this.all.length;
    var killed = 0;
    this.all.forEach(n => {
        n.kill();
        n.once('exit', () => {
            killed++;
            this.ee.emit('killed');
            if (killed >= length) {
                this.ee.emit('all-killed');
            }
        });
        n.once('error', (err) => {
            this.ee.emit('error', err);
        });
    });

    return this.ee;
};


module.exports = Pool;