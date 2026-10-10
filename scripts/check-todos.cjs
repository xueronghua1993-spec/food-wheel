const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve('public');
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname;
 const file=path.join(root,name==='/'?'index.html':name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(data);
 });
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 fs.mkdirSync('public/screenshots',{recursive:true});
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try{for(const width of [320,390,430]){
   const page=await browser.newPage({viewport:{width,height:720},isMobile:true});
   await page.route('https://www.clarity.ms/**',r=>r.abort());
   await page.clock.install({time:new Date('2026-10-10T04:00:00Z')});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await page.waitForFunction(()=>document.getElementById('calendar-mini-text').textContent!=='正在翻开今天的一页…');
   await page.click('#calendar-open');await page.click('#calendar-view-todos');
   await page.fill('#todo-input',' 读十页书 ');await page.click('#todo-form button');
   assert.equal(await page.locator('#todo-list li').count(),1);
   await page.locator('#todo-list input').check();assert.match(await page.locator('#todo-count').textContent(),/1\/1/);
   await page.reload();await page.click('#calendar-open');await page.click('#calendar-view-todos');
   assert.equal(await page.locator('#todo-list input').isChecked(),true);
   await page.click('#calendar-prev');assert.equal(await page.locator('#todo-list li').count(),0);assert.equal(await page.locator('#todo-form').isVisible(),false);
   await page.click('#calendar-today');assert.equal(await page.locator('#todo-list li').count(),1);
   await page.fill('#todo-input','<img src=x onerror=alert(1)>');await page.click('#todo-form button');
   assert.equal(await page.locator('#todo-list img').count(),0);
   await page.locator('#todo-list li').last().locator('button').click();
   await page.screenshot({path:'public/screenshots/todos-'+engine.name()+'-'+width+'.png'});
   assert.ok(await page.evaluate(()=>document.getElementById('calendar-todos').scrollWidth<=document.getElementById('calendar-todos').clientWidth),'todo pane overflow');
   await page.clock.fastForward(86400000);assert.equal(await page.locator('#todo-list li').count(),0);assert.match(await page.locator('#todo-date').textContent(),/2026-10-11/);
   await page.click('#calendar-view-paper');assert.equal(await page.locator('#calendar-card').isVisible(),true);
   await page.click('#calendar-detail-close');await page.click('#coffee');assert.match(await page.locator('#heading').textContent(),/咖啡/);
   assert.deepEqual(errors,[]);await page.close();
  }}finally{await browser.close();}
 }
 console.log('PASS: Chromium/WebKit todos add, complete, reload, history, delete, midnight, safe text and mobile layout');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
