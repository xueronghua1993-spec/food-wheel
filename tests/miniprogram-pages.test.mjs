import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
function loadPage(name,app,wx={}){
 const file='miniprogram/pages/'+name+'/'+name+'.js';assert.ok(fs.existsSync(file),'native '+name+' page must exist');let page;
 const require=createRequire(new URL('../'+file,import.meta.url));
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{require,Page:p=>page=p,getApp:()=>app,wx,console,setTimeout,clearTimeout,setInterval,clearInterval,Date,Math});
 page.data=JSON.parse(JSON.stringify(page.data));page.setData=function(values,callback){Object.assign(this.data,values);callback?.();};return page;
}
function app(){const disk=new Map(),store={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)};return {store,disk};}
test('history todos are readonly even if a native event invokes a hidden action',()=>{
 const a=app(),p=loadPage('calendar',a,{showToast(){},loadSubpackage:o=>o.fail()});p.onLoad({date:'2026-10-03'});
 p.data.todoInput='不应保存';p.addTodo();p.toggleTodo({currentTarget:{dataset:{id:'one'}}});p.removeTodo({currentTarget:{dataset:{id:'one'}}});assert.equal(a.disk.size,0);
});
test('native app launches offline and preserves saved menu and todos across page reopen',()=>{
 const disk=new Map([['personal-food-wheel-v1','["火锅","饺子"]']]);
 const wx={getStorageSync:k=>disk.get(k)??'',setStorageSync:(k,v)=>disk.set(k,v),request(){assert.fail('local app must not request a backend');},onNetworkStatusChange(){assert.fail('local app must not subscribe to sync');}};
 let nativeApp;const require=createRequire(new URL('../miniprogram/app.js',import.meta.url));
 vm.runInNewContext(fs.readFileSync('miniprogram/app.js','utf8'),{require,App:a=>nativeApp=a,wx});
 nativeApp.onLaunch();nativeApp.onShow?.();
 const home=loadPage('index',nativeApp,wx);home.onLoad();home.onShow();
 assert.deepEqual(Array.from(home.data.menu),['火锅','饺子']);
 const calendar=loadPage('calendar',nativeApp,{...wx,showToast(){},loadSubpackage:o=>o.fail()});calendar.onLoad({});calendar.data.todoInput='散步';calendar.addTodo();
 const reopened=loadPage('calendar',nativeApp,{...wx,loadSubpackage:o=>o.fail()});reopened.onLoad({});assert.equal(reopened.data.todos[0].text,'散步');
 home.reload();assert.equal(home.data.todoCount,'0/1');home.onHide();
});
test('today todo persists, completion counts update and share keeps selected date',()=>{
 const a=app(),p=loadPage('calendar',a,{showToast(){},loadSubpackage:o=>o.fail()});p.onLoad({});
 p.data.todoInput='散步';p.addTodo();assert.equal(p.data.todos.length,1);const id=p.data.todos[0].id;
 p.toggleTodo({currentTarget:{dataset:{id}}});assert.equal(p.data.done,1);
 const share=p.onShareAppMessage();assert.ok(share.path.endsWith('?date='+p.data.selected));
 p.removeTodo({currentTarget:{dataset:{id}}});assert.equal(p.data.todos.length,0);
});
test('calendar photos work without a game-only subpackage API and follow date changes',()=>{
 const p=loadPage('calendar',app(),{showToast(){}});p.onLoad({date:'2026-10-03'});
 assert.equal(p.data.photo,p.data.entry.imagePath);assert.equal(p.data.photoLoading,false);
 p.select('2026-10-04');assert.equal(p.data.photo,p.data.entry.imagePath);
 assert.ok(fs.existsSync('miniprogram'+p.data.photo));
 const home=loadPage('index',app());home.onLoad();home.onShow();
 assert.notEqual(home.data.miniPhoto,'/assets/fallback.jpg');assert.ok(fs.existsSync('miniprogram'+home.data.miniPhoto));
 home.onHide();
});
test('invalid draft does not overwrite a stored menu and busy wheel blocks mode changes',()=>{
 const a=app(),p=loadPage('index',a,{showToast(){}});p.reload();p.data.draft=['面',' 面 '];p.saveMenu();assert.equal(a.disk.size,0);assert.ok(p.data.editError);
 p.data.busy=true;p.switchMode({currentTarget:{dataset:{mode:'coffee'}}});assert.equal(p.data.mode,'food');
});
test('a stored menu change clears a previous winner instead of mismatching the pointer',()=>{
 const a=app(),p=loadPage('index',a);p.reload();p.data.winner='面条';
 a.disk.set('personal-food-wheel-v1','["火锅","饺子"]');p.reload();
 assert.equal(p.data.winner,'');assert.match(p.data.notice,/菜单已更新/);assert.deepEqual(Array.from(p.data.menu),['火锅','饺子']);
});

test('reset failure remains visible in the open editor and preserves custom menu',()=>{
 const a=app(),p=loadPage('index',a,{showModal:o=>o.success({confirm:true})});p.reload();p.editMenu();
 a.store.setItem=()=>{throw Error('storage full');};p.resetMenu();
 assert.equal(p.data.editing,true);assert.match(p.data.editError,/默认菜单未能保存/);
});
