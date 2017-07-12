/// <reference types="node" />
import { ChildProcess } from "child_process";
import { Writable } from "stream";
import * as EE from 'events';
import * as net from "net";
export interface IPoolOptions {
    filePath: string;
    inheritStdio: boolean;
    addWorkerOnExit: boolean;
    size: number;
    env: Object;
    execArgv: Array<string>;
    streamStdioAfterDelegation: boolean;
    args: Array<string>;
    oneTimeOnly: boolean;
    stdin: IStreamFunction | Writable;
    stderr: IStreamFunction | Writable;
    stdout: IStreamFunction | Writable;
    silent: boolean;
    getSharedWritableStream: IStreamFunction | Writable;
    resolveWhenWorkerExits: boolean;
    doNotListenForMessagesFromWorkers: boolean;
    oneJobPerWorker: boolean;
}
export declare type IPoolOptionsPartial = Partial<IPoolOptions>;
export interface IPoolResolutions {
    [key: string]: IPoolResolution;
}
export interface IStreamFunction {
    (): Writable;
}
export interface IResolutionCallback {
    (err: Error | string, data?: Object): void;
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
export interface IPoolioAnyOpts {
    file: string;
    fd: number;
    tty: string;
    socket: net.Socket;
}
export declare class Pool extends EE {
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
    oneTimeOnly: boolean;
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
    detached: boolean;
    constructor(options: IPoolOptionsPartial);
    addWorker(): Pool;
    removeWorker(): Pool;
    getCurrentSize(): Object;
    getCurrentStats(): Object;
    anyCB(msg: Object | string, opts?: Partial<IPoolioAnyOpts>, cb?: IResolutionCallback): void;
    any(msg: Object | string, opts?: Partial<IPoolioAnyOpts>): Promise<IPoolioResponseMsg>;
    destroy(): Pool;
    killAllActiveWorkers(): Pool;
    killAll(): Pool;
    killAllImmediately(): Pool;
}
declare const $exports: any;
export default $exports;
