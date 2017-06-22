/// <reference types="node" />
import EventEmitter = NodeJS.EventEmitter;
import { ChildProcess } from "child_process";
import { Writable } from "stream";
export interface IPoolOptions {
    filePath: string;
    addWorkerOnExit: boolean;
    size: number;
    env: Object;
    execArgv: Array<string>;
    args: Array<string>;
    oneTimeOnly: boolean;
    stdin: IStreamFunction | Writable;
    stderr: IStreamFunction | Writable;
    stdout: IStreamFunction | Writable;
    silent: boolean;
    getSharedWritableStream: IStreamFunction | Writable;
}
export declare type IPoolOptionsPartial = Partial<IPoolOptions>;
export interface IPoolResolutions {
    [key: string]: IPoolResolution;
}
export interface IStreamFunction {
    (): Writable;
}
export interface IResolutionCallback {
    (err: Error | string, data: Object): void;
}
export interface IPoolioChildProcess extends ChildProcess {
    workerId: number;
    tempId: string;
}
export interface IPoolMsgQueue {
    workId: number;
    msg: string | Object;
    __poolioWorkerId?: number;
}
export interface IPoolResolution {
    cb?: Function;
    resolve?: Function;
    reject?: Function;
}
export interface IPoolioResponseMsg {
    workId: number;
    error?: string;
    result: Object;
}
export declare class Pool extends EventEmitter {
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
    oneTimeOnly: boolean;
    addWorkerOnExit: boolean;
    stdin: IStreamFunction | Writable;
    stderr: IStreamFunction | Writable;
    stdout: IStreamFunction | Writable;
    silent: boolean;
    getSharedWritableStream: IStreamFunction | Writable;
    env: Object;
    detached: boolean;
    constructor(options: IPoolOptionsPartial);
    addWorker(): Pool;
    removeWorker(): Pool;
    getCurrentSize(): Object;
    getCurrentStats(): Object;
    any(msg: Object | string, cb?: IResolutionCallback): Promise<IPoolioResponseMsg> | void;
    destroy(): Pool;
    killAllActiveWorkers(): Pool;
    killAll(): Pool;
    killAllImmediately(): Pool;
}
declare const $exports: any;
export default $exports;
