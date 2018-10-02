'use strict';

// in a child process - advanced example

process.on('message', d => {   //use the closure, it is better that way
  
  // const v = JSON.parse(d.message.value);
  const workId = d.workId;
  
  process.send({
    msg: 'done/return/to/pool',
    result: 'bar',
    workId: workId,
    error: null
  });
  
});



