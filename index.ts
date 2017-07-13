'use strict';

// typescript imports
import EventEmitter = NodeJS.EventEmitter;
import {ChildProcess} from "child_process";
import {Writable} from "stream";

const isDebug = process.execArgv.indexOf('debug') > 0;
if (isDebug) console.log('Poolio isDebug flag set to:', isDebug);

/////////////////////////////////////////////////////////////////////////

import * as assert from 'assert';
import * as cp from 'child_process';
import * as path from 'path';
import * as EE from 'events';
import * as util from 'util';
import * as fs from 'fs';
import * as chalk from 'chalk';
import * as residence from 'residence';
import * as net from "net";

//////////////////////////////////////////////////////////

const root = residence.findProjectRoot(process.cwd());

const name = ' => [poolio] =>';
const log = console.log.bind(console, name);
const logGood = console.log.bind(console, chalk.cyan(name));
const logVeryGood = console.log.bind(console, chalk.green(name));
const logWarning = console.error.bind(console, chalk.yellow.bold(name));
const logError = console.error.bind(console, chalk.red(name));

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

let id = 1; //avoid falsy 0 values, just start with 1

//opts
const defaultOpts = <IPoolOptionsPartial> {

  inheritStdio: true,
  filePath: null,
  addWorkerOnExit: true,
  size: 1,
  silent: false,
  execArgv: [],
  args: []

};

///////////////////////////////////////////////////////

export interface IPoolOptions {
  filePath: string,   // the path to the start script
  inheritStdio: boolean,  // whether to inheritStdio from all the workers
  addWorkerOnExit: boolean, // if a worker exits, we will automatically add a new worker to replace it
  size: number, // the number of workers in the pool
  env: Object,
  execArgv: Array<string>,
  streamStdioAfterDelegation: boolean,  // only stream stdio to parent after sending first message
  args: Array<string>,
  oneTimeOnly: boolean,  // any spawned workers will not be returned to the pool
  stdin: IStreamFunction | Writable;
  stderr: IStreamFunction | Writable;
  stdout: IStreamFunction | Writable;
  silent: boolean;
  getSharedWritableStream: IStreamFunction | Writable;
  resolveWhenWorkerExits: boolean;
  doNotListenForMessagesFromWorkers: boolean;
  oneJobPerWorker: boolean; // if true, we can set n.workId = workId;
}

export type IPoolOptionsPartial = Partial<IPoolOptions>;

export interface IPoolResolutions {
  [key: string]: IPoolResolution
}

export interface IStreamFunction {
  (): Writable
}

export interface IResolutionCallback {
  (err: Error | string, data?: Object): void
}

export interface IPoolioChildProcess extends ChildProcess {
  workerId: number;
  tempId: string
}

export interface IPoolMsgQueue {
  workId: number,
  msg: string | Object,
  __poolioWorkerId?: number
}

export interface IPoolResolution {
  cb?: Function,
  resolve?: Function,
  reject?: Function
}

export interface IPoolioResponseMsg {
  workId: number;
  error?: string,
  result: Object
}

export interface IPoolioAnyOpts {
  file: string,
  fd: number,
  tty: string,
  socket: net.Socket
}

/////////////////// private helper functions  ////////////////////

const getWritable = function (fnOrStrm: Writable | IStreamFunction): Writable {
  return (typeof fnOrStrm === 'function') ? fnOrStrm() : fnOrStrm
};

const removeSpecificWorker = function (pool: Pool, n: IPoolioChildProcess, callKill?: boolean) {

  n.tempId = 'gonna-die';
  resetDueToDeadWorkers(pool);
  if (callKill !== false) {
    n.kill('SIGINT');
  }
  pool.emit('worker-removed', n.workerId);

};

