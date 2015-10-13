/**
 * Created by amills001c on 10/12/15.
 */


var cp = require('child_process');
var _ = require('underscore');
var EE = require('events');
var path = require('path');

function Pool(options) {

    this.available = [];

    this.ee = new EE();

    var opts = _.defaults(options, {
        size: 2
    });

    for (var option in opts) {
        if (opts.hasOwnProperty(option)) {
            this[option] = opts[option];
        }
    }


    for (var i = 0; i < this.size; i++) {
        this.available.push(cp.fork(path.resolve(__dirname + '/' +this.filePath)));
    }

    var self = this;
    this.available.forEach(function(cp){
        cp.on('message', function (msg) {
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

    if (this.available[0]) {
        var cp = this.available.shift();
        cp.send(msg);
    }
    else {
        var self = this;
        this.ee.on('newly available cp', function () {
            var cp = self.available.find();
            cp.send(msg);
        });
    }
};


module.exports = Pool;