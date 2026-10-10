import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
test('Build ships local calendar resources and preserves verification files',()=>{
 execFileSync(process.execPath,['scripts/build.cjs'],{stdio:'pipe'});
 for(const name of ['calendar-core.mjs','calendar-ui.mjs','calendar-export.mjs','calendar.css','content.json'])assert.ok(fs.existsSync('public/calendar/'+name),name);
 for(const name of ['e33e810e10527a1d51a0341534a9b38d.txt','566c863115e216b54f908af769b51080.txt'])assert.deepEqual(fs.readFileSync(name),fs.readFileSync('public/'+name));
 assert.match(fs.readFileSync('public/index.html','utf8'),/yv0epg3rqf/);
});
test('Catalog is source backed with unique IDs and 90 locally stored photos',()=>{
 const c=JSON.parse(fs.readFileSync('calendar/content.json','utf8'));
 assert.equal(c.entries.length,90);assert.equal(new Set(c.entries.map(e=>e.id)).size,90);
 for(const e of c.entries){assert.equal(e.verified,true);for(const key of ['text','author','work','textSource','imageSource','imageLicense','imageAuthor'])assert.ok(e[key],key);assert.ok(fs.existsSync(e.imagePath));assert.ok(fs.statSync(e.imagePath).size<410000);}
 assert.equal(c.schedule.length,90);assert.equal(new Set(c.entries.map(e=>e.imagePath)).size,90);assert.equal(new Set(c.entries.map(e=>e.text)).size,90);
 assert.equal(new Set(c.entries.map(e=>createHash('sha256').update(fs.readFileSync(e.imagePath)).digest('hex'))).size,90,'photos must differ in bytes as well as filenames');
 for(const id of [...c.schedule,...c.rotation])assert.ok(c.entries.find(e=>e.id===id));
});
test('A release gives the calendar entry points and module dependencies versioned URLs',()=>{
 const version=JSON.parse(fs.readFileSync('public/release.json','utf8')).version;
 const html=fs.readFileSync('public/index.html','utf8');
 assert.ok(html.includes(`calendar/calendar.css?v=${version}`),'CSS must change URL across releases');
 assert.ok(html.includes(`calendar/calendar-ui.mjs?v=${version}`),'entry module must change URL across releases');
 const ui=fs.readFileSync('public/calendar/calendar-ui.mjs','utf8');
 assert.ok(ui.includes(`calendar-core.mjs?v=${version}`));assert.ok(ui.includes(`calendar-export.mjs?v=${version}`));assert.ok(ui.includes(`content.json?v=${version}`));
 const c=JSON.parse(fs.readFileSync('public/calendar/content.json','utf8'));assert.ok(c.entries.every(e=>e.imagePath.endsWith(`?v=${version}`)));
});
