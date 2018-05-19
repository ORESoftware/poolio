/// <reference types="node" />
import { ChildProcess } from "child_process";
import { Writable } from "stream";
import * as EE from 'events';
import * as net from "net";
export interface PoolioOpts {
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
export interface PoolioResolutions {
    [key: string]: PoolioResolution;
}
export interface IStreamFunction {
    (): Writable;
}
export interface IResolutionCallback {
    (err: Error | string, data?: Object): void;
}
export interface PoolioChildProcess extends ChildProcess {
    workId: number;
    workerId: number;
    tempId: string;
}
export interface PoolioMsgQueue {
    workId: number;
    msg: string | Object;
    __poolioWorkerId?: number;
}
export interface PoolioResolution {
    cb?: Function;
    resolve?: Function;
    reject?: Function;
}
export interface PoolioResponseMsg {
    workId: number;
    error?: string;
    result: Object;
}
export interface PoolioAnyOpts {
    file: string;
    fd: number;
    tty: string;
    socket: net.Socket;
}
export declare class Pool extends EE {
    kill: boolean;
    all: Array<PoolioChildProcess>;
    available: Array<PoolioChildProcess>;
    msgQueue: Array<PoolioMsgQueue>;
    resolutions: PoolioResolutions;
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
    constructor(options: Partial<PoolioOpts>);
    addWorker(): Pool;
    removeWorker(): Pool;
    getCurrentSize(): Object;
    getCurrentStats(): object;
    noop(): void;
    any(msg: object | string, opts?: Partial<PoolioAnyOpts>, cb?: IResolutionCallback): void;
    anyp(msg: Object | string, opts?: Partial<PoolioAnyOpts>): Promise<PoolioResponseMsg>;
    destroy(): Pool;
    killAllActiveWorkers(): Pool;
    killAll(): Pool;
    killAllImmediately(): Pool;
}
