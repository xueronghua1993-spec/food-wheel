const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve('public'),db={user_menus:[],user_todos:[]};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/mock'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const q=JSON.parse(Buffer.concat(chunks).toString());
  let rows=db[q.table];
  if(q.op==='upsert'){const row=q.row,index=rows.findIndex(x=>q.table==='user_menus'?x.user_id===row.user_id&&x.mode===row.mode:x.id===row.id);if(index<0)rows.push(row);else rows[index]=row;}
  if(q.op==='delete')db[q.table]=rows.filter(x=>!Object.entries(q.filters).every(([k,v])=>x[k]===v));
  rows=db[q.table].filter(x=>Object.entries(q.filters).every(([k,v])=>x[k]===v));
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:rows.slice(q.start||0,(q.end??999)+1),error:null}));return;
 }
 const file=path.join(root,url.pathname==='/'?'index.html':url.pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.jpg':'image/jpeg'})[path.extname(file)]||'text/plain');res.end(data);});
});
const adapter=`
export function makeClient(){
 let callback,session=JSON.parse(localStorage.getItem('mock-session')||'null');
 const notify=(event)=>callback?.(event,session);
 window.mockAuth={emit:event=>notify(event),calls:[]};
 return {auth:{
  onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}};},
  async getSession(){return {data:{session},error:null};},
  async signInWithPassword({email,password}){if(password!=='password123')return {error:{code:'invalid_credentials'}};session={user:{id:email==='b@test.example'?'B':'A',email}};localStorage.setItem('mock-session',JSON.stringify(session));notify('SIGNED_IN');return {data:{session},error:null};},
  async signOut(){session=null;localStorage.removeItem('mock-session');notify('SIGNED_OUT');return {error:null};},
  async signUp(value){window.mockAuth.calls.push({kind:'signup',...value});return {data:{},error:null};},
  async resetPasswordForEmail(email,options){window.mockAuth.calls.push({kind:'reset',email,options});return {data:{},error:null};},
  async updateUser(value){window.mockAuth.calls.push({kind:'password',...value});return {data:{},error:null};}
 },from(table){
  const q={table,filters:{},op:'select'};const builder={
   select(){return builder;},eq(k,v){q.filters[k]=v;return builder;},order(){return builder;},range(start,end){Object.assign(q,{start,end});return builder;},
   upsert(row){Object.assign(q,{op:'upsert',row});return builder;},delete(){q.op='delete';return builder;},
   then(resolve,reject){if(window.mockOffline)return Promise.reject(Error('offline')).then(resolve,reject);return fetch('/mock',{method:'POST',body:JSON.stringify(q)}).then(r=>r.json()).then(resolve,reject);}
  };return builder;
 }};
}`;
async function prepare(browser,base){
 const ctx=await browser.newContext({viewport:{width:390,height:720},isMobile:true});
 await ctx.route('**/supabase-client.mjs*',r=>r.fulfill({contentType:'text/javascript',body:adapter}));
 await ctx.route('https://www.clarity.ms/**',r=>r.abort());
 await ctx.route('https://ipwho.is/**',r=>r.abort());
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.waitForFunction(()=>!!window.mockAuth&&document.querySelector('#calendar-mini-text').textContent!=='正在翻开今天的一页…');
 return {ctx,page,errors};
}
async function login(page,email='a@test.example'){
 await page.click('#account-open');await page.click('#account-login');await page.fill('#account-email',email);await page.fill('#account-password','password123');await page.click('#account-submit');
 await page.waitForFunction(()=>document.querySelector('#account-status').textContent==='已同步到账号。');
}
async function closeAccount(page){await page.click('#account-close');}
async function edit(page,a,b){
 await page.click('#edit');await page.locator('#rows input').nth(0).fill(a);await page.locator('#rows input').nth(1).fill(b);await page.click('#form button[type=submit]');
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 for(const engine of [chromium,webkit]){
  db.user_menus=[];db.user_todos=[];
  const browser=await engine.launch({headless:true});
  const one=await prepare(browser,base),two=await prepare(browser,base);
  try{
   await edit(one.page,'游客面','游客饭');await login(one.page);
   await one.page.click('#account-import');await one.page.waitForFunction(()=>document.querySelector('#account-status').textContent==='已同步到账号。');await closeAccount(one.page);
   assert.match(await one.page.locator('#wheel').getAttribute('aria-label'),/游客面/);
   await edit(one.page,'云端面','云端饭');
   await one.page.waitForFunction(()=>document.querySelector('#account-status').textContent==='已同步到账号。');
   await one.page.click('#calendar-open');await one.page.click('#calendar-view-todos');await one.page.fill('#todo-input','云端读书');await one.page.click('#todo-form button');
   await one.page.waitForFunction(()=>document.querySelector('#account-status').textContent==='已同步到账号。');await one.page.click('#calendar-detail-close');
   await login(two.page);await closeAccount(two.page);assert.match(await two.page.locator('#wheel').getAttribute('aria-label'),/云端面/);
   await two.page.click('#calendar-open');await two.page.click('#calendar-view-todos');assert.equal(await two.page.locator('#todo-list li').textContent(),'云端读书删除');await two.page.click('#calendar-detail-close');
   await one.page.evaluate(()=>window.mockOffline=true);await edit(one.page,'离线面','离线饭');
   await one.page.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('尚未同步'));
   await one.page.reload();await one.page.waitForFunction(()=>window.appStore?.owner==='A');
   assert.match(await one.page.locator('#wheel').getAttribute('aria-label'),/离线面/);
   await one.page.click('#account-open');await one.page.click('#account-logout');
   await one.page.waitForFunction(()=>window.appStore.owner===null);await closeAccount(one.page);
   assert.match(await one.page.locator('#wheel').getAttribute('aria-label'),/游客面/);
   await login(one.page,'b@test.example');await closeAccount(one.page);assert.doesNotMatch(await one.page.locator('#wheel').getAttribute('aria-label'),/离线面|游客面/);
   await one.page.click('#calendar-open');await one.page.click('#calendar-view-todos');assert.equal(await one.page.locator('#todo-list li').count(),0);await one.page.click('#calendar-detail-close');
   await one.page.click('#account-open');await one.page.click('#account-logout');await one.page.waitForFunction(()=>window.appStore.owner===null);
   await one.page.fill('#account-email','a@test.example');await one.page.fill('#account-password','wrongpass');await one.page.click('#account-submit');await one.page.waitForFunction(()=>document.querySelector('#account-message').textContent.includes('不正确'));
   await one.page.click('#account-signup');await one.page.fill('#account-password','password123');await one.page.click('#account-submit');await one.page.waitForFunction(()=>window.mockAuth.calls.some(x=>x.kind==='signup'));
   await one.page.click('#account-forgot');await one.page.click('#account-submit');await one.page.waitForFunction(()=>window.mockAuth.calls.some(x=>x.kind==='reset'));
   assert.ok((await one.page.evaluate(()=>window.mockAuth.calls)).every(x=>(x.options?.redirectTo||x.options?.emailRedirectTo)==='https://xueronghua1993-spec.github.io/food-wheel/'));
   await closeAccount(one.page);await login(one.page);await closeAccount(one.page);
   await one.page.evaluate(()=>window.mockAuth.emit('PASSWORD_RECOVERY'));await one.page.waitForFunction(()=>document.querySelector('#account-confirm').required);
   await one.page.fill('#account-password','newpassword123');await one.page.fill('#account-confirm','newpassword123');await one.page.click('#account-submit');
   await one.page.waitForFunction(()=>window.mockAuth.calls.some(x=>x.kind==='password'));
   await one.page.screenshot({path:'public/screenshots/account-'+engine.name()+'.png'});
   assert.deepEqual(one.errors,[]);assert.deepEqual(two.errors,[]);
  }finally{await one.ctx.close();await two.ctx.close();await browser.close();}
 }
 // Check the shipped, real SDK against mocked HTTP, independently of the UI adapter.
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.route('https://www.clarity.ms/**',r=>r.abort());
  await page.route('https://ipwho.is/**',r=>r.abort());
  const uid='11111111-1111-4111-8111-111111111111',email='sdk@test.example';
  const payload={sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600};
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.mock';
  await page.route('https://scmqmdqwlrtlydehsvlo.supabase.co/auth/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url());
   const user={id:uid,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:new Date().toISOString()};
   if(url.pathname.endsWith('/token')){
    const body=request.postDataJSON();
    if(body.password!=='password123'){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error_code:'invalid_credentials',msg:'Invalid login credentials'})});return;}
    await route.fulfill({contentType:'application/json',body:JSON.stringify({access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'mock-refresh',user})});return;
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify({user})});
  });
  let sdkMenus=[];
  await page.route('https://scmqmdqwlrtlydehsvlo.supabase.co/rest/v1/**',async route=>{
   const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').pop();
   if(request.method()==='GET'){assert.equal(url.searchParams.get('user_id'),'eq.'+uid);await route.fulfill({contentType:'application/json',body:JSON.stringify(table==='user_menus'?sdkMenus:[])});return;}
   assert.equal(request.method(),'POST');const row=request.postDataJSON();assert.equal(row.user_id,uid);assert.equal(table,'user_menus');sdkMenus=[row];
   await route.fulfill({status:201,contentType:'application/json',body:''});
  });
  await page.goto(base);await page.click('#account-open');await page.fill('#account-email',email);await page.fill('#account-password','wrongpass');await page.click('#account-submit');
  await page.waitForFunction(()=>document.querySelector('#account-message').textContent.includes('不正确'));
  await page.fill('#account-password','password123');await page.click('#account-submit');
  await page.waitForFunction(()=>document.querySelector('#account-status').textContent==='已同步到账号。');
  await closeAccount(page);await edit(page,'SDK面','SDK饭');
  await page.waitForFunction(()=>document.querySelector('#account-status').textContent==='已同步到账号。');
  assert.match(await page.locator('#wheel').getAttribute('aria-label'),/SDK面/);
  await page.click('#account-open');await page.click('#account-logout');await page.waitForFunction(()=>window.appStore.owner===null);
  assert.deepEqual(errors,[]);
  console.log('PASS: bundled official SDK login/error parsing, owner-filtered reads, menu upsert and local logout against mocked HTTP');
 }finally{await browser.close();}
 console.log('PASS: Chromium/WebKit mocked auth, two-device sync, pending retry after reload, guest import, logout isolation, signup/reset/recovery UI. No real email sent or live database changed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
