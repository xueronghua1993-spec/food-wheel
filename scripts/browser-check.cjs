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
  for(const mode of ['food','coffee']){
   await page.click('#'+mode);
   for(let round=0;round<2;round++){
    await page.click('#spin');
    await page.waitForFunction(()=>!document.getElementById('result').hidden);
    const positions=await page.evaluate(()=>{
     const svg=document.querySelector('#wheel svg');
     const matrix=svg.getScreenCTM();
     return [...svg.querySelectorAll('text')].map(text=>{
      const anchor=text.parentNode.transform.baseVal.consolidate().matrix;
      const expected=new DOMPoint(anchor.e,anchor.f).matrixTransform(matrix);
      const actual=new DOMPoint(0,0).matrixTransform(text.getScreenCTM());
      const m=text.getScreenCTM();
      return {distance:Math.hypot(actual.x-expected.x,actual.y-expected.y),angle:Math.atan2(m.b,m.a)};
     });
    });
    positions.forEach(p=>{assert.ok(p.distance<.5,'label drifted from its sector');assert.ok(Math.abs(p.angle)<.02,'label not upright at rest');});
   }
  }
  await page.screenshot({path:'public/screenshots/'+engine.name()+'-stopped-'+width+'.png',fullPage:true});
  await page.close();
 }
 await browser.close();}
 console.log('PASS: Chromium 360/390/430 layout, coffee spin and no JavaScript errors');
})().catch(e=>{console.error(e);process.exit(1);});
