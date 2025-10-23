export class ProxySandbox {
  sandboxRunning: boolean;
  proxy: {};
  active() {
    this.sandboxRunning = true;
  }
  inactive() {
    this.sandboxRunning = false;
  }
  constructor(ctx) {
    const rawWindow = ctx;
    const fakeWindow = {};
    const proxy = new Proxy(fakeWindow, {
      set: (target, prop, value) => {
        if(this.sandboxRunning) {
          target[prop] = value;
          return true;
        }
      },
      get: (target, prop) => {
        // 如果fakeWindow里面有，就从fakeWindow里面取，否则，就从外部的window里面取
        let value = prop in target ? target[prop] : rawWindow[prop];
        return value
      }
    })
    this.proxy = proxy;
  }
}