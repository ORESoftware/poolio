# poolio

much like https://github.com/thisandagain/fork-pool
except simpler implementation and clearer documentation
this lib utilizes a child_process pool, using child_process.fork() like so: 


```javascript
const cp = require('child_process');
const n = cp.fork('your_file.js');
```

as per:

https://nodejs.org/api/child_process.html



### Installation

```bash
npm install -S poolio
```

#### Basic Use

```js

     // in the parent process, we require the module and initialize a pool

        const Pool = require('poolio');

        const pool = new Pool({
            filePath: 'child.js',    //path is relative to root of your project
            size: 3
        });


        function rankPostsUsingWorkerProcess(postIds, cb){
        
            pool.any({action: 'run', posts: postIds}).then(function resolved(posts) {
                    cb(null, posts);
              }, function rejected() {
                    cb(null, []);              //pro-tip, use the rejected handler instead of the catch block, to prevent double-calling of callback
            }).catch(function (err) {
                    log.error(err);
            });
         }
       

```

```javascript

// in a child process - simple example

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

### Advanced use

```js

     // in the parent process, we require the module and initialize a pool

        const Pool = require('poolio');

        const pool = new Pool({
            filePath: 'child.js',    //path is relative to root of your project
            size: 5
        });


        function doHeavyDataIntensiveAsyncWork(data){
        
           return pool.any({action: 'all', data: data}); // return the promise
             
        }
       

```

```javascript

// in a child process - advanced example

const _ = require('lodash');
const domain = require('domain');


process.on('message', function (data) {   //use the closure, it is better that way

    const workId = data.workId;
    const d = domain.create();
    
    d.on('error', _.once(function(err){
       this.exit();
       process.send({
         msg: 'error',
         error: err.stack,
         workId: workId,
         result: null
       });
    
    }));
    
    d.run(function(){
    
    const actions = [];
    
    switch(data.action){
    
         case 'foo':
           actions.push(foo);
           break;
         case 'bar':
           actions.push(bar);
           break;
         case 'baz';
           actions.push(baz);
           break;
         case 'all':
           actions.push(foo);
           actions.push(bar);
           actions.push(baz);
           break;
         default:
           throw new Error('No case matched'); //will be caught by domain.on('error')
    
    }
    
    
       Promise.all(actions).then(function(result){
       
           process.send({
              msg: 'done/return/to/pool',
              result: result,
              workId: workId
              error: null
           });
    
       });
    
    
    });
    
    function foo(){
       
       return new Promise(function(resolve,reject){
       
            // ....do some async work...
        
       }):
       
    }
    
    
    function bar(){
    
        return new Promise(function(resolve,reject){
             
            // ....do some async work...
              
        }):
    
    }
    
    function baz(){
    
       return new Promise(function(resolve,reject){
              
           // ....do some async work...
               
       }):
    }
    
    
});


```

In the future this lib may support other child_process commands besides fork()


this lib was sponsored by Poolio's Fantastic Voyage:

![alt tag](http://i.ytimg.com/vi/a3QAHZicSjQ/0.jpg)