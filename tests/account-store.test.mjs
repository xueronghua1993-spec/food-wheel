import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountStore} from '../calendar/account-store.mjs';
function memory(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),key:i=>[...m.keys()][i],get length(){return m.size;}};}
const menu='personal-food-wheel-v1',day='daily-calendar-todos-v1:2026-10-10';
test('guest and different accounts never share personal records',()=>{
 const s=createAccountStore(memory());s.setItem(menu,'["面","饭"]');s.use('A');assert.equal(s.getItem(menu),null);
 s.setItem(menu,'["饺子","火锅"]');s.use('B');assert.equal(s.getItem(menu),null);s.use(null);assert.equal(s.getItem(menu),'["面","饭"]');
 s.use('A');assert.equal(s.getItem(menu),'["饺子","火锅"]');
});
test('pending saves survive reload and failure; todo mutations are per item',async()=>{
 const disk=memory(),s=createAccountStore(disk);s.use('A');
 s.setItem(day,JSON.stringify([{id:'one',text:'读书',done:false}]));
 s.setItem(day,JSON.stringify([{id:'one',text:'读书',done:true},{id:'two',text:'运动',done:false}]));
 s.setItem(day,JSON.stringify([{id:'two',text:'运动',done:false}]));
 const reloaded=createAccountStore(disk);reloaded.use('A');assert.ok(reloaded.pending('A').length);
 await assert.rejects(reloaded.flush('A',async()=>{throw Error('offline');}));
 assert.ok(reloaded.pending('A').length);const sent=[];
 await reloaded.flush('A',async op=>sent.push(op));assert.equal(reloaded.pending('A').length,0);
 assert.ok(sent.some(x=>x.type==='deleteTodo'&&x.row.id==='one'));assert.ok(sent.some(x=>x.type==='todo'&&x.row.id==='two'));
});
test('a new edit made during upload is not acknowledged by an older upload',async()=>{
 const s=createAccountStore(memory());s.use('A');s.setItem(menu,'["面","饭"]');
 let once=false;await s.flush('A',async()=>{if(!once){once=true;s.setItem(menu,'["饺子","火锅"]');}});
 assert.equal(s.getItem(menu),'["饺子","火锅"]');assert.equal(s.pending('A').length,0);
});
test('pull merges pending edits rather than silently replacing them',()=>{
 const s=createAccountStore(memory());s.use('A');s.setItem(menu,'["面","饭"]');
 s.replace('A',[{mode:'food',items:['汉堡','火锅']}],[]);assert.equal(s.getItem(menu),'["面","饭"]');
});
test('import preserves existing cloud menus and guest data and can be repeated safely',()=>{
 const disk=memory(),s=createAccountStore(disk);s.setItem(menu,'["面","饭"]');s.setItem(day,JSON.stringify([{id:'old',text:'读书',done:false}]));
 s.replace('A',[{mode:'food',items:['汉堡','火锅']}],[]);s.use('A');s.importGuest('A');const first=s.getItem(day);s.importGuest('A');
 assert.equal(s.getItem(day),first);assert.equal(s.getItem(menu),'["汉堡","火锅"]');s.use(null);assert.equal(s.getItem(day),JSON.stringify([{id:'old',text:'读书',done:false}]));
});
