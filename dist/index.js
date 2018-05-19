'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const cp = require("child_process");
const path = require("path");
const EE = require("events");
const util = require("util");
const fs = require("fs");
const chalk = require("chalk");
const residence = require("residence");
const root = residence.findProjectRoot(process.cwd());
const log = {
    info: console.log.bind(console, '[poolio]'),
    good: console.log.bind(console, '[poolio]'),
    veryGood: console.log.bind(console, chalk.green('[poolio]')),
    warning: console.error.bind(console, chalk.yellow.bold('[poolio warning]')),
    error: console.error.bind(console, chalk.red('[poolio error]'))
};
const acceptableConstructorOptions = {
    'execArgv': true,
    'args': true,
    'size': true,
    'filePath': true,
    'addWorkerOnExit': true,
    'oneTimeOnly': true,
    'silent': true,
    'stdin': true,
    'stdout': true,
    'stderr': true,
    'getSharedWritableStream': true,
    'streamStdioAfterDelegation': true,
    'inheritStdio': true,
    'resolveWhenWorkerExits': true,
    'env': true
};
let id = 1;
const defaultOpts = {
    inheritStdio: true,
    filePath: null,
    addWorkerOnExit: true,
    size: 1,
    silent: false,
    execArgv: [],
    args: []
};
const isDebug = process.execArgv.indexOf('debug') > 0;
if (isDebug)
    log.info('isDebug flag set to:', isDebug);
