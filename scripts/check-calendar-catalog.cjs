const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(process.env.CALENDAR_ROOT||'public');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'calendar/content.json'),'utf8'));
const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const filename=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/$/,'/index.html'));
  if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(filename,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(filename)]||'text/plain');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const base='http://127.0.0.1:'+server.address().port;
  const lastDate=new Date(Date.parse(catalog.firstDate+'T00:00:00Z')+(catalog.schedule.length-1)*86400000).toISOString().slice(0,10);
  for(const [width,height] of [[320,568],[393,720]]){
   const page=await browser.newPage({viewport:{width,height},isMobile:true,userAgent:'iPhone MicroMessenger'}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));await page.route('https://www.clarity.ms/**',route=>route.abort());
   await page.clock.install({time:new Date(lastDate+'T04:00:00Z')});await page.goto(base+'/?date='+catalog.firstDate);await page.click('#calendar-open');
   for(let i=0;i<catalog.schedule.length;i++){
    const entry=catalog.entries.find(e=>e.id===catalog.schedule[i]);
    await page.waitForFunction(text=>document.querySelector('#calendar-text').textContent===text,entry.text);
    await page.locator('#calendar-photo').evaluate(async image=>{await image.decode();});
    const actual=await page.evaluate(()=>{
     const panel=document.querySelector('#calendar-panel'),image=document.querySelector('#calendar-photo'),card=document.querySelector('#calendar-card');
     return{source:new URL(image.src).pathname,scrollHeight:panel.scrollHeight,height:panel.clientHeight,photoHeight:image.getBoundingClientRect().height,cardBottom:card.getBoundingClientRect().bottom,panelBottom:panel.getBoundingClientRect().bottom,width:document.documentElement.scrollWidth,viewport:innerWidth};
    });
    assert.equal(actual.source,new URL(entry.imagePath,base+'/').pathname,entry.id+' photo');
    assert.ok(actual.scrollHeight<=actual.height+1,entry.id+' must fit one screen '+JSON.stringify(actual));
    assert.ok(actual.photoHeight>=40,entry.id+' visible photo');assert.ok(actual.cardBottom<=actual.panelBottom+1,entry.id+' visible footer');assert.ok(actual.width<=actual.viewport,entry.id+' horizontal overflow');
    if(i<catalog.schedule.length-1)await page.click('#calendar-next');
   }
   assert.equal(await page.locator('#calendar-next').isDisabled(),true);assert.deepEqual(errors,[]);
   if(width===393){
    const result=await page.evaluate(async catalog=>{
     const {renderCalendarImage}=await import('./calendar/calendar-export.mjs');const {dateInfo}=await import('./calendar/calendar-core.mjs');
     const dimensions=[];
     for(let i=0;i<catalog.schedule.length;i++){
      const entry=catalog.entries.find(e=>e.id===catalog.schedule[i]);const date=new Date(Date.parse(catalog.firstDate+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
      const blob=await renderCalendarImage(entry,dateInfo(date));const bitmap=await createImageBitmap(blob);dimensions.push({id:entry.id,width:bitmap.width,height:bitmap.height,bytes:blob.size});bitmap.close();
     }
     return dimensions;
    },catalog);
    assert.equal(result.length,catalog.schedule.length);assert.ok(result.every(x=>x.width===1080&&x.height>1000&&x.bytes>1000));console.log('PASS: all '+result.length+' dates export valid 1080px PNG images');
   }
   console.log('PASS: all '+catalog.schedule.length+' dates at '+width+'×'+height+' show the correct photo and fit one screen');await page.close();
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
