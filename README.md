# poolio

much like https://github.com/thisandagain/fork-pool
except simpler implementation and clearer documentation (for now)
this lib utilizes a child_process pool, using child_process.fork() like so: 


```javascript
var cp = require('child_process');
cp.fork('your_file.js');
```

as per:

https://nodejs.org/api/child_process.html




### Installation

```bash
npm install --save poolio
```

#### Basic Use

```javascript

// Parent process

var Pool = require('poolio');

var pool = new Pool({
    filePath: 'child.js',
    size: 3
});

var msg = {'do that':'do that that that'};

pool.any(msg,function(err,result){
      console.log(err,result);
});

```

```javascript

// Child process

process.on('message', function (msg) {

    switch(msg){
      case: 'whatever'
         doRun(msg);
    }
}

function doRun(msg){


   //do some work here...
   
   
   //when you are done, then call the following, which will put the process back in the available pool of workers
  
   process.send({
     msg: 'done',  
     error: 'if there is an error include it as a string here',
     result: {}
   });
  
}
    
});

```

In the future this lib will support other child_process commands besides fork(), but for now you can only point to a file xyz.js



this lib was sponsored by Coolio's Fantastic Voyage:

![alt tag](http://i.ytimg.com/vi/a3QAHZicSjQ/0.jpg)