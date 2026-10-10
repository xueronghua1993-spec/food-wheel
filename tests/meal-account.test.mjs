import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {JSDOM} from 'jsdom';
import {createAccountStore,menuKeys} from '../calendar/account-store.mjs';
test('AI menu uses current account queue without replacing guest menu',()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};w.confirm=()=>true;
 const guest=JSON.stringify(['面条','饺子']);w.localStorage.setItem(menuKeys.food,guest);
 const store=createAccountStore(w.localStorage);store.use('meal-test-owner');w.appStore=store;
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&!script.type)w.eval(script.textContent);
 const names=['番茄鸡蛋面','香菇鸡肉饭','青菜豆腐汤'],detail={names,accepted:false};w.dispatchEvent(new w.CustomEvent('meal-menu-request',{detail}));
 assert.equal(detail.accepted,true);assert.deepEqual(JSON.parse(store.getItem(menuKeys.food)),names);assert.equal(store.pending('meal-test-owner').length,1);assert.equal(w.localStorage.getItem(menuKeys.food),guest);
 store.use(null);w.dispatchEvent(new w.Event('personal-data-change'));assert.match(w.document.getElementById('wheel').getAttribute('aria-label'),/面条、饺子/);dom.window.close();
});
