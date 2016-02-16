/**
 * Created by denman on 2/4/2016.
 */


module.exports = Object.freeze({

    verbose: true, //handles and logs warnings (using warning level?)
    checkMemoryUsage: true,
    fullStackTraces: false,
    uniqueAppName: 'suman',
    NODE_ENV: 'development',
    pipeStdOut: 'bunyan',
    MAX_TOTAL_MEMORY: 3000,
    browser: 'Firefox',
    disableAutoOpen: false,
    expireResultsAfter: '10000000',
    resultsCapCount: 100,
    suppressRunnerOutput: true,
    resultsCapSize: 7000, // 3 gb's
    output: {
        'standard': {},
        'basic': {},
        'web': {
            servers: ['localhost']
        }
    },


    servers: {
        'denman-lenovo': {
            host: '127.0.0.1', //10.172.47.79
            port: 6969,
            outputDir: 'C:\\Users\\denman\\suman_results'
        },
        'CACSVML-13295.local': {
            host: '127.0.0.1', //10.172.47.79
            port: 6969,
            outputDir: '/Users/amills001c/suman_results'
        },
        'jarvissc': {
            host: '69.252.255.134',
            port: 6969,
            outputDir: '/home/amills/suman_results'
        },
        'dev85.plaxo.com': {
            host: '172.20.3.31',
            port: 6969,
            outputDir: '/home/amills/suman_results'

        }
    }


});