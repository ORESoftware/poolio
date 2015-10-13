/**
 * Created by amills001c on 10/12/15.
 */


var cp = require('child_process');
var _ = require('underscore');
var EE = require('events');
var path = require('path');


function Pool(options) {

    this.available = [];
    this.msgQueue = [];

    var opts = _.defaults(options, {
        size: 2
    });

    for (var option in opts) {
        if (opts.hasOwnProperty(option)) {
            this[option] = opts[option];
        }
    }

    for (var i = 0; i < this.size; i++) {
        this.available.push(cp.fork(path.resolve(__dirname + '/' + this.filePath)));
    }

    var self = this;
    this.available.forEach(function (cp) {
        cp.on('message', function (msg) {
            switch (msg) {
                case 'isAvailable':
                    delegateCP.bind(self)(cp);
                    break;
            }
        });
    });

}

function delegateCP(cp) {
    if (this.msgQueue.length > 0) {
        cp.send(this.msgQueue.shift());
    }
    else {
        this.available.push(cp);
    }
}


Pool.prototype.any = function (msg) {

    console.log('pool size:', this.available.length);

    if (this.available.length > 0) {
        this.available.shift().send(msg);
    }
    else {
        this.msgQueue.push(msg);
    }

};


module.exports = Pool;