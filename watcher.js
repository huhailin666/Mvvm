class Watcher{
  constructor(vm,expr,callback){
    this.vm=vm;
    this.expr=expr;
    this.callback=callback;
    this.value=this.get(vm,expr)
  }
  getVal(vm,expr){
    let xxx=expr.split('.');//[a,v]
    return xxx.reduce((prev,next)=>{
      return prev[next];
    },vm.$data);
  }
  get(){
    Dep.target=this;
    let value=this.getVal(this.vm,this.expr);
    Dep.target=null;
    return value;
  }
  update(){
    let newValue=this.getVal(this.vm,this.expr);
    let oldValue=this.value;
    if(newValue!=oldValue){
      this.callback(newValue)
    }
  }
}