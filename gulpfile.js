/**
 * Created by denman on 2/13/2016.
 */


var path = require('path');

const suman = require('C:\\Users\\denman\\WebstormProjects\\suman');

suman.Runner({
    $node_env: process.env.NODE_ENV,
    fileOrDir: path.resolve(__dirname + '/test/test.js'),
    configPath: 'suman.conf.js'
}).on('message', function (msg) {
    console.log('msg from suman runner', msg);
    process.exit(msg);
});