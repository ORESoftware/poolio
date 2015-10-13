/**
 * Created by amills001c on 10/12/15.
 */


var cp = require('child_process');
var _ = require('underscore');
var EE = require('events');
var path = require('path');
var ReadWriteLock = require('rwlock');


function Pool(options) {

    this.available = [];

    this.lock = new ReadWriteLock();

    this.ee = new EE();
    this.ee.setMaxListeners(300);

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
                    self.ee.emit('newly available cp', cp);
                    break;
            }
        });
    });

}


Pool.prototype.any = function (msg) {

    console.log('pool size:', this.available.length);

    var self = this;

    this.lock.readLock(function (release) {
        if (self.available.length > 0) {
            var cp = self.available.shift();
            if (cp) {
                found = true;
                cp.send(msg);
            }
            else {
                console.log('!!first not found!!');
            }
        }
        else {
            self.ee.on('newly available cp', cb);

             function cb (cp) {
                self.ee.removeListener('newly available cp',cb);
                //console.log('newly available cp cb');
                self.lock.readLock(function (release) {
                    self.available.push(cp);
                    //console.log('found');
                    if (!found) {
                        found = true;
                        //console.log('not found, msg:', msg);
                        var $cp = self.available.shift();
                        $cp.send(msg);
                    }
                    release();
                });
            };
        }
        release();
    });


};


module.exports = Pool;