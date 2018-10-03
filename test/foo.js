const register = function (cb) {
  
  let m = 0;
  
  setInterval(() => {
    
    m++;
    
    cb(null, m, (err, v) => {
      console.log('we got:', err, v);
    });
    
  }, 500);
  
  return cb;
  
};



const {bindCallback, bindNodeCallback} = require('rxjs');

const obs = bindNodeCallback(register((v, cb) => {
  
  setTimeout(() => {
    
    cb(null, v + 'sooo');
    
  }, 200);
  
}));


const subscription = obs().subscribe(v => {
  console.log('on next:', v);
}, e => {
   console.log('on error:', e);
});
