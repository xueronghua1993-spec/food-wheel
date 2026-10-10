const {createStorage}=require('./storage'),{createRequest,query}=require('./request');
const {createAccountStore}=require('../generated/account-store'),config=require('../config');
function createAccountService(platform,request=createRequest(platform),options={}){
 const disk=createStorage(platform),listeners=new Set();
 let session=null,epoch=0,syncing=null,refreshing=null,timer=null,importing=null,status='游客模式：仅保存在此设备。';
 const state=()=>({user:session?.user||null,status,pending:session?store.pending(session.user.id).length:0,importNeeded:!!session&&disk.getItem('account-import-choice-v1:'+session.user.id)!=='done'});
 const notify=()=>{for(const listener of listeners)listener(state());};
 const setStatus=text=>{status=text;notify();};
 const accountDisk={
  getItem:disk.getItem,key:disk.key,get length(){return disk.length;},
  setItem(key,value){
   // Persist import provenance in the same atomic snapshot as its queue.
   if(importing&&key==='account-data-v1:'+importing.id){
    const snapshot=JSON.parse(value);
    for(const op of snapshot.queue)if(op.type==='menu'&&!importing.before.has(op.token))op.importOnly=true;
    value=JSON.stringify(snapshot);
   }
   disk.setItem(key,value);
  }
 };
 const store=createAccountStore(accountDisk,()=>{
  if(store.owner){status='修改已保存在此设备，尚未同步。';clearTimeout(timer);if(options.autoSync!==false)timer=setTimeout(()=>sync(),500);}
  notify();
 });
 function check(generation){if(epoch!==generation||!session)throw Error('账号已切换，请重新操作。');}
 function saveSession(value,generation){
  if(generation!==epoch)throw Error('账号已切换，请重新操作。');
  if(!value.access_token||!value.refresh_token||!value.user?.id)throw Error('登录响应不完整，请重试。');
  const next={...value,expires_at:value.expires_at||Math.floor(Date.now()/1000)+(value.expires_in||3600)};
  disk.setItem('mini-session-v1',JSON.stringify(next));session=next;
 }
 const publicHeader=()=>({apikey:config.supabaseKey,'Content-Type':'application/json'});
 async function auth(path,data){return request(config.supabaseURL+'/auth/v1/'+path,{method:'POST',data,header:publicHeader()});}
 async function token(generation,force=false){
  check(generation);
  if(!force&&session.expires_at>Math.floor(Date.now()/1000)+60)return session.access_token;
  if(!refreshing){
   const current=session.refresh_token;
   const task=(async()=>{
    try{saveSession(await auth('token?grant_type=refresh_token',{refresh_token:current}),generation);}
    catch(error){if(generation===epoch&&[400,401,403].includes(error.status)){logout();setStatus('登录已过期，请重新登录；未上传修改保留在此设备。');}throw error;}
   })();refreshing=task;task.finally(()=>{if(refreshing===task)refreshing=null;}).catch(()=>{});
  }
  await refreshing;check(generation);return session.access_token;
 }
 async function rest(path,opts,generation){
  let access=await token(generation);
  const send=()=>request(config.supabaseURL+'/rest/v1/'+path,{...opts,header:{...publicHeader(),Authorization:'Bearer '+access,...opts?.header}});
  try{const data=await send();check(generation);return data;}
  catch(error){if(error.status!==401)throw error;access=await token(generation,true);const data=await send();check(generation);return data;}
 }
 async function rows(table,id,generation){
  const all=[];
  for(let start=0;;start+=1000){
   const data=await rest(table+'?'+query({select:'*',user_id:'eq.'+id,order:table==='user_menus'?'mode.asc':'id.asc',offset:start,limit:1000}),{},generation);
   if(!Array.isArray(data))throw Error('云端数据格式异常。');all.push(...data);if(data.length<1000)return all;
  }
 }
 async function sync(){
  if(!session)return false;
  if(syncing){await syncing;if(!session)return false;return sync();}
  const id=session.user.id,generation=epoch;
  const task=(async()=>{
   try{
    setStatus('正在同步…');
    await store.flush(id,async op=>{
     check(generation);
     if(op.type==='deleteTodo')await rest('user_todos?'+query({user_id:'eq.'+id,id:'eq.'+op.row.id}),{method:'DELETE'},generation);
     else await rest((op.type==='menu'?'user_menus':'user_todos')+'?'+query({on_conflict:op.type==='menu'?'user_id,mode':'id'}),{method:'POST',data:op.row,header:{Prefer:'resolution='+(op.importOnly?'ignore':'merge')+'-duplicates,return=minimal'}},generation);
    });
    const [menus,todos]=await Promise.all([rows('user_menus',id,generation),rows('user_todos',id,generation)]);
    check(generation);store.replace(id,menus,todos);setStatus(store.pending(id).length?'修改保留在此设备，尚未同步。':'已同步到账号。');return true;
   }catch(error){if(generation===epoch)setStatus('修改保留在此设备，尚未同步。请刷新重试。');return false;}
  })();
  syncing=task;try{return await task;}finally{if(syncing===task)syncing=null;}
 }
 async function accept(value,generation){saveSession(value,generation);store.use(session.user.id);await sync();}
 async function restore(){
  try{const raw=disk.getItem('mini-session-v1');if(!raw)return;
   const saved=JSON.parse(raw);if(!saved.user?.id||!saved.access_token||!saved.refresh_token)throw Error('invalid session');
   session=saved;epoch++;store.use(saved.user.id);await sync();
  }catch{session=null;store.use(null);setStatus('登录信息未能读取，请重新登录。');}
 }
 function logout(){epoch++;clearTimeout(timer);session=null;refreshing=null;disk.removeItem('mini-session-v1');store.use(null);setStatus('游客模式：仅保存在此设备。');}
 return {
  store,state,restore,sync,logout,
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  suspend(){clearTimeout(timer);},
  async login(email,password){const generation=++epoch;await accept(await auth('token?grant_type=password',{email,password}),generation);},
  async signup(email,password){
   const generation=++epoch,value=await auth('signup?'+query({redirect_to:config.siteURL}),{email,password});
   if(generation!==epoch)throw Error('账号已切换。');
   if(value.access_token){await accept(value,generation);return {verify:false};}return {verify:true};
  },
  reset(email){return auth('recover?'+query({redirect_to:config.siteURL}),{email});},
  async importGuest(){
   if(!session)return;const id=session.user.id,generation=epoch;
   if(!await sync())throw Error('导入前未能读取云端数据，请同步成功后重试。');
   check(generation);
   importing={id,before:new Set(store.pending(id).map(op=>op.token))};
   try{store.importGuest(id);}finally{importing=null;}
   disk.setItem('account-import-choice-v1:'+id,'done');notify();return sync();
  },
  skipImport(){if(session){disk.setItem('account-import-choice-v1:'+session.user.id,'done');notify();}}
 };
}
module.exports={createAccountService};
