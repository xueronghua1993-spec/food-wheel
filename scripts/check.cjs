const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const key='personal-food-wheel-v1';
const defaults=['面条','米饭套餐','饺子','麻辣烫','汉堡','火锅'];
function page(saved,confirm=true,fail=false){
 const dom=new JSDOM(html,{url:'https://example.com',runScripts:'dangerously',beforeParse(w){
  if(saved)w.localStorage.setItem(key,JSON.stringify(saved));
  w.confirm=()=>confirm;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(fail)w.Storage.prototype.setItem=function(){throw new Error('Storage blocked');};
 }});
 return dom;
}
let dom=page(['披萨','寿司']);
let w=dom.window,d=w.document;
d.getElementById('reset').click();
assert.deepEqual(JSON.parse(w.localStorage.getItem(key)),defaults);
assert.match(d.getElementById('wheel').getAttribute('aria-label'),/面条、米饭套餐、饺子、麻辣烫、汉堡、火锅/);
assert.equal(d.getElementById('result').hidden,true);
const persisted=JSON.parse(w.localStorage.getItem(key));dom.window.close();
dom=page(persisted);assert.match(dom.window.document.getElementById('caption').textContent,/6 个选项/);dom.window.close();
dom=page(['披萨','寿司'],false);dom.window.document.getElementById('reset').click();
assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(key)),['披萨','寿司']);dom.window.close();
dom=page(['披萨','寿司'],true,true);d=dom.window.document;d.getElementById('reset').click();
assert.match(d.getElementById('notice').textContent,/未能保存/);assert.match(d.getElementById('caption').textContent,/6 个选项/);dom.window.close();
dom=page(['披萨','寿司']);d=dom.window.document;d.getElementById('spin').click();
assert.equal(d.getElementById('reset').disabled,true);d.getElementById('reset').click();
assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(key)),['披萨','寿司']);dom.window.close();
dom=page();d=dom.window.document;d.getElementById('edit').click();
d.getElementById('add').click();assert.equal(d.querySelectorAll('.row').length,7);
d.querySelectorAll('.row input')[6].value='披萨';d.querySelectorAll('.row input')[6].dispatchEvent(new dom.window.Event('input'));
d.getElementById('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
assert.equal(JSON.parse(dom.window.localStorage.getItem(key))[6],'披萨');dom.window.close();
assert.ok(html.includes('property="og:title"'));
assert.ok(html.includes('https://xueronghua1993-spec.github.io/food-wheel/share-card.png'));
console.log('PASS: reset, cancel, storage failure, reload persistence, busy lock, existing menu edit, share metadata');
