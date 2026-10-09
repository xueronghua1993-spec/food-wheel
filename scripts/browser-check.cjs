const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
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
  await page.close();
 }
 await browser.close();console.log('PASS: Chromium 360/390/430 layout, coffee spin and no JavaScript errors');
})().catch(e=>{console.error(e);process.exit(1);});
