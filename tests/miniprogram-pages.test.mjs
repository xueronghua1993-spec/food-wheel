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

test('wheel shares restore coffee mode and supply a local cover',()=>{
 const p=loadPage('index',app(),{showShareMenu(){}});p.onLoad({mode:'coffee'});p.onShow();
 assert.equal(p.data.mode,'coffee');
 const timeline=p.onShareTimeline();assert.equal(timeline.query,'mode=coffee');assert.match(timeline.title,/咖啡/);assert.equal(timeline.imageUrl,'/assets/share-coffee.jpg');assert.ok(fs.existsSync('miniprogram'+timeline.imageUrl));
 const friend=p.onShareAppMessage();assert.ok(friend.path.endsWith('?mode=coffee'));assert.equal(friend.imageUrl,timeline.imageUrl);p.onHide();
 const invalid=loadPage('index',app());invalid.onLoad({mode:'invalid'});assert.equal(invalid.data.mode,'food');
});
test('calendar shares the selected date and its real photo, not an unrelated screenshot',()=>{
 const p=loadPage('calendar',app());p.onLoad({date:'2026-10-03'});
 const timeline=p.onShareTimeline();assert.equal(timeline.query,'date=2026-10-03');assert.equal(timeline.imageUrl,p.data.photo);assert.ok(timeline.title.includes(p.data.entry.text.slice(0,12)));
 assert.equal(p.onShareAppMessage().imageUrl,p.data.photo);
 p.select('2026-10-04');assert.equal(p.onShareTimeline().query,'date=2026-10-04');assert.equal(p.onShareTimeline().imageUrl,p.data.photo);
});

test('album denial has one recovery action and authorization resumes the pending save',()=>{
 let attempt=0;const messages=[];
 const p=loadPage('calendar',app(),{showToast:o=>messages.push(o.title),saveImageToPhotosAlbum:o=>{attempt++;if(attempt===1)o.fail({errMsg:'saveImageToPhotosAlbum:fail auth deny'});else o.success();o.complete();}});
 p.data.previewPath='/tmp/calendar.png';p.saveAlbum();
 assert.equal(p.data.albumDenied,true);assert.equal(p.data.previewVisible,true);assert.equal(p.data.saving,false);
 p.albumSettingsChanged({detail:{authSetting:{'scope.writePhotosAlbum':true}}});
 assert.equal(attempt,2);assert.equal(p.data.previewVisible,false);assert.equal(p.data.previewPath,'');assert.equal(messages.at(-1),'已保存到相册');
});
test('cancelled album save releases busy state without showing a permission error',()=>{
 const p=loadPage('calendar',app(),{showToast(){},saveImageToPhotosAlbum:o=>{o.fail({errMsg:'saveImageToPhotosAlbum:fail cancel'});o.complete();}});
 p.data.previewPath='/tmp/calendar.png';p.saveAlbum();
 assert.equal(p.data.albumDenied,false);assert.equal(p.data.previewVisible,false);assert.equal(p.data.saving,false);
});

test('calendar allocates short copy by measured height and gives long stories a scroll area',()=>{
 const p=loadPage('calendar',app(),{nextTick:fn=>fn(),getWindowInfo:()=>({windowHeight:600}),createSelectorQuery:()=>({in(){return this;},select(){return this;},boundingClientRect(fn){fn({height:155});return this;},exec(){}})});
 p.updateReadingLayout({text:'一句简短的话'});assert.equal(p.data.readingSize,'short');assert.equal(p.data.readingHeight,157);
 p.updateReadingLayout({text:'长'.repeat(90)});assert.equal(p.data.readingSize,'medium');
 p.updateReadingLayout({text:'故事',fullText:'完整故事'});assert.equal(p.data.readingSize,'long');assert.equal(p.data.readingHeight,0);
});
