'use strict';


// in a child process - advanced example

const _ = require('lodash');
const Domain = require('domain');


process.on('message', function (data) {   //use the closure, it is better that way
  
  const workId = data.workId;
  
  const d = Domain.create();
  
  d.once('error', function(err){
    this.exit();
    process.send({
      msg: 'error',
      error: err.stack,
      workId: workId,
      result: null
    });
    
  });
  
  d.run(function(){
    
    const actions = [];
    
    switch(data.action){
      
      case 'foo':
        actions.push(foo);
        break;
      case 'bar':
        actions.push(bar);
        break;
      case 'baz':
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
        workId: workId,
        error: null
      });
      
    });
    
    
  });
  
  function foo(){
    
    return new Promise(function(resolve,reject){
      
      // ....do some async work...
      
    })
    
  }
  
  
  function bar(){
    
    return new Promise(function(resolve,reject){
      
      // ....do some async work...
      
    })
    
  }
  
  function baz(){
    
    return new Promise(function(resolve,reject){
      
      // ....do some async work...
      
    })
  }
  
  
});



