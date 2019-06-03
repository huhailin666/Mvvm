class Observer {
  constructor(data) {
    this.observer(data);
  }
  observer(data) {
    if (!data || typeof data !== 'object') {
      return;
    }
    //将数据一一劫持 先获取 data 的 key 和value
    Object.keys(data).forEach(key => {
      //劫持
      this.defineReactive(data, key, data[key]);
      this.observer(data[key]);
    })
  }
  defineReactive(obj, key, value) {
    let that=this;
    let dep=new Dep()
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        Dep.target&&dep.addSub(Dep.target)
        return value;
      },
      set(newValue) {
        if (newValue !== value) {
          that.observer(newValue)
          value = newValue;
          dep.notify()
        }
      }
    })
  }
}

class Dep{
  constructor(){
    //订阅的数组
    this.subs=[];
  }
  addSub(watcher){
    this.subs.push(watcher);
  }
  notify(){
    this.subs.forEach(watcher=>{
      watcher.update()
    })
  }
}


