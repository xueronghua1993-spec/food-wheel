import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('guest can open optional account dialog without losing wheel',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/id="account-open"/,'optional login entry missing');
 assert.match(html,/id="account-dialog"/);
 assert.match(html,/id="spin"/);
 assert.match(html,/data-clarity-mask/);
});