const resetDueToDeadWorkers = function (pool: Pool): void {

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

const handleCallback = function (pool: Pool, data: IPoolioResponseMsg) {

  const workId = data.workId;
  const cbOrPromise = pool.resolutions[workId];
  const result = data.result || null;

  // callback can't be fired more than once
  delete pool.resolutions[workId];

  if (cbOrPromise) {
    if (data.error) {
      const err = new Error(util.inspect(data.error));
      if (cbOrPromise.cb) {
        cbOrPromise.cb(err, result);
      } else if (cbOrPromise.reject) {
        cbOrPromise.reject(err)
      } else {
        throw 'Internal Poolio error => no resolution callback fn available [a], please report on Github.';
      }
    } else {
      if (cbOrPromise.cb) {
        cbOrPromise.cb(null, result);
      } else if (cbOrPromise.resolve) {
        cbOrPromise.resolve(result);
      } else {
        throw 'Internal Poolio error => no resolution callback fn available [b], please report on Github.';
      }
    }
  }
  else {
    // no-op - we deleted it so that the resolution won't be fired more than once
  }
};

const delegateNewWorker = function (pool: Pool, n: IPoolioChildProcess): void {

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

const handleStdio = function (pool: Pool, n: IPoolioChildProcess, opts?: Partial<IPoolioAnyOpts>) {

  opts = opts || {};

  if (pool.getSharedWritableStream) {
    //we pipe stdout and stderr to the same stream
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
    let strm = fs.createWriteStream(null, {fd});
    n.stdio[1].pipe(strm);
    n.stdio[2].pipe(strm);
  }

  if (opts.file) {
    let strm = fs.createWriteStream(opts.file);
    n.stdio[1].pipe(strm);
    n.stdio[2].pipe(strm);
  }

  if (opts.fd) {
    let strm = fs.createWriteStream(null, {fd: opts.fd});
    n.stdio[1].pipe(strm);
    n.stdio[2].pipe(strm);
  }

  if (opts.socket) {
    console.log('streaming data to socket.');
    n.stdio[1].pipe(opts.socket);
    n.stdio[2].pipe(opts.socket);
  }

};

const delegateNewlyAvailableWorker = function (pool: Pool, n: IPoolioChildProcess) {

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
    return; //note: don't push cp back on available queue
  }

  if (pool.msgQueue.length > 0) {
    const msg = pool.msgQueue.shift();
    msg.__poolioWorkerId = n.workerId;
    n.workId = msg.workId;
    n.send(msg);
  } else {
    pool.available.push(n);
  }
};

//////////////////////////////////////////////////////

export class Pool extends EE {

  kill: boolean;
  all: Array<IPoolioChildProcess>;
  available: Array<IPoolioChildProcess>;
  msgQueue: Array<IPoolMsgQueue>;
  resolutions: IPoolResolutions;
  removeNextAvailableWorker: boolean;
  workerIdCounter: number;
  jobIdCounter: number;
  resolveWhenWorkerExits: boolean;
  doNotListenForMessagesFromWorkers: boolean;
  oneJobPerWorker: boolean;
  okToDelegate: boolean;
  __poolId: string;
  execArgv: Array<string>;
  args: Array<string>;
  filePath: string;
  size: number;
  inheritStdio: boolean;
  oneTimeOnly: boolean;  // works only receive one message, then they are off
  addWorkerOnExit: boolean;
  stdin: IStreamFunction | Writable;
  stderr: IStreamFunction | Writable;
  stdout: IStreamFunction | Writable;
  numberOfSpawnedWorkers: number;
  numberOfDeadWorkers: number;
  streamStdioAfterDelegation: boolean;
  silent: boolean;
  getSharedWritableStream: IStreamFunction | Writable;
  env: Object;
  detached: boolean; // allow users to decide whether workers should die when parent dies

  constructor(options: IPoolOptionsPartial) {

    super();

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
    this.numberOfSpawnedWorkers = 0;
    this.numberOfDeadWorkers = 0;

    debugger;

    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('Options object should be defined for your poolio pool, as "filePath" option property is required.');
    }

    Object.keys(options).forEach(function (key) {
      if (acceptableConstructorOptions.indexOf(key) < 0) {
        console.error(' => Poolio message => the following option property is not a valid Poolio constructor option:', key);
      }
    });

    const opts = Object.assign({}, defaultOpts, options);
    assert(Number.isInteger(opts.size) && opts.size > 0, 'Poolio pool size must an integer greater than 0.');

    //do this explicitly instead of using loop, for syntax highlighting
    this.execArgv = opts.execArgv ? opts.execArgv.slice(0) : [];
    this.args = opts.args ? opts.args.slice(0) : [];
    this.inheritStdio = Boolean(opts.inheritStdio);
    this.streamStdioAfterDelegation = Boolean(opts.streamStdioAfterDelegation);

    assert(opts.filePath, ' => Poolio: user error => you need to provide "filePath" option for Poolio constructor');

    this.filePath = path.isAbsolute(opts.filePath) ? opts.filePath : path.resolve(root + '/' + this.filePath);

    let isFile = false;
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

    this.oneTimeOnly = Boolean(opts.oneTimeOnly);

    if (this.oneTimeOnly) {
      // if oneTimeOnly is true, addWorkerOnExit defaults to true
      this.addWorkerOnExit = opts.addWorkerOnExit !== false;
    }
    else {
      this.addWorkerOnExit = Boolean(opts.addWorkerOnExit);
    }

    if ('silent' in opts) {
      assert(typeof opts.silent === 'boolean',
        'Poolio init error => "silent" property of options should be a boolean value.');
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
        console.error(' => Poolio: your worker pool experienced an error => ', (err.stack || err));
        console.error(' => Poolio => please add your own "error" event listener using pool.on("error", fn) ' +
          'to prevent these error messages from being logged.');
      }
    });

    for (let i = 0; i < this.size; i++) {
      this.addWorker();
    }

    this.okToDelegate = true;

  }

  addWorker(): Pool {

    const args = this.args.slice(0);
    args.unshift(this.filePath);
    const execArgv = this.execArgv.slice(0);

    if (isDebug) {
      execArgv.push('--debug=' + (53034 + id)); //http://stackoverflow.com/questions/16840623/how-to-debug-node-js-child-forked-process
    }

    execArgv.forEach((arg) => {
      args.unshift(arg);
    });

    const n = <IPoolioChildProcess> cp.spawn('node', args, {
      detached: false,
      env: Object.assign({}, this.env),
      stdio: [
        'ignore',
        this.silent ? 'ignore' : 'pipe',
        this.silent ? 'ignore' : 'pipe',
        'ipc'  //TODO: assume 'ipc' is ignored if not a .js file..
      ],
    });

    if (this.inheritStdio) {
      console.log('we are sending stdio to /dev/null.');
      n.stdio[1].pipe(process.stdout);
      n.stdio[2].pipe(process.stderr);
    }
    else {
      console.log('we are sending stdio to /dev/null.');
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
        logWarning('message sent from worker with no workId => ', '\n', JSON.stringify(data));
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

    delegateNewWorker(this, n);
    return this;
  }

  removeWorker(): Pool {

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
      } else {
        this.removeNextAvailableWorker = true;
      }
    }

    return this;
  }

  getCurrentSize(): Object {
    return {
      available: this.available.length,
      all: this.all.length,
      numberOfDeadWorkers: this.numberOfDeadWorkers,
      numberOfSpawnedWorkers: this.numberOfSpawnedWorkers
    }
  }

  getCurrentStats(): Object {
    return this.getCurrentSize()
  }

  anyCB(msg: Object | string, opts?: Partial<IPoolioAnyOpts>, cb?: IResolutionCallback): void {

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

      } else {

        if (this.all.length < 1) {
          logWarning('Poolio warning: your Poolio pool has been reduced to size of 0 workers, ' +
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

  any(msg: Object | string, opts?: Partial<IPoolioAnyOpts>): Promise<IPoolioResponseMsg> {

    opts = opts || {};

    if (this.kill) {
      return Promise.reject(' => Poolio usage warning: pool.any() called on pool of dead/dying workers => ' +
        'use pool.addWorker() to replenish the pool.')
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

      } else {

        if (this.all.length < 1) {
          logWarning('Poolio warning: your Poolio pool has been reduced to size of 0 workers, ' +
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

  destroy(): Pool {

    // killall and remove all listeners
    return this;
  }

  killAllActiveWorkers(): Pool {

    this.all.slice(0).forEach(n => {
      // if child process is not in the available list, we should kill it
      if (this.available.every(ntemp => ntemp.workerId !== n.workerId)) {
        removeSpecificWorker(this, n);
      }
    });

    return this;
  };

  killAll(): Pool {

    this.kill = true;
    this.available.slice(0).forEach(n => {
      removeSpecificWorker(this, n);
    });
    return this;
  }

  killAllImmediately(): Pool {

    this.kill = true;
    this.all.slice(0).forEach(n => {
      removeSpecificWorker(this, n);
    });

    return this;
  }

}

const $exports = module.exports;
export default $exports;
