import test from 'node:test';
import assert from 'node:assert/strict';
import {createTodoStore} from '../calendar/calendar-todos.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};};
test('add, toggle, delete and reload a day',()=>{
 const memory=storage(),store=createTodoStore(memory);store.select('2026-10-10');
 assert.equal(store.add(' 读书 ').items[0].text,'读书');
 const id=store.snapshot().items[0].id;store.toggle(id);
 const next=createTodoStore(memory);assert.equal(next.select('2026-10-10').items[0].done,true);
 next.remove(id);assert.equal(next.snapshot().items.length,0);
});
test('days are isolated and previous records remain',()=>{
 const store=createTodoStore(storage());store.select('2026-10-10');store.add('今天');
 store.select('2026-10-11');assert.equal(store.snapshot().items.length,0);store.add('明天');
 assert.equal(store.select('2026-10-10').items[0].text,'今天');
});
test('validation and storage failure do not discard current edits',()=>{
 const store=createTodoStore({getItem:()=>null,setItem(){throw Error('quota');}});store.select('2026-10-10');
 assert.ok(store.add(' ').error);assert.ok(store.add('字'.repeat(101)).error);
 store.add('仍可使用');assert.equal(store.snapshot().items.length,1);assert.match(store.snapshot().error,/未能保存/);
});
test('corrupted storage is handled safely',()=>{
 const store=createTodoStore({getItem:()=>'{bad',setItem(){}});assert.equal(store.select('2026-10-10').items.length,0);assert.match(store.snapshot().error,/无法读取/);
});
