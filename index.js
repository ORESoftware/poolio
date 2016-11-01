/**
 * Created by denman on 1/25/2016.
 */


//TODO: move to lodash from underscore
//TODO: https://devnet.jetbrains.com/message/5507221
//TODO: https://youtrack.jetbrains.com/issue/WEB-1919
//TODO: add logger argument, or pipe stdout somewhere

/*

 child_process.spawn(command[, args][, options])#

 Added in: v0.1.90
 command <String> The command to run
 args <Array> List of string arguments
 options <Object>
 cwd <String> Current working directory of the child process
 env <Object> Environment key-value pairs
 stdio <Array> | <String> Child's stdio configuration. (See options.stdio)
 detached <Boolean> Prepare child to run independently of its parent process. Specific behavior depends on the platform, see options.detached)
 uid <Number> Sets the user identity of the process. (See setuid(2).)
 gid <Number> Sets the group identity of the process. (See setgid(2).)
 shell <Boolean> | <String> If true, runs command inside of a shell. Uses '/bin/sh' on UNIX, and 'cmd.exe' on Windows. A different shell can be specified as a string. The shell should understand the -c switch on UNIX, or /s /c on Windows. Defaults to false (no shell).
 return: <ChildProcess>


 */


//TODO: need to add oneTimeOnly:true boolean option - when message is sent to worker, worker is immediately removed
//from all array, so it will never get reused

/////////////////////////////////////////////////////////////////////////

const isDebug = process.execArgv.indexOf('debug') > 0;
if (isDebug) console.log('Poolio isDebug flag set to:', isDebug);

/////////////////////////////////////////////////////////////////////////

const assert = require('assert');
const cp = require('child_process');
const _ = require('underscore');
const path = require('path');
const EE = require('events');
const util = require('util');
const fs = require('fs');
const residence = require('residence');

/////////////////////////////////////////////////////

const root = residence.findProjectRoot(process.cwd());

////////////////////////////////////////////////////

const acceptableConstructorOptions = [
    'execArgv',
    'args',
    'size',
    'filePath',
    'addWorkerOnExit',
    'oneTimeOnly',
    'silent',
    'stdin',
    'stdout',
    'stderr',
    'getSharedWritableStream'
];

////////////////////////////////////////////////////////

var id = 1; //avoid falsy 0 values, just start with 1

//opts
const defaultOpts = {
    filePath: null,
    addWorkerOnExit: false,
    size: 1,
    silent: false,
    env: process.env,
    execArgv: [],
    args: []
};

///////////////////////////////////////////////////////

//constructor
function Pool(options) {

    EE.call(this);

    //internal
    this.kill = false;
    this.all = [];
    this.available = [];
    this.msgQueue = [];
    this.resolutions = {};
    this.removeNextAvailableWorker = false;
    this.workerIdCounter = 1; //avoid falsy 0 values, start with 1
    this.jobIdCounter = 1; //avoid falsy 0 values, start with 1
    this.okToDelegate = false;
    this.__poolId = '@poolio_pool_' + id++;

    if (typeof options !== 'object' || Array.isArray(options)) {
        throw new Error('Options object should be defined for your poolio pool, as "filePath" option property is required.');
    }

    Object.keys(options).forEach(function (key) {
        if (acceptableConstructorOptions.indexOf(key) < 0) {
            console.log(' => Poolio message => the following option property is not a valid Poolio constructor option:', key);
        }
    });

    const opts = _.defaults(_.pick(options, acceptableConstructorOptions), defaultOpts);

    assert(Number.isInteger(opts.size) && opts.size > 0, 'Poolio pool size must an integer greater than 0.');
    // assert(opts.args && !Array.isArray(opts.args),
    // 	'"args" option passed to poolio pool, but args was not an array => ' + JSON.stringify(opts));
    // assert(opts.execArgv && !Array.isArray(opts.execArgv),
    // 	'"execArgv" option passed to poolio pool, but execArgv was not an array.');

    //do this explicitly instead of using loop, for syntax highlighting
    this.execArgv = opts.execArgv;
    this.args = opts.args;

    assert(opts.filePath, ' => Poolio: user error => you need to provide "filePath" option for Poolio constructor');

    this.filePath = path.isAbsolute(opts.filePath) ? opts.filePath :
        path.resolve(root + '/' + this.filePath);

    if (path.extname(this.filePath) === '') {
        this.filePath = this.filePath.concat('.js');
    }

    var isFile = false;
    try {
        isFile = fs.statSync(this.filePath).isFile()
    }
    catch (e) {
        throw new Error('=> Poolio worker pool constructor error: "filePath" property passed is not a file => ' + this.filePath + '\n' + e.stack);
    }

    assert(isFile, ' => Poolio constructor error: filePath is not a file => ' + this.filePath);

    if ('size' in opts) {
        assert(Number.isInteger(opts.size),
            'Poolio init error => "size" property of options should be an integer.');
    }

    this.size = opts.size;

    if ('addWorkerOnExit' in opts) {
        assert(typeof opts.addWorkerOnExit === 'boolean',
            'Poolio init error => "addWorkerOnExit" property of options should be a boolean value.');
    }

    this.oneTimeOnly = !!opts.oneTimeOnly; //if undefined, defaults to false
    this.addWorkerOnExit = !!opts.addWorkerOnExit; //if undefined, defaults to false

    if ('silent' in opts) {
        assert(typeof opts.silent === 'boolean',
            'Poolio init error => "silent" property of options should be a boolean value.');
    }

    this.silent = opts.silent;
    this.stdin = opts.stdin;
    this.stdout = opts.stdout;
    this.stderr = opts.stderr;
    this.getSharedWritableStream = opts.getSharedWritableStream

    this.on('error', err => {
        if (this.listenerCount('error') === 1) {
            console.error(' => Poolio: your worker pool experienced an error => ', (err.stack || err));
            console.error(' => Poolio => please add your own "error" event listener using pool.on("error", fn) ' +
                'to prevent these error messages from being logged.');
        }
    });

    for (var i = 0; i < this.size; i++) {
        this.addWorker();
    }

    this.okToDelegate = true;

}

