/**
 * Created by denman on 1/25/2016.
 */


//TODO: move to lodash from underscore
//TODO: https://devnet.jetbrains.com/message/5507221
//TODO: https://youtrack.jetbrains.com/issue/WEB-1919
//TODO: replace underscore with lodash?
//TODO: https://github.com/npm/nopt
//TODO: add logger argument, or pipe stdout somewhere


/////////////////////////////////////////////////////////////////////////

const isDebug = process.execArgv.indexOf('debug') > 0;
if (isDebug) console.log('Poolio isDebug flag set to:', isDebug);

/////////////////////////////////////////////////////////////////////////

const cp = require('child_process');
const _ = require('underscore');
const path = require('path');
const debug = require('debug')('poolio');
const EE = require('events');
const util = require('util');
const fs = require('fs');
const residence = require('residence');

/////////////////////////////////////////////////////

const acceptableConstructorOptions = ['execArgv', 'args', 'size', 'filePath'];

var id = 1; //avoid falsy 0 values, just start with 1

function Pool(options) {

    EE.call(this);

    this.kill = false;
    this.all = [];
    this.available = [];
    this.msgQueue = [];
    this.resolutions = {};
    this.removeNext = false;
    this.workerIdCounter = 1; //avoid falsy 0 values, start with 1
    this.jobIdCounter = 1; //avoid falsy 0 values, start with 1
    this.okToDelegate = false;
    this.filePath = null;
    this.size = null;
    this.execArgv = null;
    this.args = null;


    if (typeof options !== 'object') {
        throw new Error('Options object should be defined for your poolio pool, even if it is an empty object, it is needed');
    }

    const opts = _.defaults(_.pick(options, acceptableConstructorOptions), {
        size: 1,
        __pool_id: '@poolio_pool_' + id++
    });

    if (opts.size < 1) {
        throw new Error('Poolio pool size must an integer greater than 0.')
    }

    if (opts.args && !Array.isArray(opts.args)) {
        throw new Error('"args" option passed to poolio pool, but args was not an array.');
    }

    if (opts.execArgv && !Array.isArray(opts.execArgv)) {
        throw new Error('"execArgv" option passed to poolio pool, but execArgv was not an array.');
    }

    Object.keys(opts).forEach(key => {
        this[key] = opts[key];
    });

    this.execArgv = this.execArgv || [];

    if (this.filePath == null || this.size == null) {
        throw new Error('need to provide filePath value and size value for Poolio constructor');
    }

    if (!path.isAbsolute(this.filePath)) {
        const root = residence.findProjectRoot(process.cwd());
        const str = String(this.filePath);
        this.filePath = path.resolve(root + '/' + str);
    }

    this.on('error', function (err) {
        console.error(err);
    });

    for (var i = 0; i < this.size; i++) {
        this.addWorker();
    }

    this.okToDelegate = true;

}

util.inherits(Pool, EE);


