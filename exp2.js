var async_wrap = process.binding('async_wrap');
var uid = 0;

var kCallInitHook = 0;
var asyncHooksObject = {};

function asyncInit() {
    this._asyncQueue = { uid: ++uid };
    // Internal mechanism to write directly to stderr.
    process._rawDebug('init    ' + this._asyncQueue.uid);
}

function asyncBefore() {
    process._rawDebug('before: ' + this._asyncQueue.uid);
}

function asyncAfter() {
    process._rawDebug('after:  ' + this._asyncQueue.uid);
    process.exit();
}

async_wrap.setupHooks(asyncHooksObject, asyncInit, asyncBefore, asyncAfter);
asyncHooksObject[kCallInitHook] = 1;

var net = require('net');
var s = net.createServer();

s.on('connection', function onConnection(c) {
    c.end('bye\n');
});

s.listen(8000, function() {
    // Don't want to trace the req making the conntion. Only the received
    // req by the server.
    asyncHooksObject[kCallInitHook] = 0;

    // Create a connection for logging, then exit app.
    net.connect(8000, function() { });
});