util.inherits(Pool, EE);

Pool.prototype.addWorker = function () {

    const execArgv = JSON.parse(JSON.stringify(this.execArgv)); //copy execArgv

    if (isDebug) {
        execArgv.push('--debug=' + (53034 + id)); //http://stackoverflow.com/questions/16840623/how-to-debug-node-js-child-forked-process
    }

    const n = cp.fork(this.filePath, this.args, {
        detached: false,
        execArgv: execArgv,
        silent: this.silent,
        env: this.env
    });

    if (this.silent) {
        const getWritable = this.getSharedWritableStream;
        if(getWritable){
            //we pipe stdout and stderr to the same stream
            const strm = typeof getWritable === 'function' ? getWritable() : getWritable;
            n.stdio[1].pipe(strm);
            n.stdio[2].pipe(strm);
        }
        else{
            if (this.stdout) {
                n.stdio[1].pipe(typeof this.stdout === 'function' ? this.stdout() : this.stdout); // fs.createWriteStream(p1)
            }
            if (this.stderr) {
                n.stdio[2].pipe(typeof this.stderr === 'function' ? this.stderr() : this.stderr);
            }
        }

    }

    n.workerId = this.workerIdCounter++;

    n.on('error', err => {
        this.emit('worker-error', err, n.workerId);
    });

    n.once('exit', (code, signal) => {

        n.removeAllListeners();
        this.emit('worker-exited', code, signal, n.workerId);
        removeSpecificWorker(this, n, false);

        if (this.addWorkerOnExit) {
            this.addWorker();
        }
        else {
            if (this.all.length < 1) {
                this.kill = false;
                this.emit('all-killed', null);
            }
        }
    });

    n.on('message', data => {
        if (!data.workId) {
            console.error(' => Poolio warning => message sent from worker with no workId => ', '\n', JSON.stringify(data));
        }
        switch (data.msg) {
            case 'done':
                handleCallback(this, data);
                break;
            case 'return/to/pool':
                delegateNewlyAvailableWorker(this, n);
                break;
            case 'done/return/to/pool':
                handleCallback(this, data); //probably want to handle callback first
                delegateNewlyAvailableWorker(this, n);
                break;
            case 'error':
                this.emit('error', data); // TODO: handle this error event
                handleCallback(this, data);
                delegateNewlyAvailableWorker(this, n);
                break;
            case 'fatal':
                this.emit('error', data); // TODO: handle this error event
                handleCallback(this, data);
                removeSpecificWorker(this, n);
                break;
            default:
                const err = new Error('Poolio warning: your Poolio worker sent a message that ' +
                    'was not recognized by the Poolio library =>' + '\n' + util.inspect(data));
                this.emit('error', err);
        }
    });

    this.all.push(n);
    this.emit('worker-created', n.workerId);
    this.emit('worker-added', n.workerId);

    if (this.okToDelegate) {
        //TODO: bug - we should be able to just call delegateCP from here, but there is some problem with that
        if (this.msgQueue.length > 0) {
            n.send(this.msgQueue.shift());
        } else {
            this.available.push(n);
        }
    } else {
        this.available.push(n);
    }

    return this;

};

function removeSpecificWorker(pool, n, callKill) {

    if (n) {
        n.tempId = 'gonna-die';
        resetDueToDeadWorkers(pool);
        if (callKill !== false) {
            n.kill();
        }

    } else {
        console.error(' => Poolio internal error: no worker passed to internal ' +
            'removeSpecificWorker() function.');
    }
}

