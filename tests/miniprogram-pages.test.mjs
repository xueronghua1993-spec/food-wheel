import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
function loadPage(name,app,wx={}){
 const file='miniprogram/pages/'+name+'/'+name+'.js';assert.ok(fs.existsSync(file),'native '+name+' page must exist');let page;
 const require=createRequire(new URL('../'+file,import.meta.url));
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{require,Page:p=>page=p,getApp:()=>app,wx,console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Math});
 page.data=JSON.parse(JSON.stringify(page.data));page.setData=function(values,callback){Object.assign(this.data,values);callback?.();};return page;
}
function app(){const disk=new Map();return {account:{store:{getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},state:()=>({user:null,status:'游客模式'}),subscribe:()=>()=>{},sync:async()=>true},disk};}
test('history todos are readonly even if a native event invokes a hidden action',()=>{
 const a=app(),p=loadPage('calendar',a,{showToast(){},loadSubpackage:o=>o.fail()});p.onLoad({date:'2026-10-03'});
 p.data.todoInput='不应保存';p.addTodo();p.toggleTodo({currentTarget:{dataset:{id:'one'}}});p.removeTodo({currentTarget:{dataset:{id:'one'}}});assert.equal(a.disk.size,0);
});
test('stale weather failures do not replace a newer successful city result',async()=>{
 const p=loadPage('index',app());p._active=true;let failOld,count=0;
 p.weather={load:()=>++count===1?new Promise((resolve,reject)=>failOld=reject):Promise.resolve({name:'上海',temperature:20})};
 const old=p.loadWeather();await p.loadWeather();failOld(Error('old network failure'));await old;
 assert.equal(p.data.weather.name,'上海');assert.equal(p.data.weatherMessage,'');
});
test('today todo persists, completion counts update and share keeps selected date',()=>{
 const a=app(),p=loadPage('calendar',a,{showToast(){},loadSubpackage:o=>o.fail()});p.onLoad({});
 p.data.todoInput='散步';p.addTodo();assert.equal(p.data.todos.length,1);const id=p.data.todos[0].id;
 p.toggleTodo({currentTarget:{dataset:{id}}});assert.equal(p.data.done,1);
 const share=p.onShareAppMessage();assert.ok(share.path.endsWith('?date='+p.data.selected));
 p.removeTodo({currentTarget:{dataset:{id}}});assert.equal(p.data.todos.length,0);
});
test('calendar ignores stale package callbacks after changing the date',()=>{
 const a=app(),callbacks=[],p=loadPage('calendar',a,{loadSubpackage:o=>callbacks.push(o),showToast(){}});p.onLoad({date:'2026-10-03'});
 p.select('2026-10-04');callbacks[0].success();assert.equal(p.data.selected,'2026-10-04');assert.equal(p.data.photo,'/assets/fallback.jpg');callbacks[1].success();assert.equal(p.data.photo,p.data.entry.imagePath);
});
test('invalid draft does not overwrite a stored menu and busy wheel blocks mode changes',()=>{
 const a=app(),p=loadPage('index',a,{showToast(){}});p.reload();p.data.draft=['面',' 面 '];p.saveMenu();assert.equal(a.disk.size,0);assert.ok(p.data.editError);
 p.data.busy=true;p.switchMode({currentTarget:{dataset:{mode:'coffee'}}});assert.equal(p.data.mode,'food');
});
test('a cloud menu change clears a previous winner instead of mismatching the pointer',()=>{
 const a=app(),p=loadPage('index',a);p.reload();p.data.winner='面条';
 a.disk.set('personal-food-wheel-v1','["火锅","饺子"]');p.reload();
 assert.equal(p.data.winner,'');assert.match(p.data.notice,/菜单已更新/);assert.deepEqual(Array.from(p.data.menu),['火锅','饺子']);
});
