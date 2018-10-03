# Poolio

[![Version](https://img.shields.io/npm/v/poolio.svg?colorB=green)](https://www.npmjs.com/package/poolio)
[![Build Status](https://travis-ci.org/ORESoftware/poolio.svg?branch=master)](https://travis-ci.org/ORESoftware/poolio)


##  => a versatile process pool for Node.js

* create a pool of N workers
* define the start script for each worker in the pool
* kill workers after each task and automatically generate a new worker on exit, or more likely, reuse the same
workers for the lifecycle of the worker pool.
* dynamically add or remove workers at will

<br>

<a href="https://nodei.co/npm/poolio/"><img src="https://nodei.co/npm/poolio.png?downloads=true&downloadRank=true&stars=true"></a>

<br>

This module behaves much like these two pre-existing modules:

* core: https://nodejs.org/api/cluster.html#cluster_cluster_setupmaster_settings
* userland: https://github.com/thisandagain/fork-pool

This module strives for a better implementation and simpler API. Like the above,
this lib utilizes a child_process pool, using child_process.fork() like so: 


```javascript

const cp = require('child_process');
const n = cp.spawn('node',['<your-worker-script>']);

```

## Installation

```bash
npm install -S poolio
```

## Basic Use


```js
import * as poolio from 'poolio';

```

```js

import {Pool} from 'poolio';
const workerScript = require.resolve(path.resolve(__dirname) + '/worker.js');

// in the current process, we initialize a pool
const pool = new Pool({
    filePath: workerScript,  // must pass an absolute path
    size: 3
});


const rankPostsUsingWorkerPool = function (postIds){
   return pool.anyp({action: 'run', posts: postIds});
}
       

// in the worker script/process - simple example:

process.on('message', function (data) {   //use the closure, it is better that way

    const workId = data.workId;
    
    var result;
    
    try{
    
     result = doSomeIntensiveWork();
     
     process.send({
        msg: 'done/return/to/pool',
        error: null,
        workId: workId,
        result: result
     });
     
    }
    catch(err){
        process.send({
            msg: 'error',
            error: err.stack,
            workId: workId,
            result: null
         });
    }
    
    
    
    function doSomeIntensiveWork(){
    
       // ....
    
        return 'some-very-special-result';
    
    }
    
    
});


```

## Advanced use

To see advanced examples using Node.js domains and TypeScript usage, see the `docs/examples` dir.