function resetDueToDeadWorkers(pool) {
    pool.all = pool.all.filter(n => n.tempId !== 'gonna-die');
    pool.available = pool.available.filter(n => n.tempId !== 'gonna-die');
}

Pool.prototype.removeWorker = function () {

    if (this.all.length < 1) {
        console.error(' => Poolio warning => Cannot remove worker from pool of 0 workers.');
    }
    else if (this.all.length === 1 && this.removeNextAvailableWorker) {
        console.error(' => Poolio warning => Already removed last worker, there will soon' +
            ' be 0 workers in the pool.');
    }
    else {
        const n = this.available.pop();
        if (n) {
            removeSpecificWorker(this, n);
            this.emit('worker-removed', n.workerId);
        } else {
            this.removeNextAvailableWorker = true;
        }
    }

    return this;
};

Pool.prototype.getCurrentSize = Pool.prototype.getCurrentStats = function () {
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
            const err = new Error(util.inspect(data.error));
            if (cbOrPromise.cb) {
                cbOrPromise.cb(err);
            } else if (cbOrPromise.reject) {
                cbOrPromise.reject(err)
            } else {
                console.error('Internal Poolio error => no resolution callback fn available [a].')
            }
        } else {
            if (cbOrPromise.cb) {
                cbOrPromise.cb(null, data.result);
            } else if (cbOrPromise.resolve) {
                cbOrPromise.resolve(data.result);
            } else {
                console.error('Internal Poolio error => no resolution callback fn available [b].')
            }
        }
    } else {
        console.error('Internal Poolio error => this should not happen - but might if' +
            ' a callback is attempted to be called more than once.')
    }
}

function delegateNewlyAvailableWorker(pool, n) {

    if (pool.kill) {
        removeSpecificWorker(pool, n);
        return;
    }

    if (this.oneTimeOnly) {
        removeSpecificWorker(pool, n);
        console.error(' => Poolio warning => delegateNewlyAvailableWorker() was called on a worker that should have been "oneTimeOnly".');
        return;
    }

    if (pool.removeNextAvailableWorker) {
        pool.removeNextAvailableWorker = false;
        removeSpecificWorker(pool, n);
        this.emit('worker-removed', n.workerId);
        return; //note: don't push cp back on available queue
    }

    if (pool.msgQueue.length > 0) {
        const msg = pool.msgQueue.shift();
        msg.__poolioWorkerId = n.workerId;
        n.send(msg);
    } else {
        pool.available.push(n);
    }
}

Pool.prototype.any = function (msg, cb) {

    if (this.kill) {
        console.error('\n', ' => Poolio usage warning: pool.any() called on pool of dead/dying workers => ', '\n', 'use pool.addWorker() to replenish the pool.');
        return;
    }

    if (this.all.length < 1) {
        console.error('\n', ' => Poolio usage warning: you called pool.any() but your worker pool has 0 workers most likely because all have exited => ' +
            'you need to call pool.addWorker() to replenish the pool, or use the {addWorkerOnExit:true} option.');
        return;
    }

    const workId = this.jobIdCounter++;

    setImmediate(() => {
        if (this.available.length > 0) {
            const n = this.available.shift();

            if (this.oneTimeOnly) {
                n.tempId = 'gonna-die';
                resetDueToDeadWorkers(this);
            }

            n.send({
                msg: msg,
                workId: workId,
                __poolioWorkerId: n.workerId
            });
        } else {

            if (this.all.length < 1) {
                console.log('Poolio warning: your Poolio pool has been reduced to size of 0 workers, you will have to add a worker to process new and/or existing messages.');
            }

            this.msgQueue.push({
                workId: workId,
                msg: msg
            });
        }
    });

    const d = process.domain;

    if (typeof cb === 'function') {
        this.resolutions[workId] = {
            cb: d ? d.bind(cb) : cb
        };
    } else {
        return new Promise((resolve, reject) => {
            this.resolutions[workId] = {
                resolve: d ? d.bind(resolve) : resolve,
                reject: d ? d.bind(reject) : reject
            };
        });
    }
};

Pool.prototype.destroy = function () {

    // killall and remove all listeners

    return this;
};

Pool.prototype.killAllActiveWorkers = function () {

    this.all.forEach(n => {
        // if child process is not in the available list, we should kill it
        if (this.available.every(ntemp => ntemp.workerId !== n.workerId)) {
            removeSpecificWorker(this, n);
        }
    });

    return this;
};

Pool.prototype.killAll = function () {

    this.kill = true;
    this.available.forEach(n => {
        removeSpecificWorker(this, n);
    });
    return this;
};

Pool.prototype.killAllImmediately = function () {

    this.kill = true;
    this.all.forEach(n => {
        removeSpecificWorker(this, n);
    });

    return this;

};

module.exports = Pool;
