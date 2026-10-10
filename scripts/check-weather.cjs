const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve('public');
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname,file=path.join(root,name==='/'?'index.html':name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try{for(const width of [320,390]){
   const page=await browser.newPage({viewport:{width,height:720}});
   await page.clock.install({time:new Date('2026-10-10T04:00:00Z')});
   await page.route('https://www.clarity.ms/**',r=>r.abort());
   let ipCalls=0,weatherCalls=0,failIP=false,failWeather=false;
   await page.route('https://ipwho.is/**',r=>{ipCalls++;return r.fulfill({status:failIP?429:200,contentType:'application/json',body:JSON.stringify({success:true,city:'Shanghai',latitude:31.2,longitude:121.4})});});
   await page.route('https://api.open-meteo.com/**',r=>{weatherCalls++;return r.fulfill({status:failWeather?500:200,contentType:'application/json',body:JSON.stringify({timezone:'Asia/Shanghai',current:{temperature_2m:22,weather_code:2,time:'2026-10-10T12:00'},daily:{temperature_2m_max:[25],temperature_2m_min:[18],time:['2026-10-10']}})});});
   await page.route('https://geocoding-api.open-meteo.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({results:[{name:'杭州',admin1:'浙江',country:'中国',latitude:30.2,longitude:120.2}]})}));
   await page.goto(base);await page.waitForFunction(()=>document.getElementById('weather-summary').textContent.includes('22°C'));
   assert.equal(await page.locator('#weather-widget').isVisible(),true);
   assert.equal(await page.locator('.weather-credit').count(),0);
   assert.match(await page.locator('#weather-info').textContent(),/IP 估算/);
   assert.equal(ipCalls,1);assert.equal(weatherCalls,1);
   await page.click('#weather-change');await page.fill('#weather-search','杭州');await page.click('#weather-form button[type=submit]');await page.click('#weather-results button');
   await page.waitForFunction(()=>document.getElementById('weather-info').textContent.includes('手动'));
   assert.equal(await page.locator('#weather-city').textContent(),'杭州');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'weather creates horizontal overflow');
   await page.screenshot({path:'public/screenshots/weather-'+engine.name()+'-'+width+'.png',fullPage:true});
   failWeather=true;await page.click('#weather-retry');await page.waitForFunction(()=>document.getElementById('weather-summary').textContent.includes('暂时不可用'));
   await page.click('#calendar-open');await page.click('#calendar-view-todos');await page.fill('#todo-input','天气失败也能记');await page.click('#todo-form button');assert.equal(await page.locator('#todo-list li').count(),1);await page.click('#calendar-detail-close');
   failIP=true;await page.click('#weather-change');await page.click('#weather-auto');await page.waitForFunction(()=>document.getElementById('weather-widget').hidden);
   assert.equal(await page.locator('#weather-info').textContent(),'');
   await page.evaluate(()=>sessionStorage.clear());
   await page.reload();await page.waitForFunction(()=>document.getElementById('weather-widget').hidden&&document.getElementById('weather-summary').textContent==='');
   assert.equal(await page.locator('#weather-widget').isVisible(),false);
   await page.close();
  }}finally{await browser.close();}
 }
 console.log('PASS: mocked IP/weather, manual city, hidden missing-city panel, rate limit/network fallback and independent todos');
 // Read-only live preview verification. Its availability is reported separately.
 const browser=await chromium.launch({headless:true});
 try{
  const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  const sha=event.pull_request?.head.sha||process.env.GITHUB_SHA;
  const url='https://rawcdn.githack.com/'+process.env.GITHUB_REPOSITORY+'/'+sha+'/index.html';
  console.log('PREVIEW: '+url);
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://www.clarity.ms/**',r=>r.abort());
  const response=await page.goto(url,{timeout:25000});console.log('PREVIEW HTTP: '+response.status());
  await page.waitForSelector('#calendar-mini-todo-count',{state:'attached',timeout:10000});
  await page.click('#calendar-open');await page.click('#calendar-view-todos');
  await page.fill('#todo-input','预览测试');await page.click('#todo-form button');
  await page.waitForSelector('#todo-list li',{timeout:15000});
  console.log('LIVE PREVIEW PASS: module loading and todo interaction');
 }catch(error){console.log('LIVE PREVIEW UNVERIFIED: '+error.message.slice(0,150));}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
