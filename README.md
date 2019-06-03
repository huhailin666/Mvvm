最近看了很多小伙伴写的实现MVVM框架，但是大多是列举了一堆代码，没有很清晰的讲述代码的原理，于是，我花了几天的时间，做了一下整理，看看VUE是如何实现数据双向绑定的，希望对大家学习vue数据双向绑定提供借鉴。
[源码在此]([https://github.com/huhailin666/Mvvm](https://github.com/huhailin666/Mvvm)
)
## `Vue`的数据绑定写法
先看一下用`Vue`是怎么写的双向绑定。
代码如下：
```
<div id="app">
  <input type="text" v-model="message">
  {{message}}
</div>

new Vue({
  el:'#app',
  data:{
    message:'hello world'
  }
})
```
以上代码，我们能看到如下视图：
![image.png](https://upload-images.jianshu.io/upload_images/15725526-bef9e38ed0017862.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 分析如何实现`Vue`数据双向绑定功能
1. `vue`中视图上出现很多 `{{message}}`，`v-model`，`v-text`等等模板，我们要对其进行编译。
2. 数据变化的时候，会动态更新到视图上，使用的`Object.defineProperty()`，进行数据劫持。
3. 通过`Watcher`观察数据的变化，然后重新编译模板，渲染到视图上  
![image.png](https://upload-images.jianshu.io/upload_images/15725526-283aed2f89d88227.png)
## 具体步骤如下
### 步骤一
自己定义一个`Mvvm`方法，取代`Vue`进行模板编译。
html中代码如下：
```
<div id="app">
  <input type="text" >
  <div>{{message}}</div>
</div>
<script>
  let vm = new Mvvm({//我们自己构造一个Mvvm去实现Vue的功能
    el:'#app',
    data:{
      message:'hello world'
    }
  })
</script>
```
可以看到，我们在`new Mvvm`的时候，给其传递了一个对象，这个对象中包含两个属性，`el`和`data`。根据这两个属性，对视图进行编译。因此下面我们要写这个`Mvvm`中的函数体，来实现数据传递，让模板对视图进行编译。

`Mvvm`函数代码的原理：接收传递过来的参数，得到挂载的节点，然后对节点的内容进行编译，代码如下：
```
class Mvvm{
  constructor(options){
    this.$el=options.el;
    this.$data=options.data;
    if(this.$el){
      new Compile(this.$el,this);//这里将节点和`实例传给complie进行处理
    }
  }
}
```
可以看到，在代码的最后，我们把这个节点交给了`Compile`这个函数进行处理，而这个函数的功能就是实现模板的编译。
### 步骤二
实现模板的编译
```
class Compile{
  constructor(el,mvvm){//接收传递过来的两个参数，节点和实例对象
    this.el=document.querySelector(el);
    this.mvvm=mvvm;//将传递的参数放在实例上
  }
}
```
分析：用`Compile`获取到这个节点和`mvvm`实例后，我们要对其进行编译。编译可分为如下三个部分：
1. 先把这个 DOM 放在内存中
2. 编译出元素节点（v-model、v-text...）和文本节点{{message}}
3. 将编译好的内容放回到页面中

#### 根据上述三个部分，逐一对代码进行改进
##### 1.将 DOM 放入内存
```
class Compile{
  constructor(el,mvvm){//接收传递过来的两个参数，节点和实例对象
    this.el=document.querySelector(el);
    this.vm=vm;//将传递的参数放在实例上
    if(this.el){
      let fragment=this.nodeToFragment(this.el);//将节点放入内存中
    }
  }
  nodeToFragment(el){
    let fragment=document.creatDocumentFragment();
    let firstChild;
    while(firstChild=el.firstChild){
      fragment.appendChild(firstChild)
    }
    return fragment;
  }
}
```
##### 2.将内存中的代码进行编译
> 编译要分为元素节点编译和文本编译，即`v-model,v-text`的编译和`{{message}}`类型文本编译，因此针对不同的内容，要书写不同的编译方法。

因此首先要判断节点的类型，如果是元素节点，则应判断其是否包含`v-model`或`v-text`指令，如果包含，则对齐内容进行编译。
如果是文本节点，则应用正则匹配判断其是否包含`{{message}}`，如果包含，则用正则进行替换。
###### Compile中的constructor具体代码如下：
```
constructor(el,vm){
  this.el=this.isElementNode(el)?el:document.querySelector(el);
  this.vm=vm;
  if(this.el){
    let fragment=this.nodeTofragment(this.el);//将代码放入内存
    this.compile(fragment);//在内存中进行编译
    this.el.appendChild(fragment)//编译完成后放回到页面
  }
}
```
###### 给`Compile`原型中增加方法：
1. `complie`方法
> 遍历节点，判断是否为元素节点，如果是，则编译节点，并递归调用子节点。如果不是元素节点，则编译文本节点。
```
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
//判断是否为节点
isElementNode(node){
  return node.nodeType===1;
}
``` 
2. `compileElement`方法（编译元素节点方法）
判断元素节点是否包含`v-model或v-text`指令
如果包含则做相应的编译
```
compileElement(node){
  let attrs=node.attributes;//取到节点的属性
  Array.from(attrs).forEach(attr=>{
    let attrName=attr.name;
    if(this.isDirective(attrName)){
      let expr=attr.value;
      let [,type]=attrName.split('-');
      CompileUtil[type](node,this.vm,expr) //这里定义了编译元素的方法，代码在后面
    }
  })
}
//判断是否包含 v- 属性
isDirective(name){
  return name.includes('v-');
}
```
3. `compileText`方法（编译文本节点方法）
```
compileText(node){//编译\{\{\}\}
  let expr=node.textContent;//取文本中的内容，进行正则匹配，然后替换
  let reg=/\{\{([^}]+)\}\}/g; //{{a}},{{b}}
  if(reg.test(expr)){
    CompileUtil['textNode'](node,this.vm,expr)
  }
}
```
4. `CompileUtil`方法
> CompileUtil中定义了具体的针对元素节点不同指令，以及文本的编译的方法。

注意：data中的数据可能是对象中嵌套对象，所以要层层取值，因此需要用到下面的`getVal`方法。
```
CompileUtil={
  getVal(vm,expr){
    let xxx=expr.split('.');//[a,v]
    return xxx.reduce((prev,next)=>{
      return prev[next];
    },vm.$data);
  },
  textNode(node,vm,expr){ //{{message}} 编译
    let updateFn=this.updater['textUpdater'];

    let value=expr.replace(/\{\{([^}]+)\}\}/g,(...arguments)=>{
      return this.getVal(vm,arguments[1]);
    })
    updateFn&&updateFn(node,value)

  },
  text(node,vm,expr){//v-text编译
    let updateFn=this.updater['textUpdater'];
    updateFn&&updateFn(node,this.getVal(vm,expr))
  },
  model(node,vm,expr){//v-model编译
    let updateFn=this.updater['modelUpdater'];
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
```

此时你能看到，已经能将Mvvm中的data数据，编译成我们想要看到的视图了。
![image.png](https://upload-images.jianshu.io/upload_images/15725526-6fa8b0fc6c2e70c9.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
  
**但是这个视图只是静态视图，当你改变data中的数据时，并不能引起视图的更新，因此我们必须用到数据劫持，即在编译前，对数据进行劫持**
### 步骤三
> 实现
#### 1. 改进`Mvvm`中代码,在编译前加上数据劫持，代码如下：
```
class Mvvm{
  constructor(options){
    this.$el=options.el;
    this.$data=options.data;
    if(this.$el){
      new Observer(this.$data);//在Mvvm中加上观察者
      new Compile(this.$el,this);
    }
  }
}
```
#### 2. 书写`Observer`中的代码
##### 1.在函数体中，对`Observer`中的每个属性一一劫持
注意： 有可能data中还包含对象，因此我们要用到递归调用，对data中的值再做一次劫持
```
class Observer{
  constructor(data){
    this.Observer(data);
  }
  observer(data){
    if(!data||typeof data === 'object'){
      return;
    }
    //将数据一一劫持 先获取 data 的 key 和value
    Object.keys(data).forEach(key=>{
      //劫持
      this.defineReactive(data,key,data[key]);
      this.observer(data[key]);//递归调用
    })
  }
}
```
**关键部分来了**
定义双向数据绑定
```
defineReactive(obj, key, value) {
  let that=this;
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      return value;
    },
    set(newValue) {
      if (newValue !== value) {
        that.observer(newValue)
        value = newValue;
      }
    }
  })
}
```
注意：要在set数据时再进行一次劫持


### 步骤四
定义观察者
给观察者的原型上定义一个更新的方法，当数据发生更新时，调用该方法。
```
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
    let value=this.getVal(this.vm,this.expr);
    return value;
  }
  update(){
    let newValue=this.getVal(this.vm,this.expr);
    let oldValue=thisvalue;
    if(newValue!=oldValue){
      this.callback(newValue)
    }
  }
}
```
定义完后，将`CompileUtil`的代码进行如下修改：
给每个模板编译都`new`一个`Watcher`，,并将对应的实例，表达式和方法传过去。
```
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
        updateFn&&updateFn(node,this.getTextVal())
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
  model(node,vm,expr){//v-model输入框处理
    let updateFn=this.updater['modelUpdater'];
    new Watcher(vm,expr,(newValue)=>{
      //当值变化后调用 callback 
      updateFn&&updateFn(node,this.getVal(vm,expr))
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
```
此时可以发现，虽然定义了`Watcher`并且在编译模板的时候也创建了实例，但并未对齐进行调用，因此下面将对其进行调用

定义`Dep`，在其原型上有两个方法，`addSub`将`watcher`实例添加到`subs`数组中，`notify`调用`watcher`实例中的`update`方法
```
class Dep{
  constructor(){
    //订阅的数组
    this.subs=[];
  }
  addSub(watcher){
    this.subs.push(watcher)
  }
  notify(){
    this.subs.forEach(watcher=>{
      watch.update()
    })
  }
}
```


`Dep`定义完后要对其进行调用
我们注意到，在编译模板的时候，调用`new Watcher`，而`new Watcher`的时候会进行取值，而取值又会调用`Watcher`的`get`方法，因此我们可以在其中添加如下
解释： 将这个`watcher`实例赋值给`Dep.target`，然后调用取值函数，由于这个数被劫持，所以可以在劫持的`get`中进行操作。
```
get(){
  Dep.target=this;
  let value=this.getVal(this.vm,this.expr);
  Dep.target=null;
  return value;
}
```
并将`Observer`中的`defineReactive`修改如下
在`get`数据的同时，将`target`放入当前实例的的数组中
```
defineReactive(obj, key, value) {
  let that=this;
  let dep=new Dep()
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      Dep.target&&dep.addSub(dep.target)
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
```
到此就实现了一个`MVVM`。