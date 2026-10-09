const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(process.env.CALENDAR_ROOT||'.');
const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const filename=path.join(root,rel==='/'?'index.html':rel);if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(filename)]||'text/plain');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});try{
for(const [width,height] of [[320,568],[375,600],[393,720],[430,800]]){
 const p=await browser.newPage({viewport:{width,height},isMobile:true});await p.route('https://www.clarity.ms/**',r=>r.abort());const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-15T04:00:00Z')});await p.goto(base);await p.waitForSelector('#calendar-card',{timeout:5000});
 assert.equal(await p.locator('#calendar-panel').isVisible(),true);await p.waitForFunction(()=>document.querySelector('#calendar-date').textContent.includes('2026年10月15日'));
 assert.equal(await p.locator('#calendar-photo').evaluate(x=>x.complete&&x.naturalWidth>0),true);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.click('#calendar-prev');assert.match(await p.locator('#calendar-date').textContent(),/10月14日/);await p.click('#calendar-today');assert.match(await p.locator('#calendar-date').textContent(),/10月15日/);
 await p.goto(base+'/?date=2026-10-11');await p.waitForFunction(()=>document.querySelector('#calendar-text').textContent.length>0);assert.equal(await p.locator('#calendar-story').isVisible(),true);await p.locator('#calendar-story summary').click();assert.equal(await p.locator('#calendar-full').isVisible(),true);
 await p.click('#calendar-save');await p.waitForSelector('#calendar-preview[open]');const output=await p.locator('#calendar-output').getAttribute('src');assert.match(output,/^blob:/);assert.equal(await p.locator('#calendar-output').evaluate(async x=>{await x.decode();return x.naturalWidth;}),1080);
 if(width===393){await p.locator('#calendar-output').screenshot({path:'/tmp/calendar-export-preview.png'});await p.click('#calendar-preview-close');await p.goto(base+'/?date=2026-10-09');await p.waitForFunction(()=>document.querySelector('#calendar-text').textContent.length>0);await p.screenshot({path:'/tmp/calendar-mobile-preview.png',fullPage:true});}else await p.click('#calendar-preview-close');
 await p.click('#view-decisions');await p.click('#edit');assert.equal(await p.locator('#editor').isVisible(),true);await p.click('#cancel');await p.click('#coffee');assert.match(await p.locator('#heading').textContent(),/咖啡/);await p.click('#spin');await p.clock.fastForward(6000);assert.equal(await p.locator('#result').isVisible(),true);assert.equal(await p.locator('#result').evaluate(x=>getComputedStyle(x).textAlign),'center');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log(`PASS: ${width}×${height} navigation, story, PNG export and wheel`);await p.close();
}
// Boundary and failure modes use the actual browser rather than DOM stubs.
const boundary=await browser.newPage({viewport:{width:393,height:720}});
await boundary.route('https://www.clarity.ms/**',r=>r.abort());await boundary.clock.install({time:new Date('2026-10-09T15:59:50Z')});await boundary.goto(base);
await boundary.waitForFunction(()=>document.querySelector('#calendar-date').textContent.includes('10月9日'));
await boundary.clock.fastForward(40000);assert.match(await boundary.locator('#calendar-date').textContent(),/10月10日/);
await boundary.goto(base+'/?date=2026-10-09');await boundary.waitForFunction(()=>document.querySelector('#calendar-text').textContent.length>0);
await boundary.clock.fastForward(86400000);assert.match(await boundary.locator('#calendar-date').textContent(),/10月9日/);
await boundary.goto(base+'/?date=2026-10-20');await boundary.waitForFunction(()=>document.querySelector('#calendar-date').textContent.includes('10月11日'));
await boundary.evaluate(()=>{const styles=[...document.querySelectorAll('.app-header *,#calendar-panel *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const [e,size]of styles)e.style.fontSize=size*2+'px';});
assert.ok(await boundary.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'200% text creates horizontal overflow');await boundary.close();
const fallback=await browser.newPage({viewport:{width:393,height:720}});
await fallback.addInitScript(()=>{window.calendarDrawnText=[];const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.calendarDrawnText.push(String(text));return draw.call(this,text,...args);};});
await fallback.route('https://www.clarity.ms/**',r=>r.abort());await fallback.clock.install({time:new Date('2026-10-09T04:00:00Z')});await fallback.route('**/calendar/assets/autumn.jpg*',r=>r.abort());await fallback.goto(base);
await fallback.waitForFunction(()=>document.querySelector('#calendar-photo').src.includes('fallback.jpg')&&document.querySelector('#calendar-photo').naturalWidth>0);
await fallback.click('#calendar-save');await fallback.waitForSelector('#calendar-preview[open]');assert.ok(await fallback.evaluate(()=>window.calendarDrawnText.some(t=>t.includes('备用画面'))),'fallback export must not credit absent photo');await fallback.click('#calendar-preview-close');
await fallback.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('clipboard denied');};});await fallback.click('#calendar-share');assert.equal(await fallback.locator('#calendar-share-fallback').isVisible(),true);await fallback.close();
const broken=await browser.newPage();await broken.route('https://www.clarity.ms/**',r=>r.abort());await broken.route('**/calendar/content.json*',r=>r.fulfill({status:500,body:'error'}));await broken.goto(base);
await broken.waitForFunction(()=>document.querySelector('#calendar-status').textContent.includes('暂时'));
await broken.click('#view-decisions');assert.equal(await broken.locator('#spin').isVisible(),true);await broken.close();
console.log('PASS: midnight update, stable historical date, invalid/future link, 200% text, image fallback/export, clipboard fallback and content failure');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
