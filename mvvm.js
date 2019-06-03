class Mvvm{
  constructor(options){
    //先把可用的东西挂载到实例
    this.$el=options.el;
    this.$data=options.data;
    //如果有要编译的模板，就进行编译
    if(this.$el){
      new Observer(this.$data)
      this.proxyData(this.$data);
      //用数据和元素进行编译
      new Compile(this.$el,this);
    }
  }
  proxyData(data){
    Object.keys(data).forEach(key=>{
      Object.defineProperty(this,key,{
        get(){
          return data[key]
        },
        set(newValue){
          data[key]=newValue
        }    
      })

    })
  }
}