const getWritable = function (fnOrStrm) {
    return (typeof fnOrStrm === 'function') ? fnOrStrm() : fnOrStrm;
};
const removeSpecificWorker = function (pool, n, callKill) {
    n.tempId = 'gonna-die';
    resetDueToDeadWorkers(pool);
    if (callKill !== false) {
        n.kill('SIGINT');
    }
    pool.emit('worker-removed', n.workerId);
};
const resetDueToDeadWorkers = function (pool) {
    const all = pool.all.filter(n => n.tempId !== 'gonna-die');
    const available = pool.available.filter(n => n.tempId !== 'gonna-die');
    while (pool.all.length) {
        pool.all.pop();
    }
    while (pool.available.length) {
        pool.available.pop();
    }
    all.forEach(function (v) {
        pool.all.push(v);
    });
    available.forEach(function (v) {
        pool.available.push(v);
    });
};
const handleCallback = function (pool, data) {
    const workId = data.workId;
    const cbOrPromise = pool.resolutions[workId];
    const result = data.result || null;
    delete pool.resolutions[workId];
    if (cbOrPromise) {
        if (data.error) {
            const err = new Error(util.inspect(data.error));
            if (cbOrPromise.cb) {
                cbOrPromise.cb(err, result);
            }
            else if (cbOrPromise.reject) {
                cbOrPromise.reject(err);
            }
            else {
                throw 'Internal Poolio error => no resolution callback fn available [a], please report on Github.';
            }
        }
        else {
            if (cbOrPromise.cb) {
                cbOrPromise.cb(null, result);
            }
            else if (cbOrPromise.resolve) {
                cbOrPromise.resolve(result);
            }
            else {
                throw 'Internal Poolio error => no resolution callback fn available [b], please report on Github.';
            }
        }
    }
    else {
    }
};
const delegateNewWorker = function (pool, n) {
    if (pool.okToDelegate) {
        if (pool.msgQueue.length > 0) {
            handleStdio(this, n);
            const msg = this.msgQueue.shift();
            n.workId = msg.workId;
            n.send(msg);
            return;
        }
    }
    pool.available.push(n);
};
const handleStdio = function (pool, n, opts) {
    opts = opts || {};
    if (pool.getSharedWritableStream) {
        let strm = getWritable(pool.getSharedWritableStream);
        n.stdio[1].pipe(strm);
        n.stdio[2].pipe(strm);
    }
    if (pool.stdout) {
        n.stdio[1].pipe(getWritable(pool.stdout));
    }
    if (pool.stderr) {
        n.stdio[2].pipe(getWritable(pool.stderr));
    }
    if (opts.tty) {
        let fd = fs.openSync(opts.tty, 'r+');
        let strm = fs.createWriteStream(null, { fd });
        n.stdio[1].pipe(strm);
        n.stdio[2].pipe(strm);
    }
    if (opts.file) {
        let strm = fs.createWriteStream(opts.file);
        n.stdio[1].pipe(strm);
        n.stdio[2].pipe(strm);
    }
    if (opts.fd) {
        let strm = fs.createWriteStream(null, { fd: opts.fd });
        n.stdio[1].pipe(strm);
        n.stdio[2].pipe(strm);
    }
    if (opts.socket) {
        n.stdio[1].pipe(opts.socket);
        n.stdio[2].pipe(opts.socket);
    }
};
const delegateNewlyAvailableWorker = function (pool, n) {
    if (pool.kill) {
        removeSpecificWorker(pool, n);
        return;
    }
    if (pool.oneTimeOnly) {
        removeSpecificWorker(pool, n);
        log.warning('warning => delegateNewlyAvailableWorker() was called on a worker that should have been "oneTimeOnly".');
        return;
    }
    if (pool.removeNextAvailableWorker) {
        pool.removeNextAvailableWorker = false;
        removeSpecificWorker(pool, n);
        return;
    }
    if (pool.msgQueue.length > 0) {
        const msg = pool.msgQueue.shift();
        msg.__poolioWorkerId = n.workerId;
        n.workId = msg.workId;
        n.send(msg);
    }
    else {
        pool.available.push(n);
    }
};
class Pool extends EE {
    constructor(options) {
        super();
        this.kill = false;
        this.all = [];
        this.available = [];
        this.msgQueue = [];
        this.resolutions = {};
        this.removeNextAvailableWorker = false;
        this.workerIdCounter = 1;
        this.jobIdCounter = 1;
        this.okToDelegate = false;
        this.__poolId = '@poolio_pool_' + id++;
        this.numberOfSpawnedWorkers = 0;
        this.numberOfDeadWorkers = 0;
        if (typeof options !== 'object' || Array.isArray(options)) {
            throw new Error('Options object should be defined for your poolio pool, as "filePath" option property is required.');
        }
        Object.keys(options).forEach(function (key) {
            if (!acceptableConstructorOptions[key]) {
                log.warning('the following option property is not a valid Poolio constructor option:', key);
            }
        });
        const opts = Object.assign({}, defaultOpts, options);
        assert(Number.isInteger(opts.size) && opts.size > 0, 'Poolio pool size must an integer greater than 0.');
        this.execArgv = opts.execArgv ? opts.execArgv.slice(0) : [];
        this.args = opts.args ? opts.args.slice(0) : [];
        this.inheritStdio = Boolean(opts.inheritStdio);
        this.streamStdioAfterDelegation = Boolean(opts.streamStdioAfterDelegation);
        assert(opts.filePath, ' => Poolio: user error => you need to provide "filePath" option for Poolio constructor');
        this.filePath = path.isAbsolute(opts.filePath) ? opts.filePath : path.resolve(root + '/' + this.filePath);
        let isFile = false;
        try {
            isFile = fs.statSync(this.filePath).isFile();
        }
        catch (e) {
            throw new Error('=> Poolio worker pool constructor error: "filePath" property passed is not a file => ' + this.filePath + '\n' + e.stack);
        }
        assert(isFile, ' => Poolio constructor error: filePath is not a file => ' + this.filePath);
        if ('size' in opts) {
            assert(Number.isInteger(opts.size), 'Poolio init error => "size" property of options should be an integer.');
        }
        this.size = opts.size;
        if ('addWorkerOnExit' in opts) {
            assert.equal(typeof opts.addWorkerOnExit, 'boolean', 'Poolio init error => "addWorkerOnExit" property of options should be a boolean value.');
        }
        this.oneTimeOnly = Boolean(opts.oneTimeOnly);
        if (this.oneTimeOnly) {
            this.addWorkerOnExit = opts.addWorkerOnExit !== false;
        }
        else {
            this.addWorkerOnExit = Boolean(opts.addWorkerOnExit);
        }
        if ('silent' in opts) {
            assert.equal(typeof opts.silent, 'boolean', 'Poolio init error => "silent" property of options should be a boolean value.');
        }
        this.env = Object.assign({}, opts.env || {});
        this.silent = opts.silent;
        this.stdin = opts.stdin;
        this.stdout = opts.stdout;
        this.stderr = opts.stderr;
        this.getSharedWritableStream = opts.getSharedWritableStream;
        this.resolveWhenWorkerExits = opts.resolveWhenWorkerExits;
        this.doNotListenForMessagesFromWorkers = opts.doNotListenForMessagesFromWorkers;
        this.oneJobPerWorker = opts.oneJobPerWorker;
        this.on('error', err => {
            if (this.listenerCount('error') === 1) {
                log.error('your worker pool experienced an error => ', (err.stack || err));
                log.error('please add your own "error" event listener using pool.on("error", fn) ' +
                    'to prevent these error messages from being logged.');
            }
        });
        for (let i = 0; i < this.size; i++) {
            this.addWorker();
        }
        this.okToDelegate = true;
    }
    addWorker() {
        const args = this.args.slice(0);
        args.unshift(this.filePath);
        const execArgv = this.execArgv.slice(0);
        if (isDebug) {
            execArgv.push('--debug=' + (53034 + id));
        }
        execArgv.forEach((arg) => {
            args.unshift(arg);
        });
        const n = cp.spawn('node', args, {
            detached: false,
            env: Object.assign({}, this.env),
            stdio: [
                'ignore',
                this.silent ? 'ignore' : 'pipe',
                this.silent ? 'ignore' : 'pipe',
                'ipc'
            ],
        });
        if (this.inheritStdio) {
            n.stdio[1].pipe(process.stdout);
            n.stdio[2].pipe(process.stderr);
        }
        else {
            let strm = fs.createWriteStream('/dev/null');
            n.stdio[1].pipe(strm);
            n.stdio[2].pipe(strm);
        }
        if (n.stdio && this.streamStdioAfterDelegation === false) {
            handleStdio(this, n);
        }
        this.numberOfSpawnedWorkers++;
        n.workerId = this.workerIdCounter++;
        n.on('error', err => {
            this.emit('worker-error', err, n.workerId);
        });
        n.once('exit', (code, signal) => {
            this.numberOfDeadWorkers++;
            const workId = n.workId;
            delete n.workId;
            if (this.resolveWhenWorkerExits) {
                handleCallback(this, {
                    workId,
                    result: null
                });
            }
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
                log.warning('message sent from worker with no workId => ', '\n', JSON.stringify(data));
            }
            switch (data.msg) {
                case 'done':
                    handleCallback(this, data);
                    break;
                case 'return/to/pool':
                    delegateNewlyAvailableWorker(this, n);
                    break;
                case 'done/return/to/pool':
                    handleCallback(this, data);
                    delegateNewlyAvailableWorker(this, n);
                    break;
                case 'error':
                    this.emit('error', data);
                    handleCallback(this, data);
                    delegateNewlyAvailableWorker(this, n);
                    break;
                case 'fatal':
                    this.emit('error', data);
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
        delegateNewWorker(this, n);
        return this;
    }
    removeWorker() {
        if (this.all.length < 1) {
            log.warning('warning => Cannot remove worker from pool of 0 workers.');
        }
        else if (this.all.length === 1 && this.removeNextAvailableWorker) {
            log.warning('warning => Already removed last worker, there will soon' +
                ' be 0 workers in the pool.');
        }
        else {
            const n = this.available.pop();
            if (n) {
                removeSpecificWorker(this, n);
            }
            else {
                this.removeNextAvailableWorker = true;
            }
        }
        return this;
    }
    getCurrentSize() {
        return {
            available: this.available.length,
            all: this.all.length,
            numberOfDeadWorkers: this.numberOfDeadWorkers,
            numberOfSpawnedWorkers: this.numberOfSpawnedWorkers
        };
    }
    getCurrentStats() {
        return this.getCurrentSize();
    }
    noop() {
    }
    any(msg, opts, cb) {
        if (typeof opts === 'function') {
            cb = opts;
            opts = {};
        }
        opts = (opts || {});
        cb = (cb || this.noop);
        if (this.kill) {
            return process.nextTick(cb, new Error('Poolio usage warning: pool.any() called on pool of dead/dying workers => ' +
                'use pool.addWorker() to replenish the pool.'));
        }
        if (this.all.length < 1) {
            this.emit('error', 'warning: you called pool.anyCb() but your worker pool has 0 workers,' +
                'most likely because all have exited => ' +
                'you need to call pool.addWorker() to replenish the pool, or use the {addWorkerOnExit:true} option.');
        }
        const workId = this.jobIdCounter++;
        setImmediate(() => {
            if (this.available.length > 0) {
                const n = this.available.shift();
                if (this.oneTimeOnly) {
                    n.tempId = 'gonna-die';
                    resetDueToDeadWorkers(this);
                }
                if (this.streamStdioAfterDelegation === true) {
                    handleStdio(this, n, opts);
                }
                n.workId = workId;
                n.send({
                    msg,
                    workId,
                    __poolioWorkerId: n.workerId
                });
            }
            else {
                if (this.all.length < 1) {
                    log.warning('Poolio warning: your Poolio pool has been reduced to size of 0 workers, ' +
                        'you will have to add a worker to process new and/or existing messages.');
                }
                this.msgQueue.push({
                    workId,
                    msg
                });
            }
        });
        const d = process.domain;
        this.resolutions[workId] = {
            cb: d ? d.bind(cb) : cb
        };
    }
    anyp(msg, opts) {
        opts = opts || {};
        if (this.kill) {
            return Promise.reject(' => Poolio usage warning: pool.any() called on pool of dead/dying workers => ' +
                'use pool.addWorker() to replenish the pool.');
        }
        if (this.all.length < 1) {
            this.emit('error', 'warning: you called pool.any() but your worker pool has 0 workers ' +
                'most likely because all have exited => ' +
                'you need to call pool.addWorker() to replenish the pool, or use the {addWorkerOnExit:true} option.');
        }
        const workId = this.jobIdCounter++;
        setImmediate(() => {
            if (this.available.length > 0) {
                const n = this.available.shift();
                if (this.oneTimeOnly) {
                    n.tempId = 'gonna-die';
                    resetDueToDeadWorkers(this);
                }
                if (this.streamStdioAfterDelegation === true) {
                    handleStdio(this, n, opts);
                }
                n.workId = workId;
                n.send({
                    msg: msg,
                    workId: workId,
                    __poolioWorkerId: n.workerId
                });
            }
            else {
                if (this.all.length < 1) {
                    log.warning('Poolio warning: your Poolio pool has been reduced to size of 0 workers, ' +
                        'you will have to add a worker to process new and/or existing messages.');
                }
                this.msgQueue.push({
                    workId: workId,
                    msg: msg
                });
            }
        });
        const d = process.domain;
        return new Promise((resolve, reject) => {
            this.resolutions[workId] = {
                resolve: d ? d.bind(resolve) : resolve,
                reject: d ? d.bind(reject) : reject
            };
        });
    }
    destroy() {
        return this;
    }
    killAllActiveWorkers() {
        this.all.slice(0).forEach(n => {
            if (this.available.every(ntemp => ntemp.workerId !== n.workerId)) {
                removeSpecificWorker(this, n);
            }
        });
        return this;
    }
    ;
    killAll() {
        this.kill = true;
        this.available.slice(0).forEach(n => {
            removeSpecificWorker(this, n);
        });
        return this;
    }
    killAllImmediately() {
        this.kill = true;
        this.all.slice(0).forEach(n => {
            removeSpecificWorker(this, n);
        });
        return this;
    }
}
exports.Pool = Pool;
