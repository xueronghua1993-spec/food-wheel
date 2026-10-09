const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 fs.mkdirSync('public/screenshots',{recursive:true});
 for(const width of [360,390,430]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('index.html'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'public/screenshots/food-'+width+'.png',fullPage:true});
  await page.click('#coffee');
  await page.screenshot({path:'public/screenshots/coffee-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.click('#spin');
  await page.waitForTimeout(350);
  const angles=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{
   const wheel=new DOMMatrix(getComputedStyle(document.getElementById('wheel')).transform);
   resolve([...document.querySelectorAll('#wheel text')].map(text=>{
    const local=text.transform.baseVal.consolidate().matrix;
    const a=wheel.a*local.a+wheel.c*local.b,b=wheel.b*local.a+wheel.d*local.b;
    return Math.atan2(b,a);
   }));
  })));
  angles.forEach(angle=>assert.ok(Math.abs(angle)<.03,'label tilted during animation: '+angle));
  await page.waitForFunction(()=>!document.getElementById('result').hidden);
  assert.equal(await page.locator('#food').isEnabled(),true);
  const winner=await page.locator('#winner').textContent();
  assert.ok(['美式','拿铁','卡布奇诺','澳白','摩卡','冷萃'].includes(winner));
  assert.equal(errors.length,0);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const mode of ['food','coffee']){
   await page.click('#'+mode);
   for(let round=0;round<2;round++){
    await page.click('#spin');
    await page.waitForFunction(()=>!document.getElementById('result').hidden);
    const positions=await page.evaluate(()=>{
     const svg=document.querySelector('#wheel svg');
     const rect=svg.getBoundingClientRect(),scale=parseFloat(getComputedStyle(document.getElementById('wheel')).width)/320;
     const raw=getComputedStyle(document.getElementById('wheel')).transform;
     const matrix=new DOMMatrix(raw);
     return [...svg.querySelectorAll('text')].map(text=>{
      const anchor=text.parentNode.transform.baseVal.consolidate().matrix;
      const box=text.getBBox(),screen=text.getBoundingClientRect();
      const dx=anchor.e-160,dy=anchor.f-160;
      const x=rect.left+rect.width/2+(matrix.a*dx+matrix.c*dy+box.x+box.width/2)*scale;
      const y=rect.top+rect.height/2+(matrix.b*dx+matrix.d*dy+box.y+box.height/2)*scale;
      // Glyph bounding rectangles can differ by a few pixels due to font hinting;
      // the composed orientation below remains checked independently.
      const local=text.transform.baseVal.consolidate().matrix;
      const angle=Math.atan2(matrix.b*local.a+matrix.d*local.b,matrix.a*local.a+matrix.c*local.b);
      return {angle,distance:Math.hypot(screen.left+screen.width/2-x,screen.top+screen.height/2-y),
       sizeError:Math.max(Math.abs(screen.width-box.width*scale),Math.abs(screen.height-box.height*scale))};
     });
    });
    positions.forEach(p=>{assert.ok(p.distance<5,'label drifted from its sector: '+JSON.stringify(p));assert.ok(Math.abs(p.angle)<.02,'label not upright at rest: '+JSON.stringify(p));});
   }
  }
  await page.screenshot({path:'public/screenshots/'+engine.name()+'-stopped-'+width+'.png',fullPage:true});
  await page.close();
 }
 // Mock the deployed origin: stale HTML must navigate to the new version once.
 const cached=fs.readFileSync('public/index.html','utf8');
 const stamped=cached.match(/const buildVersion='([a-f0-9]{12})';/)[1];
 for(const scenario of ['update','same','offline','stale-again']){
  const page=await browser.newPage();
  let visits=0;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.endsWith('/release.json')){
    if(scenario==='offline'){await route.abort();return;}
    await route.fulfill({contentType:'application/json',body:JSON.stringify({version:stamped})});return;
   }
   if(url.pathname.endsWith('/food-wheel/')){
    visits++;
    const stale=scenario==='update'||scenario==='stale-again';
    const body=stale&&(scenario==='stale-again'||!url.searchParams.has('v'))?cached.replace("const buildVersion='"+stamped+"';","const buildVersion='000000000000';"):cached;
    await route.fulfill({contentType:'text/html',body});return;
   }
   await route.fulfill({status:404,body:''});
  });
  await page.goto('https://xueronghua1993-spec.github.io/food-wheel/').catch(()=>{});
  if(scenario==='update'||scenario==='stale-again')await page.waitForURL('**/?v='+stamped);
  await page.waitForTimeout(300);
  assert.equal(visits,scenario==='update'||scenario==='stale-again'?2:1);
  assert.equal(await page.locator('#spin').isEnabled(),true);
  await page.close();
 }
 console.log('PASS: release update, unchanged version, offline fallback and no redirect loop');

 await browser.close();}
 console.log('PASS: Chromium 360/390/430 layout, coffee spin and no JavaScript errors');
})().catch(e=>{console.error(e);process.exit(1);});
