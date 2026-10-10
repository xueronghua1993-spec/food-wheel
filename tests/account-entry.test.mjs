import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {JSDOM} from 'jsdom';
test('opening optional login leaves guest wheel usable',()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test/',runScripts:'outside-only'});
 const {window:w}=dom;w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&!script.type)w.eval(script.textContent);
 const entry=w.document.getElementById('account-open');
 assert.ok(entry,'optional login entry missing');entry.click();
 assert.ok(w.document.getElementById('account-dialog').open,'account entry must open dialog');
 assert.equal(w.document.getElementById('spin').disabled,false,'guest wheel remains available');
 dom.window.close();
});
