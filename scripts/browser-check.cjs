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
  await page.click('#spin');await page.waitForFunction(()=>!document.getElementById('result').hidden);
  assert.equal(await page.locator('#food').isEnabled(),true);
  const winner=await page.locator('#winner').textContent();
  assert.ok(['美式','拿铁','卡布奇诺','澳白','摩卡','冷萃'].includes(winner));
  assert.equal(errors.length,0);
  await page.addStyleTag({content:'.wheel{transition-duration:150ms}'});
  for(const mode of ['food','coffee']){
   await page.click('#'+mode);
   for(let round=0;round<2;round++){
    await page.click('#spin');
    await page.waitForFunction(()=>!document.getElementById('result').hidden);
    const positions=await page.evaluate(()=>{
     const svg=document.querySelector('#wheel svg');
     const rect=svg.getBoundingClientRect(),scale=document.getElementById('wheel').clientWidth/320;
     const raw=getComputedStyle(document.getElementById('wheel')).transform;
     const matrix=new DOMMatrix(raw);
     return [...svg.querySelectorAll('text')].map(text=>{
      const anchor=text.parentNode.transform.baseVal.consolidate().matrix;
      const box=text.getBBox(),screen=text.getBoundingClientRect();
      const dx=anchor.e-160,dy=anchor.f-160;
      const x=rect.left+rect.width/2+(matrix.a*dx+matrix.c*dy+box.x+box.width/2)*scale;
      const y=rect.top+rect.height/2+(matrix.b*dx+matrix.d*dy+box.y+box.height/2)*scale;
      return {distance:Math.hypot(screen.left+screen.width/2-x,screen.top+screen.height/2-y),
       sizeError:Math.max(Math.abs(screen.width-box.width*scale),Math.abs(screen.height-box.height*scale))};
     });
    });
    positions.forEach(p=>{assert.ok(p.distance<2,'label drifted from its sector: '+JSON.stringify(p));assert.ok(p.sizeError<2,'label not upright at rest: '+JSON.stringify(p));});
   }
  }
  await page.screenshot({path:'public/screenshots/'+engine.name()+'-stopped-'+width+'.png',fullPage:true});
  await page.close();
 }
 await browser.close();}
 console.log('PASS: Chromium 360/390/430 layout, coffee spin and no JavaScript errors');
})().catch(e=>{console.error(e);process.exit(1);});
