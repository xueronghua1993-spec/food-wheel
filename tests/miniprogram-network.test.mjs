import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function platform(){const m=new Map();return {m,getStorageSync:k=>m.get(k)??'',setStorageSync:(k,v)=>m.set(k,v),removeStorageSync:k=>m.delete(k),getStorageInfoSync:()=>({keys:[...m.keys()]})};}
const session=(id='A',expired=false)=>({access_token:'token-'+id,refresh_token:'refresh-'+id,expires_at:expired?1:Math.floor(Date.now()/1000)+3600,user:{id,email:id+'@example.com'}});
function service(wx,request){assert.ok(fs.existsSync('miniprogram/utils/account.js'),'native account transport must exist');return require('../miniprogram/utils/account.js').createAccountService(wx,request,{autoSync:false});}
test('wx transport rejects network and HTTP failures without claiming success',async()=>{
 assert.ok(fs.existsSync('miniprogram/utils/request.js'),'wx request adapter must exist');
 const {createRequest}=require('../miniprogram/utils/request.js');let sent;
 const request=createRequest({request:o=>{sent=o;o.success({statusCode:400,data:{msg:'invalid'}});}});
 await assert.rejects(request('https://example.com',{method:'POST',data:{a:1}}),/invalid/);assert.equal(sent.timeout,10000);assert.equal(sent.method,'POST');
 await assert.rejects(createRequest({request:o=>o.fail({errMsg:'offline'})})('https://example.com'),/网络/);
});
test('email login upserts with RLS identity and delete filters; preserves guest data',async()=>{
 const wx=platform(),calls=[],tables={user_menus:[],user_todos:[]};const request=async(url,o={})=>{
  calls.push({url,...o});if(url.includes('/token'))return session();
  const table=url.includes('/user_menus')?'user_menus':'user_todos';
  if(o.method==='POST'){tables[table].push(o.data);return null;}
  if(o.method==='DELETE'){tables[table]=[];return null;}
  return tables[table];
 };
 const s=service(wx,request),key='personal-food-wheel-v1',day='daily-calendar-todos-v1:2026-10-10';
 s.store.setItem(key,'["面","饭"]');await s.login('A@example.com','password123');
 assert.equal(s.store.owner,'A');assert.equal(s.store.getItem(key),null);
 s.store.setItem(key,'["饺子","火锅"]');s.store.setItem(day,JSON.stringify([{id:'one',text:'散步',done:false}]));await s.sync();
 const menus=calls.find(x=>x.method==='POST'&&x.url.includes('/user_menus'));
 assert.equal(menus.data.user_id,'A');assert.equal(menus.header.Authorization,'Bearer token-A');assert.match(menus.url,/on_conflict=user_id%2Cmode/);assert.match(menus.header.Prefer,/merge-duplicates/);
 s.store.setItem(day,'[]');await s.sync();assert.ok(calls.some(x=>x.method==='DELETE'&&x.url.includes('user_id=eq.A')&&x.url.includes('id=eq.one')));
 s.logout();assert.equal(s.store.getItem(key),'["面","饭"]');assert.equal(s.state().user,null);
});
test('offline writes survive service reload then upload on recovery',async()=>{
 const wx=platform();let offline=false;
 const request=async(url)=>{if(offline)throw Error('offline');if(url.includes('/token'))return session();return [];};
 const s=service(wx,request);await s.login('A@example.com','password123');offline=true;s.store.setItem('personal-food-wheel-v1','["面","饭"]');
 assert.equal(await s.sync(),false);assert.equal(s.store.pending('A').length,1);assert.match(s.state().status,/尚未同步/);
 const reload=service(wx,request);await reload.restore();assert.equal(reload.store.getItem('personal-food-wheel-v1'),'["面","饭"]');
 offline=false;await reload.sync();assert.equal(reload.store.pending('A').length,0);
});
test('expired sessions refresh once before concurrent authenticated requests',async()=>{
 const wx=platform();wx.setStorageSync('mini-session-v1',JSON.stringify(session('A',true)));const calls=[];
 const s=service(wx,async(url,o={})=>{calls.push({url,...o});if(url.includes('grant_type=refresh_token'))return session();return [];});
 await s.restore();assert.equal(calls.filter(x=>x.url.includes('grant_type=refresh_token')).length,1);
 assert.ok(calls.filter(x=>x.url.includes('/rest/')).every(x=>x.header.Authorization==='Bearer token-A'));
});
test('logout during refresh does not resurrect an old user or session',async()=>{
 const wx=platform();wx.setStorageSync('mini-session-v1',JSON.stringify(session('A',true)));let release,started;
 const start=new Promise(r=>started=r);
 const s=service(wx,url=>{if(url.includes('/token')){started();return new Promise(r=>release=r);}return Promise.resolve([]);});
 const pending=s.restore();await start;s.logout();release(session());await pending;
 assert.equal(s.state().user,null);assert.equal(s.store.owner,null);assert.equal(wx.getStorageSync('mini-session-v1'),'');
});
test('email confirmation registration has no session; recovery stays on H5',async()=>{
 const wx=platform(),calls=[];const s=service(wx,async(url,o)=>{calls.push({url,...o});return {user:{id:'unconfirmed'}};});
 const response=await s.signup('a@example.com','password123');assert.equal(response.verify,true);assert.equal(s.state().user,null);
 await s.reset('a@example.com');assert.ok(calls.every(x=>x.url.includes('redirect_to=https%3A%2F%2Fxueronghua1993-spec.github.io%2Ffood-wheel%2F')));
});
test('guest import cannot queue a menu before cloud reads succeed',async()=>{
 const wx=platform();let offline=true;const menus=[{mode:'food',items:['汉堡','火锅']}],writes=[];
 const s=service(wx,async(url,o={})=>{
  if(url.includes('/token'))return session();if(offline)throw Error('offline');
  if(o.method==='POST'){writes.push(o);return null;}return url.includes('user_menus')?menus:[];
 });
 s.store.setItem('personal-food-wheel-v1','["面","饭"]');await s.login('A@example.com','password123');
 await assert.rejects(s.importGuest(),/读取|同步/);assert.equal(s.store.pending('A').length,0);assert.equal(s.state().importNeeded,true);
 offline=false;await s.importGuest();assert.equal(writes.length,0);assert.equal(s.store.getItem('personal-food-wheel-v1'),'["汉堡","火锅"]');
});
test('guest menu inserts never overwrite a menu created after the initial cloud read',async()=>{
 const wx=platform(),writes=[];let remote=[];
 const s=service(wx,async(url,o={})=>{
  if(url.includes('/token'))return session();
  if(o.method==='POST'){writes.push(o);remote=[{mode:'food',items:['汉堡','火锅']}];return null;}
  return url.includes('user_menus')?remote:[];
 });
 s.store.setItem('personal-food-wheel-v1','["面","饭"]');await s.login('A@example.com','password123');await s.importGuest();
 assert.match(writes[0].header.Prefer,/resolution=ignore-duplicates/);
 assert.equal(s.store.getItem('personal-food-wheel-v1'),'["汉堡","火锅"]');
});
