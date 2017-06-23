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
const defaultOpts = {

  inheritStdio: true,
  filePath: null,
  addWorkerOnExit: false,
  size: 1,
  silent: false,
  env: process.env,
  execArgv: [],
  args: []

} as IPoolOptionsPartial;

///////////////////////////////////////////////////////

export interface IPoolOptions {
  filePath: string,
  inheritStdio: boolean,
  addWorkerOnExit: boolean,
  size: number,
  env: Object,
  execArgv: Array<string>,
  args: Array<string>,
  oneTimeOnly: boolean,
  stdin: IStreamFunction | Writable;
  stderr: IStreamFunction | Writable;
  stdout: IStreamFunction | Writable;
  silent: boolean;
  getSharedWritableStream: IStreamFunction | Writable;
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
  console.log('worker removed.');
  pool.emit('worker-removed', n.workerId);

};

const resetDueToDeadWorkers = function (pool: Pool) {
  pool.all = pool.all.filter(n => n.tempId !== 'gonna-die');
  pool.available = pool.available.filter(n => n.tempId !== 'gonna-die');
};

const handleCallback = function (pool: Pool, data: IPoolioResponseMsg) {

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
    this.execArgv = opts.execArgv;
    this.args = opts.args;
    this.inheritStdio = opts.inheritStdio;

    assert(opts.filePath, ' => Poolio: user error => you need to provide "filePath" option for Poolio constructor');

    this.filePath = path.isAbsolute(opts.filePath) ? opts.filePath :
      path.resolve(root + '/' + this.filePath);

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
    this.getSharedWritableStream = opts.getSharedWritableStream;

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

    const execArgv = JSON.parse(JSON.stringify(this.execArgv)); //copy execArgv

    if (isDebug) {
      execArgv.push('--debug=' + (53034 + id)); //http://stackoverflow.com/questions/16840623/how-to-debug-node-js-child-forked-process
    }

    console.log('worker added.');

    this.args.unshift(this.filePath);

    this.execArgv.forEach((arg) => {
      this.args.unshift(arg);
    });

    const n = <IPoolioChildProcess> cp.spawn('node', this.args, {
      detached: false,
      env: Object.assign({}, process.env, this.env || {}),
      stdio: [
        'ignore',
        (this.silent ? 'ignore' : 'pipe'),
        (this.silent ? 'ignore' : 'pipe'),
        'ipc'  //TODO: assume 'ipc' is ignored if not a .js file..
      ],
    });

    if (n.stdio) {

      if (this.getSharedWritableStream) {
        //we pipe stdout and stderr to the same stream
        const strm = getWritable(this.getSharedWritableStream);
        n.stdio[1].pipe(strm);
        n.stdio[2].pipe(strm);
      }
      else {
        if (this.stdout) {
          n.stdio[1].pipe(getWritable(this.stdout)); // fs.createWriteStream(p1)
        }
        if (this.stderr) {
          n.stdio[2].pipe(getWritable(this.stderr));
        }
      }

      if (this.inheritStdio) {
        n.stdio[1].pipe(process.stdout);
        n.stdio[2].pipe(process.stderr);
      }
    }

    n.workerId = this.workerIdCounter++;

    n.on('error', err => {
      this.emit('worker-error', err, n.workerId);
    });

    n.once('exit', (code, signal) => {

      console.log('worker exitted with code => ', code);

      setImmediate(() => {
        console.log(' => pool stats', this.getCurrentSize());
      });

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
      all: this.all.length
    }
  }

  getCurrentStats(): Object {
    return this.getCurrentSize()
  }

  anyCB(msg: Object | string, cb: IResolutionCallback): void {

    if (this.kill) {
      return cb(new Error(' => Poolio usage warning: pool.any() called on pool of dead/dying workers => ' +
        'use pool.addWorker() to replenish the pool.'));
    }

    if (this.all.length < 1) {
      return cb(new Error(' => Poolio usage warning: you called pool.any() but your worker pool has 0 workers,' +
        'most likely because all have exited => ' +
        'you need to call pool.addWorker() to replenish the pool, or use the {addWorkerOnExit:true} option.'));
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
    this.resolutions[workId] = {
      cb: d ? d.bind(cb) : cb
    };
  }

  any(msg: Object | string): Promise<IPoolioResponseMsg> {

    if (this.kill) {
      return Promise.reject(' => Poolio usage warning: pool.any() called on pool of dead/dying workers => use pool.addWorker() to replenish the pool.')
    }

    if (this.all.length < 1) {
      return Promise.reject(' => Poolio usage warning: you called pool.any() but your worker pool has 0 workers most likely because all have exited => ' +
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

    this.all.forEach(n => {
      // if child process is not in the available list, we should kill it
      if (this.available.every(ntemp => ntemp.workerId !== n.workerId)) {
        removeSpecificWorker(this, n);
      }
    });

    return this;
  };

  killAll(): Pool {

    this.kill = true;
    this.available.forEach(n => {
      removeSpecificWorker(this, n);
    });
    return this;
  }

  killAllImmediately(): Pool {

    this.kill = true;
    this.all.forEach(n => {
      removeSpecificWorker(this, n);
    });

    return this;
  }

}

const $exports = module.exports;
export default $exports;
