'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var isDebug = process.execArgv.indexOf('debug') > 0;
if (isDebug)
    console.log('Poolio isDebug flag set to:', isDebug);
var assert = require("assert");
var cp = require("child_process");
var path = require("path");
var EE = require("events");
var util = require("util");
var fs = require("fs");
var chalk = require("chalk");
var residence = require("residence");
var root = residence.findProjectRoot(process.cwd());
var name = ' => [poolio] =>';
var log = console.log.bind(console, name);
var logGood = console.log.bind(console, chalk.cyan(name));
var logVeryGood = console.log.bind(console, chalk.green(name));
var logWarning = console.error.bind(console, chalk.yellow.bold(name));
var logError = console.error.bind(console, chalk.red(name));
var acceptableConstructorOptions = [
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
var id = 1;
var defaultOpts = {
    inheritStdio: true,
    filePath: null,
    addWorkerOnExit: true,
    size: 1,
    silent: false,
    execArgv: [],
    args: []
};
var getWritable = function (fnOrStrm) {
    return (typeof fnOrStrm === 'function') ? fnOrStrm() : fnOrStrm;
};
var removeSpecificWorker = function (pool, n, callKill) {
    n.tempId = 'gonna-die';
    resetDueToDeadWorkers(pool);
    if (callKill !== false) {
        n.kill('SIGINT');
    }
    pool.emit('worker-removed', n.workerId);
};
var resetDueToDeadWorkers = function (pool) {
    var all = pool.all.filter(function (n) { return n.tempId !== 'gonna-die'; });
    var available = pool.available.filter(function (n) { return n.tempId !== 'gonna-die'; });
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
var handleCallback = function (pool, data) {
    var workId = data.workId;
    var cbOrPromise = pool.resolutions[workId];
    var result = data.result || null;
    delete pool.resolutions[workId];
    if (cbOrPromise) {
        if (data.error) {
            var err = new Error(util.inspect(data.error));
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
var delegateNewWorker = function (pool, n) {
    if (pool.okToDelegate) {
        if (pool.msgQueue.length > 0) {
            handleStdio(this, n);
            var msg = this.msgQueue.shift();
            n.workId = msg.workId;
            n.send(msg);
            return;
        }
    }
    pool.available.push(n);
};
var handleStdio = function (pool, n, opts) {
    opts = opts || {};
    if (pool.getSharedWritableStream) {
        var strm = getWritable(pool.getSharedWritableStream);
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
        var fd = fs.openSync(opts.tty, 'r+');
        var strm = fs.createWriteStream(null, { fd: fd });
        n.stdio[1].pipe(strm);
        n.stdio[2].pipe(strm);
    }
    if (opts.file) {
        var strm = fs.createWriteStream(opts.file);
        n.stdio[1].pipe(strm);
        n.stdio[2].pipe(strm);
    }
    if (opts.fd) {
        var strm = fs.createWriteStream(null, { fd: opts.fd });
        n.stdio[1].pipe(strm);
        n.stdio[2].pipe(strm);
    }
    if (opts.socket) {
        console.log('streaming data to socket.');
        n.stdio[1].pipe(opts.socket);
        n.stdio[2].pipe(opts.socket);
    }
};
var delegateNewlyAvailableWorker = function (pool, n) {
    if (pool.kill) {
        removeSpecificWorker(pool, n);
        return;
    }
    if (pool.oneTimeOnly) {
        removeSpecificWorker(pool, n);
        console.error(' => Poolio warning => delegateNewlyAvailableWorker() was called on a worker that should have been "oneTimeOnly".');
        return;
    }
    if (pool.removeNextAvailableWorker) {
        pool.removeNextAvailableWorker = false;
        removeSpecificWorker(pool, n);
        return;
    }
    if (pool.msgQueue.length > 0) {
        var msg = pool.msgQueue.shift();
        msg.__poolioWorkerId = n.workerId;
        n.workId = msg.workId;
        n.send(msg);
    }
    else {
        pool.available.push(n);
    }
};
var Pool = (function (_super) {
    __extends(Pool, _super);
    function Pool(options) {
        var _this = _super.call(this) || this;
        _this.kill = false;
        _this.all = [];
        _this.available = [];
        _this.msgQueue = [];
        _this.resolutions = {};
        _this.removeNextAvailableWorker = false;
        _this.workerIdCounter = 1;
        _this.jobIdCounter = 1;
        _this.okToDelegate = false;
        _this.__poolId = '@poolio_pool_' + id++;
        _this.numberOfSpawnedWorkers = 0;
        _this.numberOfDeadWorkers = 0;
        debugger;
        if (typeof options !== 'object' || Array.isArray(options)) {
            throw new Error('Options object should be defined for your poolio pool, as "filePath" option property is required.');
        }
        Object.keys(options).forEach(function (key) {
            if (acceptableConstructorOptions.indexOf(key) < 0) {
                console.error(' => Poolio message => the following option property is not a valid Poolio constructor option:', key);
            }
        });
        var opts = Object.assign({}, defaultOpts, options);
        assert(Number.isInteger(opts.size) && opts.size > 0, 'Poolio pool size must an integer greater than 0.');
        _this.execArgv = opts.execArgv ? opts.execArgv.slice(0) : [];
        _this.args = opts.args ? opts.args.slice(0) : [];
        _this.inheritStdio = Boolean(opts.inheritStdio);
        _this.streamStdioAfterDelegation = Boolean(opts.streamStdioAfterDelegation);
        assert(opts.filePath, ' => Poolio: user error => you need to provide "filePath" option for Poolio constructor');
        _this.filePath = path.isAbsolute(opts.filePath) ? opts.filePath : path.resolve(root + '/' + _this.filePath);
        var isFile = false;
        try {
            isFile = fs.statSync(_this.filePath).isFile();
        }
        catch (e) {
            throw new Error('=> Poolio worker pool constructor error: "filePath" property passed is not a file => ' + _this.filePath + '\n' + e.stack);
        }
        assert(isFile, ' => Poolio constructor error: filePath is not a file => ' + _this.filePath);
        if ('size' in opts) {
            assert(Number.isInteger(opts.size), 'Poolio init error => "size" property of options should be an integer.');
        }
        _this.size = opts.size;
        if ('addWorkerOnExit' in opts) {
            assert(typeof opts.addWorkerOnExit === 'boolean', 'Poolio init error => "addWorkerOnExit" property of options should be a boolean value.');
        }
        _this.oneTimeOnly = Boolean(opts.oneTimeOnly);
        if (_this.oneTimeOnly) {
            _this.addWorkerOnExit = opts.addWorkerOnExit !== false;
        }
        else {
            _this.addWorkerOnExit = Boolean(opts.addWorkerOnExit);
        }
        if ('silent' in opts) {
            assert(typeof opts.silent === 'boolean', 'Poolio init error => "silent" property of options should be a boolean value.');
        }
        _this.env = Object.assign({}, opts.env || {});
        _this.silent = opts.silent;
        _this.stdin = opts.stdin;
        _this.stdout = opts.stdout;
        _this.stderr = opts.stderr;
        _this.getSharedWritableStream = opts.getSharedWritableStream;
        _this.resolveWhenWorkerExits = opts.resolveWhenWorkerExits;
        _this.doNotListenForMessagesFromWorkers = opts.doNotListenForMessagesFromWorkers;
        _this.oneJobPerWorker = opts.oneJobPerWorker;
        _this.on('error', function (err) {
            if (_this.listenerCount('error') === 1) {
                console.error(' => Poolio: your worker pool experienced an error => ', (err.stack || err));
                console.error(' => Poolio => please add your own "error" event listener using pool.on("error", fn) ' +
                    'to prevent these error messages from being logged.');
            }
        });
        for (var i = 0; i < _this.size; i++) {
            _this.addWorker();
        }
        _this.okToDelegate = true;
        return _this;
    }
    Pool.prototype.addWorker = function () {
        var _this = this;
        var args = this.args.slice(0);
        args.unshift(this.filePath);
        var execArgv = this.execArgv.slice(0);
        if (isDebug) {
            execArgv.push('--debug=' + (53034 + id));
        }
        execArgv.forEach(function (arg) {
            args.unshift(arg);
        });
        var n = cp.spawn('node', args, {
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
            var strm = fs.createWriteStream('/dev/null');
            n.stdio[1].pipe(strm);
            n.stdio[2].pipe(strm);
        }
        if (n.stdio && this.streamStdioAfterDelegation === false) {
            handleStdio(this, n);
        }
        this.numberOfSpawnedWorkers++;
        n.workerId = this.workerIdCounter++;
        n.on('error', function (err) {
            _this.emit('worker-error', err, n.workerId);
        });
        n.once('exit', function (code, signal) {
            _this.numberOfDeadWorkers++;
            var workId = n.workId;
            delete n.workId;
            if (_this.resolveWhenWorkerExits) {
                handleCallback(_this, {
                    workId: workId,
                    result: null
                });
            }
            n.removeAllListeners();
            _this.emit('worker-exited', code, signal, n.workerId);
            removeSpecificWorker(_this, n, false);
            if (_this.addWorkerOnExit) {
                _this.addWorker();
            }
            else {
                if (_this.all.length < 1) {
                    _this.kill = false;
                    _this.emit('all-killed', null);
                }
            }
        });
        n.on('message', function (data) {
            if (!data.workId) {
                logWarning('message sent from worker with no workId => ', '\n', JSON.stringify(data));
            }
            switch (data.msg) {
                case 'done':
                    handleCallback(_this, data);
                    break;
                case 'return/to/pool':
                    delegateNewlyAvailableWorker(_this, n);
                    break;
                case 'done/return/to/pool':
                    handleCallback(_this, data);
                    delegateNewlyAvailableWorker(_this, n);
                    break;
                case 'error':
                    _this.emit('error', data);
                    handleCallback(_this, data);
                    delegateNewlyAvailableWorker(_this, n);
                    break;
                case 'fatal':
                    _this.emit('error', data);
                    handleCallback(_this, data);
                    removeSpecificWorker(_this, n);
                    break;
                default:
                    var err = new Error('Poolio warning: your Poolio worker sent a message that ' +
                        'was not recognized by the Poolio library =>' + '\n' + util.inspect(data));
                    _this.emit('error', err);
            }
        });
        this.all.push(n);
        this.emit('worker-created', n.workerId);
        this.emit('worker-added', n.workerId);
        delegateNewWorker(this, n);
        return this;
    };
    Pool.prototype.removeWorker = function () {
        if (this.all.length < 1) {
            console.error(' => Poolio warning => Cannot remove worker from pool of 0 workers.');
        }
        else if (this.all.length === 1 && this.removeNextAvailableWorker) {
            console.error(' => Poolio warning => Already removed last worker, there will soon' +
                ' be 0 workers in the pool.');
        }
        else {
            var n = this.available.pop();
            if (n) {
                removeSpecificWorker(this, n);
            }
            else {
                this.removeNextAvailableWorker = true;
            }
        }
        return this;
    };
    Pool.prototype.getCurrentSize = function () {
        return {
            available: this.available.length,
            all: this.all.length,
            numberOfDeadWorkers: this.numberOfDeadWorkers,
            numberOfSpawnedWorkers: this.numberOfSpawnedWorkers
        };
    };
    Pool.prototype.getCurrentStats = function () {
        return this.getCurrentSize();
    };
    Pool.prototype.anyCB = function (msg, opts, cb) {
        var _this = this;
        if (typeof opts === 'function') {
            cb = opts;
            opts = {};
        }
        opts = opts || {};
        if (this.kill) {
            return cb(new Error(' => Poolio usage warning: pool.any() called on pool of dead/dying workers => ' +
                'use pool.addWorker() to replenish the pool.'));
        }
        if (this.all.length < 1) {
            this.emit('error', 'warning: you called pool.any() but your worker pool has 0 workers,' +
                'most likely because all have exited => ' +
                'you need to call pool.addWorker() to replenish the pool, or use the {addWorkerOnExit:true} option.');
        }
        var workId = this.jobIdCounter++;
        setImmediate(function () {
            if (_this.available.length > 0) {
                var n = _this.available.shift();
                if (_this.oneTimeOnly) {
                    n.tempId = 'gonna-die';
                    resetDueToDeadWorkers(_this);
                }
                if (_this.streamStdioAfterDelegation === true) {
                    handleStdio(_this, n, opts);
                }
                n.workId = workId;
                n.send({
                    msg: msg,
                    workId: workId,
                    __poolioWorkerId: n.workerId
                });
            }
            else {
                if (_this.all.length < 1) {
                    logWarning('Poolio warning: your Poolio pool has been reduced to size of 0 workers, ' +
                        'you will have to add a worker to process new and/or existing messages.');
                }
                _this.msgQueue.push({
                    workId: workId,
                    msg: msg
                });
            }
        });
        var d = process.domain;
        this.resolutions[workId] = {
            cb: d ? d.bind(cb) : cb
        };
    };
    Pool.prototype.any = function (msg, opts) {
        var _this = this;
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
        var workId = this.jobIdCounter++;
        setImmediate(function () {
            if (_this.available.length > 0) {
                var n = _this.available.shift();
                if (_this.oneTimeOnly) {
                    n.tempId = 'gonna-die';
                    resetDueToDeadWorkers(_this);
                }
                if (_this.streamStdioAfterDelegation === true) {
                    handleStdio(_this, n, opts);
                }
                n.workId = workId;
                n.send({
                    msg: msg,
                    workId: workId,
                    __poolioWorkerId: n.workerId
                });
            }
            else {
                if (_this.all.length < 1) {
                    logWarning('Poolio warning: your Poolio pool has been reduced to size of 0 workers, ' +
                        'you will have to add a worker to process new and/or existing messages.');
                }
                _this.msgQueue.push({
                    workId: workId,
                    msg: msg
                });
            }
        });
        var d = process.domain;
        return new Promise(function (resolve, reject) {
            _this.resolutions[workId] = {
                resolve: d ? d.bind(resolve) : resolve,
                reject: d ? d.bind(reject) : reject
            };
        });
    };
    Pool.prototype.destroy = function () {
        return this;
    };
    Pool.prototype.killAllActiveWorkers = function () {
        var _this = this;
        this.all.slice(0).forEach(function (n) {
            if (_this.available.every(function (ntemp) { return ntemp.workerId !== n.workerId; })) {
                removeSpecificWorker(_this, n);
            }
        });
        return this;
    };
    ;
    Pool.prototype.killAll = function () {
        var _this = this;
        this.kill = true;
        this.available.slice(0).forEach(function (n) {
            removeSpecificWorker(_this, n);
        });
        return this;
    };
    Pool.prototype.killAllImmediately = function () {
        var _this = this;
        this.kill = true;
        this.all.slice(0).forEach(function (n) {
            removeSpecificWorker(_this, n);
        });
        return this;
    };
    return Pool;
}(EE));
exports.Pool = Pool;
var $exports = module.exports;
exports.default = $exports;
