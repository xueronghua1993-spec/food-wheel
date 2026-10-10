import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createAccountStore} from '../calendar/account-store.mjs';

async function setup(error=null){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.test/',runScripts:'outside-only'});
 const w=dom.window;
 const sdk={auth:{
  onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},
  async getSession(){return {data:{session:null},error:null};},
  async signUp(){return error?{data:{user:null,session:null},error}:{data:{user:{id:'test-user',email:'person@example.test'},session:null},error:null};}
 }};
 // Replace only module imports; execute the real UI with the real account store.
 const source=fs.readFileSync('calendar/account-ui.mjs','utf8')
  .replace("import {createAccountStore} from './account-store.mjs';",'')
  .replace("import('./supabase-client.mjs')",'importClient()');
 await w.eval('(async function(createAccountStore,importClient){'+source+'\n})')(createAccountStore,async()=>({makeClient:()=>sdk}));
 await new Promise(resolve=>w.setTimeout(resolve,0));
 const el=id=>w.document.getElementById(id);
 el('account-signup').click();el('account-email').value='person@example.test';el('account-password').value='newpassword123';
 return {dom,w,el,submit:()=>el('account-form').onsubmit({preventDefault(){}})};
}
test('successful signup replaces the form with email confirmation and can return to login',async()=>{
 const {dom,el,submit}=await setup();
 try{
  await submit();
  assert.equal(el('account-guest').hidden,true,'signup form must leave the screen after success');
  const confirmation=el('account-verification');
  assert.ok(confirmation,'email confirmation panel must exist');
  assert.equal(confirmation.hidden,false);
  assert.match(confirmation.textContent,/前往邮箱确认/);
  assert.equal(el('account-verification-email').textContent,'person@example.test');
  assert.equal(el('account-password').value,'');
  el('account-back-login').click();
  assert.equal(confirmation.hidden,true);
  assert.equal(el('account-guest').hidden,false);
  assert.equal(el('account-login').getAttribute('aria-pressed'),'true');
  assert.equal(el('account-email').value,'person@example.test');
 }finally{dom.window.close();}
});
test('failed signup keeps the editable form and error instead of claiming email confirmation',async()=>{
 const {dom,el,submit}=await setup({code:'over_email_send_rate_limit'});
 try{
  await submit();
  assert.equal(el('account-guest').hidden,false);
  assert.equal(el('account-verification').hidden,true);
  assert.equal(el('account-email').value,'person@example.test');
  assert.equal(el('account-submit').disabled,false);
  assert.match(el('account-message').textContent,/频繁/);
 }finally{dom.window.close();}
});
test('password labels distinguish setting a site password from signing in',async()=>{
 const {dom,el}=await setup();
 try{
  assert.match(el('account-password-label').textContent,/设置本站登录密码/);
  const hint=el('account-password-hint');
  assert.ok(hint,'password purpose must be explained');
  assert.match(hint.textContent,/邮箱密码/);
  assert.ok(el('account-password').getAttribute('aria-describedby').split(/\s+/).includes(hint.id));
  assert.equal(el('account-password').autocomplete,'new-password');
  el('account-login').click();
  assert.match(el('account-password-label').textContent,/本站登录密码/);
  assert.doesNotMatch(el('account-password-label').textContent,/设置/);
  assert.equal(el('account-password').autocomplete,'current-password');
 }finally{dom.window.close();}
});
