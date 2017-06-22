"use strict";
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
var EventEmitter = NodeJS.EventEmitter;
var isDebug = process.execArgv.indexOf('debug') > 0;
if (isDebug)
    console.log('Poolio isDebug flag set to:', isDebug);
var assert = require("assert");
var cp = require("child_process");
var path = require("path");
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
    filePath: null,
    addWorkerOnExit: false,
    size: 1,
    silent: false,
    env: process.env,
    execArgv: [],
    args: []
};
var getWritable = function (fnOrStrm) {
    return (typeof fnOrStrm === 'function') ? fnOrStrm() : fnOrStrm;
};
function removeSpecificWorker(pool, n, callKill) {
    if (n) {
        n.tempId = 'gonna-die';
        resetDueToDeadWorkers(pool);
        if (callKill !== false) {
            n.kill();
        }
        pool.emit('worker-removed', n.workerId);
    }
    else {
        console.error(' => Poolio internal error: no worker passed to internal ' +
            'removeSpecificWorker() function.');
    }
}
function resetDueToDeadWorkers(pool) {
    pool.all = pool.all.filter(function (n) { return n.tempId !== 'gonna-die'; });
    pool.available = pool.available.filter(function (n) { return n.tempId !== 'gonna-die'; });
}
function handleCallback(pool, data) {
    var workId = data.workId;
    var cbOrPromise = pool.resolutions[workId];
    delete pool.resolutions[workId];
    if (cbOrPromise) {
        if (data.error) {
            var err = new Error(util.inspect(data.error));
            if (cbOrPromise.cb) {
                cbOrPromise.cb(err);
            }
            else if (cbOrPromise.reject) {
                cbOrPromise.reject(err);
            }
            else {
                console.error('Internal Poolio error => no resolution callback fn available [a].');
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
                console.error('Internal Poolio error => no resolution callback fn available [b].');
            }
        }
    }
    else {
        console.error('Internal Poolio error => this should not happen - but might if' +
            ' a callback is attempted to be called more than once.');
    }
}
function delegateNewlyAvailableWorker(pool, n) {
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
        n.send(msg);
    }
    else {
        pool.available.push(n);
    }
}
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
        _this.execArgv = opts.execArgv;
        _this.args = opts.args;
        assert(opts.filePath, ' => Poolio: user error => you need to provide "filePath" option for Poolio constructor');
        _this.filePath = path.isAbsolute(opts.filePath) ? opts.filePath :
            path.resolve(root + '/' + _this.filePath);
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
        _this.oneTimeOnly = !!opts.oneTimeOnly;
        _this.addWorkerOnExit = !!opts.addWorkerOnExit;
        if ('silent' in opts) {
            assert(typeof opts.silent === 'boolean', 'Poolio init error => "silent" property of options should be a boolean value.');
        }
        _this.silent = opts.silent;
        _this.stdin = opts.stdin;
        _this.stdout = opts.stdout;
        _this.stderr = opts.stderr;
        _this.getSharedWritableStream = opts.getSharedWritableStream;
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
        var execArgv = JSON.parse(JSON.stringify(this.execArgv));
        if (isDebug) {
            execArgv.push('--debug=' + (53034 + id));
        }
        this.args.unshift(this.filePath);
        this.execArgv.forEach(function (arg) {
            _this.args.unshift(arg);
        });
        var n = cp.spawn('node', this.args, {
            detached: false,
            env: Object.assign({}, process.env, this.env || {})
        });
        if (this.silent) {
            if (this.getSharedWritableStream) {
                var strm = getWritable(this.getSharedWritableStream);
                n.stdio[1].pipe(strm);
                n.stdio[2].pipe(strm);
            }
            else {
                if (this.stdout) {
                    n.stdio[1].pipe(getWritable(this.stdout));
                }
                if (this.stderr) {
                    n.stdio[2].pipe(getWritable(this.stderr));
                }
            }
        }
        n.workerId = this.workerIdCounter++;
        n.on('error', function (err) {
            _this.emit('worker-error', err, n.workerId);
        });
        n.once('exit', function (code, signal) {
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
                console.error(' => Poolio warning => message sent from worker with no workId => ', '\n', JSON.stringify(data));
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
        if (this.okToDelegate) {
            if (this.msgQueue.length > 0) {
                n.send(this.msgQueue.shift());
            }
            else {
                this.available.push(n);
            }
        }
        else {
            this.available.push(n);
        }
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
            all: this.all.length
        };
    };
    Pool.prototype.getCurrentStats = function () {
        return this.getCurrentSize();
    };
    Pool.prototype.any = function (msg, cb) {
        var _this = this;
        if (this.kill) {
            console.error('\n', ' => Poolio usage warning: pool.any() called on pool of dead/dying workers => ', '\n', 'use pool.addWorker() to replenish the pool.');
            return;
        }
        if (this.all.length < 1) {
            console.error('\n', ' => Poolio usage warning: you called pool.any() but your worker pool has 0 workers most likely because all have exited => ' +
                'you need to call pool.addWorker() to replenish the pool, or use the {addWorkerOnExit:true} option.');
            return;
        }
        var workId = this.jobIdCounter++;
        setImmediate(function () {
            if (_this.available.length > 0) {
                var n = _this.available.shift();
                if (_this.oneTimeOnly) {
                    n.tempId = 'gonna-die';
                    resetDueToDeadWorkers(_this);
                }
                n.send({
                    msg: msg,
                    workId: workId,
                    __poolioWorkerId: n.workerId
                });
            }
            else {
                if (_this.all.length < 1) {
                    console.log('Poolio warning: your Poolio pool has been reduced to size of 0 workers, you will have to add a worker to process new and/or existing messages.');
                }
                _this.msgQueue.push({
                    workId: workId,
                    msg: msg
                });
            }
        });
        var d = process.domain;
        var self = this;
        if (typeof cb === 'function') {
            self.resolutions[workId] = {
                cb: d ? d.bind(cb) : cb
            };
        }
        else {
            return new Promise(function (resolve, reject) {
                self.resolutions[workId] = {
                    resolve: d ? d.bind(resolve) : resolve,
                    reject: d ? d.bind(reject) : reject
                };
            });
        }
    };
    Pool.prototype.destroy = function () {
        return this;
    };
    Pool.prototype.killAllActiveWorkers = function () {
        var _this = this;
        this.all.forEach(function (n) {
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
        this.available.forEach(function (n) {
            removeSpecificWorker(_this, n);
        });
        return this;
    };
    Pool.prototype.killAllImmediately = function () {
        var _this = this;
        this.kill = true;
        this.all.forEach(function (n) {
            removeSpecificWorker(_this, n);
        });
        return this;
    };
    return Pool;
}(EventEmitter));
exports.Pool = Pool;
var $exports = module.exports;
exports.default = $exports;
