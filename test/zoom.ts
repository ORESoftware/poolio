import {bindNodeCallback} from 'rxjs';

export type ErrorFirstCb = (err: any, val?: any) => void;
export type CbFn = (m: number, cb: ErrorFirstCb) => void;

const register = function (cb: CbFn) {

  let m = 0;

  setInterval(() => {

    m++;
    cb(m, null);

  }, 500);

  return cb;

};

const obs = bindNodeCallback(register((v, cb) => {

  setTimeout(() => {

    cb(null, v + 'sooo');

  }, 200);

}));

const subscription = obs(5).subscribe(v => {
  console.log('on next:', v);
}, e => {
  console.log('on error:', e);
});
