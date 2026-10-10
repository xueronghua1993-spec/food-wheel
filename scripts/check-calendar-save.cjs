const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
const path=require('node:path'),http=require('node:http');const root=path.resolve(process.env.CALENDAR_ROOT||'public');const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.jpg':'image/jpeg'})[path.extname(file)]||'text/plain');res.end(data);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{
for(const mode of ['wechat','share','cancel','denied','desktop','failure']){
const p=await browser.newPage({viewport:{width:393,height:720},userAgent:mode==='wechat'?'iPhone MicroMessenger':mode==='desktop'?'Chrome':'iPhone Safari'});
await p.route('https://www.clarity.ms/**',r=>r.abort());
await p.addInitScript(()=>{window.calendarDrawnText=[];const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.calendarDrawnText.push(String(text));return draw.call(this,text,...args);};});
await p.addInitScript(mode=>{if(['share','cancel','denied'].includes(mode)){navigator.canShare=()=>true;navigator.share=async({files})=>{window.sharedFile={name:files[0].name,type:files[0].type,size:files[0].size};if(mode!=='share')throw new DOMException('test',mode==='cancel'?'AbortError':'NotAllowedError');};}if(mode==='failure')HTMLCanvasElement.prototype.toBlob=()=>{throw new Error('test export failure');};},mode);
await p.goto(base);await p.waitForFunction(()=>document.querySelector('#calendar-mini-photo').naturalWidth>0);await p.click('#calendar-open');assert.equal(await p.locator('#calendar-share').count(),0);assert.equal(await p.locator('.calendar-toolbar button').count(),1);
const download=mode==='desktop'?p.waitForEvent('download'):null;await p.click('#calendar-save');await p.waitForFunction(()=>!document.querySelector('#calendar-save').disabled);
const toast=await p.locator('#calendar-toast').textContent();
if(mode!=='failure'){const drawn=await p.evaluate(()=>window.calendarDrawnText);assert.equal(drawn.filter(t=>t==='每日一页').length,1,'retain header brand only');assert.ok(drawn.every(t=>! /今年还剩|摄影：|备用画面/.test(t)),'omit exported footer');assert.equal(await p.locator('.calendar-signature').textContent(),'每日一页');assert.match(await p.locator('#calendar-remaining').textContent(),/今年还剩/);}
if(['wechat','denied'].includes(mode)){assert.equal(await p.locator('#calendar-preview').evaluate(e=>e.open),true);assert.match(toast,/长按保存/);assert.equal(await p.locator('#calendar-output').evaluate(async e=>{await e.decode();return e.naturalWidth;}),1080);}
else if(mode==='cancel'){assert.equal(toast,'已取消导出');assert.equal(await p.locator('#calendar-preview').evaluate(e=>e.open),false);}
else if(mode==='failure')assert.equal(toast,'导出失败，请重试');
else{assert.equal(toast,'导出成功');if(mode==='share'){const f=await p.evaluate(()=>window.sharedFile);assert.equal(f.type,'image/png');assert.ok(f.size>1000);}else{const d=await download;assert.match(d.suggestedFilename(),/^每日一页-.*\.png$/);const bytes=fs.readFileSync(await d.path());assert.equal(bytes.readUInt32BE(16),1080);}}
console.log('PASS: image export '+mode);await p.close();
}
}finally{server.close();}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
