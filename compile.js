class Compile{
  constructor(el,vm){
    this.el=this.isElementNode(el)?el:document.querySelector(el);
    this.vm=vm;
    if(this.el){
      let fragment=this.nodeTofragment(this.el);//将代码放入内存
      this.compile(fragment);
      this.el.appendChild(fragment)

    }
  }
  // 专门写一些辅助方法
  isElementNode(node){
    return node.nodeType===1;
  }
  isDirective(name){
    return name.includes('v-');
  }
  //核心方法
  compileElement(node){
    let attrs=node.attributes;//取到节点的属性
    Array.from(attrs).forEach(attr=>{
      let attrName=attr.name;
      if(this.isDirective(attrName)){
        let expr=attr.value;
        let [,type]=attrName.split('-');
        CompileUtil[type](node,this.vm,expr)
      }
    })
  }  
  compileText(node){//编译{{}}
    let expr=node.textContent;//取文本中的内容，进行正则匹配，然后替换
    let reg=/\{\{([^}]+)\}\}/g; //{{a}},{{b}}
    if(reg.test(expr)){
      CompileUtil['textNode'](node,this.vm,expr)
    }
  }

  nodeTofragment(el){//将 el 中内容全部放入内存中
    let fragment=document.createDocumentFragment();
    let firstChild;
    while(firstChild=el.firstChild){
      fragment.appendChild(firstChild)
    }
    return fragment;
  }

  compile(fragment){
    let childNodes=fragment.childNodes;

    Array.from(childNodes).forEach(node=>{
      if(this.isElementNode(node)){
        this.compileElement(node);
        this.compile(node);  //这里要进行递归调用，编译节点的节点
      }else{
        this.compileText(node)
      }
    })
  }
}

CompileUtil={
  getVal(vm,expr){
    let xxx=expr.split('.');//[a,v]
    return xxx.reduce((prev,next)=>{
      return prev[next];
    },vm.$data);
  },
  getTextVal(vm,expr){
    return expr.replace(/\{\{([^}]+)\}\}/g,(...arguments)=>{
      return this.getVal(vm,arguments[1]);
    })
  },
  textNode(node,vm,expr){
    let updateFn=this.updater['textUpdater'];

    let value=this.getTextVal(vm,expr)
    expr.replace(/\{\{([^}]+)\}\}/g,(...arguments)=>{
      new Watcher(vm,arguments[1],(newValue)=>{
        //如果数据变化了，文本节点需要重新获取依赖的属性更新文本的内容
        updateFn&&updateFn(node,this.getTextVal(vm,expr))
      })
    })

    updateFn&&updateFn(node,value)

  },
  text(node,vm,expr){//v-text处理
    let updateFn=this.updater['textUpdater'];
    new Watcher(vm,expr,(newValue)=>{
      //当值变化后调用 callback 
      updateFn&&updateFn(node,this.getVal(vm,expr))
    })
    updateFn&&updateFn(node,this.getVal(vm,expr))
  },
  setVal(vm,expr,value){
    expr=expr.split('.');
    return expr.reduce((prev,next,currentIndex)=>{
      if(currentIndex==expr.length-1){
        return prev[next]=value;
      }
      return prev[next];
    },vm.$data)
  },
  model(node,vm,expr){//v-model输入框处理
    let updateFn=this.updater['modelUpdater'];
    new Watcher(vm,expr,(newValue)=>{
      //当值变化后调用 callback 
      updateFn&&updateFn(node,this.getVal(vm,expr))
    });
    node.addEventListener('input',e=>{
      let newValue=e.target.value;
      this.setVal(vm,expr,newValue)
    })
    updateFn&&updateFn(node,this.getVal(vm,expr))
  },
  updater:{
    textUpdater(node,value){
      node.textContent=value;
    },
    modelUpdater(node,value){
      node.value=value;
    }
  }
}