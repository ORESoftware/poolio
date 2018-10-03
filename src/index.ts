'use strict';

// typescript imports
import {ChildProcess} from "child_process";
import {Writable} from "stream";

/////////////////////////////////////////////////////////////////////////

import * as assert from 'assert';
import * as cp from 'child_process';
import * as path from 'path';
import * as EE from 'events';
import * as util from 'util';
import * as fs from 'fs';
import * as chalk from 'chalk';
import * as net from "net";

//////////////////////////////////////////////////////////

const log = {
  info: console.log.bind(console, 'poolio:'),
  good: console.log.bind(console, 'poolio:'),
  veryGood: console.log.bind(console, chalk.green('poolio:')),
  warning: console.error.bind(console, chalk.yellow.bold('poolio warning:')),
  error: console.error.bind(console, chalk.red('poolio error:'))
};

export interface StatsObject {
  available: number,
  all: number,
  numberOfDeadWorkers: number,
  numberOfSpawnedWorkers: number
}

const acceptableConstructorOptions = <any> {
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

//opts
const defaultOpts = <Partial<PoolioOpts>> {
  inheritStdio: true,
  filePath: null,
  addWorkerOnExit: true,
  size: 1,
  silent: false,
  execArgv: [],
  args: []
};

const isDebug = process.execArgv.indexOf('debug') > 0;

if (isDebug) {
  log.info('isDebug flag set to:', isDebug);
}

export interface PoolioOpts {
  filePath: string,   // the path to the start script
  inheritStdio: boolean,  // whether to inheritStdio from all the workers
  addWorkerOnExit: boolean, // if a worker exits, we will automatically add a new worker to replace it
  size: number, // the number of workers in the pool
  env: { [key: string]: string },
  execArgv: Array<string>,
  streamStdioAfterDelegation: boolean,  // only stream stdio to parent after sending first message
  args: Array<string>,
  oneTimeOnly: boolean,  // any spawned workers will not be returned to the pool
  stdin: StreamProvider | Writable;
  stderr: StreamProvider | Writable;
  stdout: StreamProvider | Writable;
  silent: boolean;
  getSharedWritableStream: StreamProvider | Writable;
  resolveWhenWorkerExits: boolean;
  doNotListenForMessagesFromWorkers: boolean;
  oneJobPerWorker: boolean; // if true, we can set n.workId = workId;
}

export interface StreamProvider {
  (): Writable
}

export interface IResolutionCallback {
  (err: any, data?: any): void
}

export interface PoolioChildProcess extends ChildProcess {
  workId: number
  workerId: number
  tempId: string
}

export interface PoolioMsgQueue {
  workId: number,
  msg: string | Object,
  poolioWorkerId?: number
}

export interface PoolioResolution {
  cb?: Function,
  resolve?: Function,
  reject?: Function
}

export interface PoolioResponseMsg {
  workId: number;
  error?: string,
  result: Object
}

export interface PoolioAnyOpts {
  file: string,
  fd: number,
  tty: string,
  socket: net.Socket
}

export interface PoolioMessage {
  message: { value: JSON }
  workId: number,
  poolioWorkerId: number
}

export enum MessageType {
  DONE = 'done',
  ERROR = 'error',
  FATAL = 'fatal',
  RETURN_TO_POOL = 'return/to/pool',
  DONE_AND_RETURN_TO_POOL = 'done/return/to/pool'
}

const getWritable = function (fnOrStrm: Writable | StreamProvider): Writable {
  return (typeof fnOrStrm === 'function') ? fnOrStrm() : fnOrStrm
};

const removeSpecificWorker = function (pool: Pool, n: PoolioChildProcess, callKill?: boolean) {

  n.tempId = 'gonna-die';

  resetDueToDeadWorkers(pool);

  if (callKill !== false) {
    n.kill('SIGINT');
  }

  pool.emit(Pool.events.WorkerRemoved, n.workerId);

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

const handleCallback = function (pool: Pool, data: PoolioResponseMsg) {

  const workId = data.workId;
  const cbOrPromise = pool.resolutions.get(workId);
  const result = data.result || null;

  // callback can't be fired more than once
  pool.resolutions.delete(workId);

  if (!cbOrPromise) {
    // no-op - we deleted it so that the resolution won't be fired more than once
    return;
  }

  if (data.error) {
    const err = new Error(typeof data.error === 'string' ? data.error : util.inspect(data.error));
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

};

const delegateNewWorker = function (pool: Pool, n: PoolioChildProcess): void {

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

enum PoolioEvents {
  WorkerCreated = 'worker-created',
  WorkerRemoved = 'worker-removed',
  WorkerExited = 'worker-exited',
  WorkerError = 'worker-error',
  AllKilled = 'all-killed',
  WorkerAdded = 'worker-added'
}

const handleStdio = (pool: Pool, n: PoolioChildProcess, opts?: Partial<PoolioAnyOpts>) => {

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
    n.stdio[1].pipe(opts.socket);
    n.stdio[2].pipe(opts.socket);
  }

};

const delegateNewlyAvailableWorker = (pool: Pool, n: PoolioChildProcess) => {

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
    return; //note: don't push cp back on available queue
  }

  if (pool.msgQueue.length > 0) {
    const msg = pool.msgQueue.shift();
    msg.poolioWorkerId = n.workerId;
    n.workId = msg.workId;
    n.send(msg);
  }
  else {
    pool.available.push(n);
  }
};

//////////////////////////////////////////////////////

export class Pool extends EE {

  static poolioId = 1;
  static events = PoolioEvents;
  kill: boolean;
  all = [] as Array<PoolioChildProcess>;
  available = [] as Array<PoolioChildProcess>;
  msgQueue = [] as Array<PoolioMsgQueue>;
  resolutions = new Map<number, PoolioResolution>();
  removeNextAvailableWorker: boolean;
  workerIdCounter: number;
  jobIdCounter: number;
  resolveWhenWorkerExits: boolean;
  doNotListenForMessagesFromWorkers: boolean;
  oneJobPerWorker: boolean;
  okToDelegate: boolean;
  poolId: number;
  execArgv: Array<string>;
  args: Array<string>;
  filePath: string;
  size: number;
  inheritStdio: boolean;
  oneTimeOnly: boolean;  // works only receive one message, then they are off
  addWorkerOnExit: boolean;
  stdin: StreamProvider | Writable;
  stderr: StreamProvider | Writable;
  stdout: StreamProvider | Writable;
  numberOfSpawnedWorkers = 0;
  numberOfDeadWorkers = 0;
  streamStdioAfterDelegation: boolean;
  silent: boolean;
  getSharedWritableStream: StreamProvider | Writable;
  env: { [key: string]: string };
  detached: boolean; // allow users to decide whether workers should die when parent dies

  constructor(options: Partial<PoolioOpts>) {

    super();

    this.kill = false;
    this.removeNextAvailableWorker = false;
    this.workerIdCounter = 1; //avoid falsy 0 values, start with 1
    this.jobIdCounter = 1; //avoid falsy 0 values, start with 1
    this.okToDelegate = false;
    this.poolId = Pool.poolioId++;

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

    //do this explicitly instead of using loop, for syntax highlighting
    this.execArgv = opts.execArgv ? opts.execArgv.slice(0) : [];
    this.args = opts.args ? opts.args.slice(0) : [];
    this.inheritStdio = Boolean(opts.inheritStdio);
    this.streamStdioAfterDelegation = Boolean(opts.streamStdioAfterDelegation);

    assert(opts.filePath, 'Poolio: user error => you need to provide "filePath" option for Poolio constructor');
    this.filePath = path.resolve(opts.filePath);

    let isFile = false;
    try {
      isFile = fs.statSync(this.filePath).isFile()
    }
    catch (e) {
      throw new Error('Poolio worker pool constructor error: "filePath" property passed is not a file => ' + this.filePath + '\n' + e.stack);
    }

    assert(isFile, ' => Poolio constructor error: filePath is not a file => ' + this.filePath);

    this.size = opts.size || 1;
    assert(Number.isInteger(this.size),
      'Poolio init error => "size" property of options should be an integer.');

    if ('addWorkerOnExit' in opts) {
      assert.equal(typeof opts.addWorkerOnExit, 'boolean',
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
      assert.equal(typeof opts.silent, 'boolean',
        'Poolio init error => "silent" property of options should be a boolean value.');
    }

    this.env = Object.assign({FORCE_COLOR: 1}, opts.env || {});
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
        if (!err) {
          log.error('missing error object in error evemt listener.');
          err = new Error('Missing error object in error event listener.');
        }
        log.error('your worker pool experienced an error:', (err.stack || err));
        log.error('please add your own "error" event listener using pool.on("error", fn) ' +
          'to prevent these error messages from being logged.');
      }
    });

    for (let i = 0; i < this.size; i++) {
      this.addWorker();
    }

    this.okToDelegate = true;

  }

  addWorker(): this {

    const args = [this.filePath, ...this.args.slice(0)];
    const execArgv = this.execArgv.slice(0);

    if (isDebug) {
      execArgv.push('--debug=' + (53034 + this.poolId)); //http://stackoverflow.com/questions/16840623/how-to-debug-node-js-child-forked-process
    }

    execArgv.forEach((arg) => {
      args.unshift(arg);
    });

    const n = <PoolioChildProcess> cp.spawn('node', args, {
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
      n.stdio[1].pipe(process.stdout);
      n.stdio[2].pipe(process.stderr);
    }
    else {
      // we call this instead of calling nothing, so that the stdio doesn't build up
      // this way the early stdio called in the child process before delegation, gets thrown away
      // instead of corked/saved for later
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
      this.emit(Pool.events.WorkerError, err, n.workerId);
    });

    n.once('exit', (code, signal) => {

      n.removeAllListeners();

      this.numberOfDeadWorkers++;

      const workId = n.workId;
      delete n.workId;

      if (this.resolveWhenWorkerExits) {
        handleCallback(this, {
          workId,
          result: null
        });
      }

      this.emit(Pool.events.WorkerExited, code, signal, n.workerId);
      removeSpecificWorker(this, n, false);

      if (this.addWorkerOnExit) {
        this.addWorker();
      }
      else if (this.all.length < 1) {
        this.kill = false;
        this.emit(Pool.events.AllKilled, true);
      }
    });

    n.on('message', d => {

      if (!d.workId) {
        log.warning('message sent from worker with no workId:', util.inspect(d));
      }

      switch (d.msg) {

        case MessageType.DONE:
          return handleCallback(this, d);

        case MessageType.RETURN_TO_POOL:
          return delegateNewlyAvailableWorker(this, n);

        case MessageType.DONE_AND_RETURN_TO_POOL:
          handleCallback(this, d); //probably want to handle callback first
          return delegateNewlyAvailableWorker(this, n);

        case MessageType.ERROR:
          this.emit('error', d); // TODO: handle this error event
          handleCallback(this, d);
          return delegateNewlyAvailableWorker(this, n);

        case MessageType.FATAL:
          this.emit('error', d); // TODO: handle this error event
          handleCallback(this, d);
          return removeSpecificWorker(this, n);

        default:
          const err = new Error('Poolio warning: your Poolio worker sent a message that ' +
            'was not recognized by the Poolio library =>' + util.inspect(d));
          this.emit('error', err);
      }
    });

    this.all.push(n);
    this.emit(Pool.events.WorkerCreated, n.workerId);
    this.emit(Pool.events.WorkerAdded, n.workerId);

    delegateNewWorker(this, n);
    return this;
  }

  removeWorker(): this {

    if (this.all.length < 1) {
      log.warning('cannot remove worker from pool of 0 workers.');
    }
    else if (this.all.length === 1 && this.removeNextAvailableWorker) {
      log.warning('already removed last worker, there will soon be 0 workers in the pool.');
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

  getCurrentSize(): StatsObject {
    return {
      available: this.available.length,
      all: this.all.length,
      numberOfDeadWorkers: this.numberOfDeadWorkers,
      numberOfSpawnedWorkers: this.numberOfSpawnedWorkers
    }
  }

  getCurrentStats(): StatsObject {
    return this.getCurrentSize()
  }

  noop() {

  }

  any(msg: object | string, opts?: Partial<PoolioAnyOpts> | IResolutionCallback, cb?: IResolutionCallback): void {

    if (typeof opts === 'function') {
      cb = opts;
      opts = {} as Partial<PoolioAnyOpts>;
    }

    opts = (opts || {}) as Partial<PoolioAnyOpts>;
    cb = (cb || this.noop) as IResolutionCallback;

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

    const d = process.domain;
    this.resolutions.set(workId, {
      cb: d ? d.bind(cb) : cb
    });

    if (this.available.length > 0) {

      const n = this.available.shift();

      if (this.oneTimeOnly) {
        n.tempId = 'gonna-die';
        resetDueToDeadWorkers(this);
      }

      if (this.streamStdioAfterDelegation === true) {
        handleStdio(this, n, opts  as Partial<PoolioAnyOpts>);
      }

      n.workId = workId;

      n.send({
        msg,
        workId,
        poolioWorkerId: n.workerId
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

  }

  anyp(msg: object | string, opts?: Partial<PoolioAnyOpts>): Promise<PoolioResponseMsg> {

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

    return new Promise((resolve, reject) => {

      const d = process.domain;

      this.resolutions.set(workId, {
        resolve: d ? d.bind(resolve as any) : resolve,
        reject: d ? d.bind(reject) : reject
      });

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
          poolioWorkerId: n.workerId
        });

      } else {

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

  }

  destroy(): this {

    // killall and remove all listeners
    return this;
  }

  killAllActiveWorkers(): this {

    this.all.slice(0).forEach(n => {
      // if child process is not in the available list, we should kill it
      if (this.available.every(ntemp => ntemp.workerId !== n.workerId)) {
        removeSpecificWorker(this, n);
      }
    });

    return this;
  };

  killAll(): this {

    this.kill = true;
    this.available.slice(0).forEach(n => {
      removeSpecificWorker(this, n);
    });
    return this;
  }

  killAllImmediately(): this {

    this.kill = true;
    this.all.slice(0).forEach(n => {
      removeSpecificWorker(this, n);
    });

    return this;
  }

}

export default Pool;

export const r2gSmokeTest = function () {
  return true;
};

export type PoolioResult = { type: MessageType, result: any };
export type MessageRegisterCallback = (err: any, v?: PoolioResult) => void;
export type MessageRegisterHandler = (m: PoolioMessage, cb: MessageRegisterCallback) => void;

export const registerMessageHandler = (cb: MessageRegisterHandler) => {

  process.on('message', m => {

    const workId = m.workId;
    const v = JSON.parse(m.message);
    let callable = true;

    cb(v.value, (err, result) => {

      if (!callable) {
        log.error('callback called more than once.');
        return;
      }

      callable = false;

      process.send({
        error: err || null,
        result: result || null,
        workId,
        type: (result && result.type) || MessageType.DONE_AND_RETURN_TO_POOL
      });

    });

  });

};
