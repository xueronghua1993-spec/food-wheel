import {createAccountStore} from './account-store.mjs';
const $=id=>document.getElementById(id);
let client,clientPromise,user=null,epoch=0,syncing=null,timer,authBusy=false,screen='login',recovery=false;
const siteURL='https://xueronghua1993-spec.github.io/food-wheel/';
const disk={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),key:i=>localStorage.key(i),get length(){return localStorage.length;}};
const store=createAccountStore(disk,()=>{
 if(store.owner){status('修改已保存在此浏览器，等待同步。');clearTimeout(timer);timer=setTimeout(()=>sync(),400);}
});
window.appStore=store;
function status(message){$('account-status').textContent=message;$('account-open').title=message;}
function message(text){$('account-message').textContent=text;}
function view(next){
 screen=next;const logged=!!user;
 $('account-guest').hidden=logged&&!recovery;$('account-member').hidden=!logged||recovery;
 $('account-tabs').hidden=recovery;
 $('account-email-label').hidden=recovery;$('account-email').hidden=recovery;$('account-email').required=!recovery;
 $('account-password-label').hidden=next==='reset';$('account-password').hidden=next==='reset';$('account-password').required=next!=='reset';
 $('account-password').autocomplete=next==='signup'||next==='password'?'new-password':'current-password';
 $('account-confirm-label').hidden=next!=='password';$('account-confirm').hidden=next!=='password';$('account-confirm').required=next==='password';
 $('account-forgot').hidden=next==='password';
 $('account-submit').textContent=({login:'登录并同步',signup:'注册账号',reset:'发送重置邮件',password:'保存新密码'})[next];
 for(const name of ['login','signup'])$('account-'+name).setAttribute('aria-pressed',String(name===next));
 $('account-email').disabled=authBusy;$('account-password').disabled=authBusy;$('account-submit').disabled=authBusy;
 $('account-user').textContent=user?.email||'';
 $('account-open').setAttribute('aria-label',logged?'账户与同步':'登录，可选');
 document.querySelector('.todo-note').textContent=store.owner?'登录后同步到此账号；离线修改会在联网后重试。':'保存在当前浏览器；登录后可跨设备同步。';
}
function refresh(){window.dispatchEvent(new Event('personal-data-change'));view(screen);}
async function ready(){
 if(client)return client;
 if(!clientPromise)clientPromise=import('./supabase-client.mjs').then(({makeClient})=>{
  client=makeClient();
  // Do not await SDK methods inside its auth callback (the SDK holds a lock).
  client.auth.onAuthStateChange((event,session)=>setTimeout(()=>{
   if(event==='PASSWORD_RECOVERY'){recovery=true;view('password');$('account-dialog').showModal();}
   if(['SIGNED_IN','SIGNED_OUT','INITIAL_SESSION','USER_UPDATED','PASSWORD_RECOVERY'].includes(event))setUser(session?.user||null);
  },0));
  return client;
 }).catch(error=>{clientPromise=null;throw error;});
 return clientPromise;
}
async function waitSafe(){
 while(window.decisionBusy?.()||$('editor').open)await new Promise(resolve=>setTimeout(resolve,100));
}
async function setUser(next){
 if(next?.id===user?.id)return;
 const current=++epoch;user=next;view(recovery?'password':'login');message('');
 await waitSafe();if(current!==epoch)return;
 store.use(null);refresh();
 $('account-import-box').hidden=true;
 if(!next){status('游客模式：仅保存在此浏览器。');return;}
 status('正在读取账号数据…');await sync();
}
async function rows(table,id){
 const all=[];for(let start=0;;start+=1000){
  const {data,error}=await client.from(table).select('*').eq('user_id',id).order(table==='user_menus'?'mode':'id').range(start,start+999);
  if(error)throw error;all.push(...data);if(data.length<1000)return all;
 }
}
async function send(op){
 let query;
 if(op.type==='menu')query=client.from('user_menus').upsert(op.row,{onConflict:'user_id,mode'});
 else if(op.type==='todo')query=client.from('user_todos').upsert(op.row,{onConflict:'id'});
 else query=client.from('user_todos').delete().eq('user_id',op.row.user_id).eq('id',op.row.id);
 const {error}=await query;if(error)throw error;
}
async function sync(){
 const id=user?.id,current=epoch;if(!id)return;
 if(syncing){await syncing;if(current===epoch&&id===user?.id&&store.owner!==id)return sync();return;}
 const task=(async()=>{
  try{
   status('正在同步…');await ready();await store.flush(id,send);
   const [menus,todos]=await Promise.all([rows('user_menus',id),rows('user_todos',id)]);
   if(current!==epoch)return;
   await waitSafe();if(current!==epoch)return;
   store.replace(id,menus,todos);if(store.owner!==id)store.use(id);
   refresh();status(store.pending(id).length?'部分修改尚未上传，请重试。':'已同步到账号。');
   $('account-import-box').hidden=disk.getItem('account-import-choice-v1:'+id)==='done';
  }catch(error){
   if(current===epoch){status(store.owner?'修改保留在此浏览器，尚未同步。':'账号数据未能加载，暂时继续游客模式。');message('同步失败，请稍后点击“刷新同步”。');}
  }
 })();
 syncing=task;try{await task;}finally{if(syncing===task)syncing=null;if(current===epoch&&store.owner===id&&store.pending(id).length){clearTimeout(timer);timer=setTimeout(()=>sync(),15000);}}
}
for(const name of ['login','signup'])$('account-'+name).onclick=()=>{recovery=false;view(name);message('');};
$('account-forgot').onclick=()=>{view('reset');message('输入注册时的邮箱。');};
$('account-sync').onclick=()=>sync();
$('account-import').onclick=async()=>{
 const id=user?.id;if(!id||store.owner!==id)return;
 try{store.importGuest(id);disk.setItem('account-import-choice-v1:'+id,'done');$('account-import-box').hidden=true;refresh();await sync();}
 catch{message('导入未能保存，请检查浏览器存储后重试。');}
};
$('account-skip').onclick=()=>{
 if(!user)return;
 try{disk.setItem('account-import-choice-v1:'+user.id,'done');$('account-import-box').hidden=true;}
 catch{message('无法保存选择，请重试。');}
};
$('account-logout').onclick=async()=>{
 if(authBusy)return;
 if(user&&store.pending(user.id).length&&!confirm('部分修改尚未同步。退出后会保留在此浏览器，下次登录可重试。继续退出？'))return;
 authBusy=true;
 try{const sdk=await ready();const {error}=await sdk.auth.signOut({scope:'local'});if(error)throw error;await setUser(null);message('已退出，回到游客模式。');}
 catch{message('退出失败，请重试。');}
 finally{authBusy=false;view('login');}
};
$('account-form').onsubmit=async event=>{
 event.preventDefault();if(authBusy)return;
 const email=$('account-email').value.trim(),password=$('account-password').value;
 if(screen!=='reset'&&Array.from(password).length<8){message('密码至少需要 8 个字符。');return;}
 if(screen==='password'&&password!==$('account-confirm').value){message('两次输入的密码不一致。');return;}
 authBusy=true;view(screen);message('正在处理…');
 try{
  const sdk=await ready();let response;
  if(screen==='login')response=await sdk.auth.signInWithPassword({email,password});
  if(screen==='signup')response=await sdk.auth.signUp({email,password,options:{emailRedirectTo:siteURL}});
  if(screen==='reset')response=await sdk.auth.resetPasswordForEmail(email,{redirectTo:siteURL});
  if(screen==='password')response=await sdk.auth.updateUser({password});
  if(response.error)throw response.error;
  if(screen==='signup')message('请查看验证邮件，点击链接后返回登录。');
  else if(screen==='reset')message('如该邮箱已注册，请查看重置密码邮件。');
  else if(screen==='password'){recovery=false;view('login');message('密码已更新。');}
  else message('登录成功，正在读取你的数据。');
 }catch(error){
  const code=error.code||'';
  message(code==='invalid_credentials'?'邮箱或密码不正确。':code==='email_not_confirmed'?'请先点击邮箱中的验证链接。':code.includes('rate_limit')?'操作过于频繁，请稍后再试。':'暂时无法完成，请检查网络或稍后重试。');
 }finally{authBusy=false;$('account-password').value='';$('account-confirm').value='';view(screen);}
};
window.addEventListener('online',()=>sync());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
view('login');status('游客模式：仅保存在此浏览器。');
ready().then(async sdk=>{
 const {data,error}=await sdk.auth.getSession();if(error)throw error;await setUser(data.session?.user||null);
}).catch(()=>status('登录服务暂时不可用，游客功能仍可使用。'));
