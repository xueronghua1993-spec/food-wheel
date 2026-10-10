import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {entryForDate} from '../calendar/calendar-core.mjs';
const require=createRequire(import.meta.url);
const root='miniprogram/';
test('native project uses registered AppID and all pages resolve',()=>{
 assert.ok(fs.existsSync(root+'project.config.json'),'native project must exist');
 const project=JSON.parse(fs.readFileSync(root+'project.config.json'));
 assert.equal(project.appid,'wx3b755ea7217f2cc0');
 const app=JSON.parse(fs.readFileSync(root+'app.json'));
 for(const page of app.pages)for(const ext of ['js','json','wxml','wxss'])assert.ok(fs.existsSync(root+page+'.'+ext),page+'.'+ext);
});
test('generated H5 menu rules align every winner with the pointer',()=>{
 assert.ok(fs.existsSync(root+'generated/wheel.js'),'H5 rules must be generated');
 const {validate,nextRotation,presets}=require('../miniprogram/generated/wheel.js');
 assert.deepEqual(presets.food,['面条','米饭套餐','饺子','麻辣烫','汉堡','火锅']);
 for(const items of [['面'],[' ','饭'],['面',' 面 '],['123456789','饭']])assert.ok(validate(items).error);
 assert.equal(validate(['😀😀😀😀😀😀😀😀','饭']).error,'');
 let rotation=0;
 for(let n=2;n<=10;n++)for(let i=0;i<n;i++){
  const next=nextRotation(rotation,i,n);assert.ok(next-rotation>=1440);
  const angle=((i+.5)*360/n+next)%360;assert.ok(Math.min(angle,360-angle)<1e-8);rotation=next;
 }
});
test('catalog and historical selection match H5 including rotation',()=>{
 assert.ok(fs.existsSync(root+'generated/content.js'),'catalog must be generated');
 const native=require('../miniprogram/generated/content.js'),web=JSON.parse(fs.readFileSync('calendar/content.json'));
 const core=require('../miniprogram/generated/calendar-core.js');
 assert.equal(native.entries.length,90);
 for(const date of ['2026-10-03','2026-10-09','2026-10-10','2027-04-01']){
  const a=entryForDate(date,web),b=core.entryForDate(date,native);assert.equal(b.id,a.id);assert.equal(b.text,a.text);
  assert.ok(fs.existsSync(root+b.imagePath.slice(1)),b.imagePath);
 }
 assert.equal(core.resolveDate('2026-02-30','2026-10-10',web.historyStart),'2026-10-10');
});
test('native dates use Beijing midnight and tolerate unavailable lunar formatter',()=>{
 assert.ok(fs.existsSync(root+'utils/dates.js'),'native date compatibility layer must exist');
 const {today,dateInfo}=require('../miniprogram/utils/dates.js');
 assert.equal(today(new Date('2026-10-09T15:59:59Z')),'2026-10-09');
 assert.equal(today(new Date('2026-10-09T16:00:00Z')),'2026-10-10');
 const info=dateInfo('2026-10-10',null);assert.equal(info.weekday,'星期六');assert.equal(info.remainingDays,82);assert.equal(info.lunar,'');
 assert.throws(()=>dateInfo('2026-02-30'),RangeError);
});
test('generated account store keeps offline queue, account isolation and idempotent import',async()=>{
 assert.ok(fs.existsSync(root+'generated/account-store.js'),'shared account store must exist');
 const {createAccountStore}=require('../miniprogram/generated/account-store.js');
 const m=new Map(),disk={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),key:i=>[...m.keys()][i],get length(){return m.size;}};
 const key='personal-food-wheel-v1',day='daily-calendar-todos-v1:2026-10-10',s=createAccountStore(disk);
 s.setItem(key,'["面","饭"]');s.setItem(day,JSON.stringify([{id:'guest',text:'读书',done:false}]));
 s.replace('A',[{mode:'food',items:['汉堡','火锅']}],[]);s.use('A');s.importGuest('A');const first=s.getItem(day);s.importGuest('A');assert.equal(s.getItem(day),first);
 assert.equal(s.getItem(key),'["汉堡","火锅"]');
 await assert.rejects(s.flush('A',async()=>{throw Error('offline');}));assert.ok(s.pending('A').length);
 s.use('B');assert.equal(s.getItem(day),null);s.use(null);assert.equal(s.getItem(key),'["面","饭"]');
 await s.flush('A',async()=>{});assert.equal(s.pending('A').length,0);
});
test('rebuilding from H5 is deterministic and every package is below WeChat limits',()=>{
 assert.ok(fs.existsSync('scripts/build-miniprogram.cjs'),'repeatable native build must exist');
 const before=fs.readFileSync(root+'generated/source.json','utf8');
 execFileSync(process.execPath,['scripts/build-miniprogram.cjs'],{stdio:'pipe'});
 assert.equal(fs.readFileSync(root+'generated/source.json','utf8'),before);
 const app=JSON.parse(fs.readFileSync(root+'app.json'));
 const size=dir=>fs.readdirSync(dir,{withFileTypes:true}).reduce((total,e)=>total+(e.isDirectory()?size(dir+'/'+e.name):fs.statSync(dir+'/'+e.name).size),0);
 let sub=0;for(const p of app.subPackages){const n=size(root+p.root);assert.ok(n<2*1024*1024,p.root+': '+n);sub+=n;}
 const total=size(root);assert.ok(total-sub<2*1024*1024,'main package');assert.ok(total<20*1024*1024,'total');
});