Pool.prototype.addWorker = function () {

    const id = this.workerIdCounter++;

    const execArgv = JSON.parse(JSON.stringify(this.execArgv)); //copy execArgv

    if (isDebug) {
        execArgv.push('--debug=' + (53034 + id)); //http://stackoverflow.com/questions/16840623/how-to-debug-node-js-child-forked-process
    }

    const n = cp.fork(this.filePath, this.args || [], {
        detached: true,
        execArgv: execArgv
    });

    n.workerId = id;

    n.on('error', (err) => {
        this.emit('worker-error', err);
    });

    n.once('exit', () => {
        this.emit('worker-exited', n);
    });


    this.all.push(n);

    this.emit('worker-created');

    n.on('message', data => {
        debug('message from worker: ' + data);
        if (!data.workId) {
            console.error(' => Poolio => message sent from worker with no workId => ', '\n', JSON.stringify(data));
        }
        switch (data.msg) {
            case 'done':
                handleCallback(this, data);
                break;
            case 'return/to/pool':
                delegateWorker(this, n);
                break;
            case 'done/return/to/pool':
                handleCallback(this, data); //probably want to handle callback first
                delegateWorker(this, n);
                break;
            case 'error':
                console.error(data);
                this.emit('error', data); // TODO: handle this error event
                handleCallback(this, data);
                delegateWorker(this, n);
                break;
            case 'fatal':
                console.error(data);
                this.emit('error', data); // TODO: handle this error event
                handleCallback(this, data);
                removeSpecificWorker(this, n);
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
        } else {
            debug('worker is available and is back in the pool');
            this.available.push(n);
            debug('pool size for pool ' + this.pool_id + ' is: ' + this.available.length);
        }
    } else {
        this.available.push(n);
    }
};


function removeSpecificWorker(pool, n) {

    if (n) {
        n.tempId = 'gonna-die';
        pool.available = _.without(pool.available, _.findWhere(pool.available, {
            tempId: 'gonna-die'
        }));
        pool.all = _.without(pool.all, _.findWhere(pool.all, {
            tempId: 'gonna-die'
        }));
        n.kill();
    } else {
        console.error('no worker passed to removeWorker function.');
    }
}


Pool.prototype.removeWorker = function () {

    const n = this.available.pop();

    if (n) {
        n.tempId = 'gonna-die';
        this.all = _.without(this.all, _.findWhere(this.all, {
            tempId: 'gonna-die'
        }));
        n.kill();
    } else {
        this.removeNext = true;
    }

};


Pool.prototype.getCurrentSize = function () {
    return {
        available: this.available.length,
        all: this.all.length
    }
};


function handleCallback(pool, data) {

    const workId = data.workId;
    const cbOrPromise = pool.resolutions[workId];

    delete pool.resolutions[workId];

    if (cbOrPromise) {
        if (data.error) {
            var err = new Error(data.error);
            if (cbOrPromise.cb) {
                cbOrPromise.cb(err);
            } else if (cbOrPromise.reject) {
                cbOrPromise.reject(err)
            } else {
                console.error('this should not happen 1')
            }
        } else {
            if (cbOrPromise.cb) {
                cbOrPromise.cb(null, data.result);
            } else if (cbOrPromise.resolve) {
                cbOrPromise.resolve(data.result);
            } else {
                console.error('this should not happen 2')
            }
        }
    } else {
        console.error('this should not happen 3 - but might if a callback is attempted to be called more than once.')
    }
}


function delegateWorker(pool, n) {

    if (pool.kill) {
        try {
            n.kill();
        }
        catch (err) {
            console.error(err);
        }
        return;
    }

    if (pool.removeNext) {
        pool.removeNext = false;
        n.tempId = 'gonna-die';
        pool.all = _.without(pool.all, _.findWhere(pool.all, {
            tempId: 'gonna-die'
        }));
        n.kill();
        return; //don't push cp back on available queue
    }

    if (pool.msgQueue.length > 0) {
        const msg = pool.msgQueue.shift();
        msg.__poolioWorkerId = n.workerId;
        n.send(msg);
    } else {
        debug('worker is available and is back in the pool');
        pool.available.push(n);
        debug('pool size for pool ' + pool.pool_id + ' is: ' + pool.available.length);
    }
}


Pool.prototype.any = function (msg, cb) {


    if (this.kill) {
        console.log('warning: pool.any called on pool of dead/dying workers');
        return;
    }

    debug('current available pool size for pool_id ' + this.pool_id + ' is: ' + this.available.length);

    const workId = this.jobIdCounter++;

    setImmediate(() => {
        if (this.available.length > 0) {
            const n = this.available.shift();
            n.send({
                msg: msg,
                workId: workId,
                __poolioWorkerId: n.workerId
            });
        } else {

            if (this.all.length < 1) {
                console.log('warning: your Poolio pool has been reduced to size of 0 workers, you will have to add a worker to process new and/or existing messages.');
            }

            this.msgQueue.push({
                workId: workId,
                msg: msg
            });
        }
    });

    var d;

    if (typeof cb === 'function') {
        if (d = process.domain) d.bind(cb);
        this.resolutions[workId] = {
            cb: cb
        };
    } else {
        return new Promise((resolve, reject) => {
            if (d = process.domain) {
                d.bind(resolve);
                d.bind(reject);
            }
            this.resolutions[workId] = {
                resolve: resolve,
                reject: reject
            };
        });
    }
};


Pool.prototype.destroy = function () {

    // killall and remove all listeners


    return this;
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
    const length = this.all.length;
    var killed = 0;
    this.all.forEach(n => {
        n.once('exit', () => {
            killed++;
            if (killed >= length) {
                this.emit('all-killed', this);
            }
        });
        n.kill();
    });

    return this;
};


module.exports = Pool;
