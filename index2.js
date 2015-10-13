/**
 * Created by amills001c on 10/12/15.
 */


var cp = require('child_process');
var _ = require('underscore');
var EE = require('events');
var path = require('path');
var ReadWriteLock = require('rwlock');

var lock = new ReadWriteLock();

function Pool(options) {

    this.available = [];

    this.ee = new EE();
    this.ee.setMaxListeners(19);

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
            //console.log('message received by pool:',msg);
            switch (msg) {
                case 'isAvailable':
                    self.available.push(cp);
                    self.ee.emit('newly available cp');
                    break;
            }
        });
    });

}


Pool.prototype.any = function (msg) {

    console.log('pool size:',this.available.length);

    var self = this;

    lock.readLock(function (release) {

        var cp = null;
        if (cp = findFirst(self.available)) {
            cp.send(msg);
            release();
        }
        else {
            self.ee.on('newly available cp', function () {
                cp = findFirst(self.available);
                cp.send(msg);
                release();
            });
        }
    });

};


function findFirst(array) {
    while (array.length > 0) {
        var cp = array.shift();
        if (cp) {
            return cp;
        }
    }
    return null;
}

module.exports = Pool;