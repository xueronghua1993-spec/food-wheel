import test from 'node:test';
import assert from 'node:assert/strict';
import {beijingDate,dateInfo,entryForDate,resolveDate} from '../calendar/calendar-core.mjs';
test('Beijing date switches at 16:00 UTC',()=>{
 assert.equal(beijingDate(new Date('2026-10-09T15:59:59Z')),'2026-10-09');
 assert.equal(beijingDate(new Date('2026-10-09T16:00:00Z')),'2026-10-10');
});
test('Gregorian remaining days, leap year and lunar leap month',()=>{
 assert.equal(dateInfo('2026-12-31').remainingDays,0);
 assert.equal(dateInfo('2028-02-29').remainingDays,306);
 assert.equal(dateInfo('2026-10-09').weekday,'星期五');
 assert.match(dateInfo('2023-03-22').lunar,/闰二月/);
 assert.match(dateInfo('2026-10-09').lunar,/八月廿九/);
});
test('Invalid, future and pre-launch links resolve to today',()=>{
 for(const key of ['2026-02-30','2026-10-10','2026-10-08','oops',null])assert.equal(resolveDate(key,'2026-10-09','2026-10-09'),'2026-10-09');
 assert.equal(resolveDate('2026-10-09','2026-10-10','2026-10-09'),'2026-10-09');
});
test('History remains stable after appending schedule; fixed fallback cycle',()=>{
 const c={firstDate:'2026-10-09',entries:[{id:'a'},{id:'b'},{id:'c'}],schedule:['a','b'],rotation:['a','b']};
 assert.equal(entryForDate('2026-10-10',c).id,'b');
 assert.equal(entryForDate('2026-10-11',c).id,'a');
 const expanded={...c,schedule:['a','b','a','b','c']};
 assert.equal(entryForDate('2026-10-11',expanded).id,'a');
 assert.equal(entryForDate('2026-10-08',c),null);
});
test('Backfilled days use the fixed cycle without changing launch-day content',()=>{
 const c={firstDate:'2026-10-09',historyStart:'2026-10-03',entries:[{id:'a'},{id:'b'},{id:'c'}],schedule:['a','b','c'],rotation:['a','b','c']};
 assert.equal(entryForDate('2026-10-08',c)?.id,'c');
 assert.equal(entryForDate('2026-10-03',c)?.id,'a');
 assert.equal(entryForDate('2026-10-02',c),null);
 assert.equal(entryForDate('2026-10-09',c).id,'a');
 assert.equal(resolveDate('2026-10-08','2026-10-09',c.historyStart),'2026-10-08');
});

test('Published catalog supplies 90 distinct daily pictures and texts through January 6',async()=>{
 const fs=await import('node:fs');
 const c=JSON.parse(fs.readFileSync('calendar/content.json','utf8'));
 const days=Array.from({length:90},(_,i)=>new Date(Date.UTC(2026,9,9+i)).toISOString().slice(0,10));
 const entries=days.map(date=>entryForDate(date,c));
 assert.equal(days.at(-1),'2027-01-06');
 assert.equal(new Set(entries.map(e=>e.imagePath)).size,90);
 assert.equal(new Set(entries.map(e=>e.text)).size,90);
 assert.deepEqual(entries.slice(0,7).map(e=>e.id),['autumn','home','moon','observe','friend','walk','meet']);
 assert.deepEqual(Array.from({length:6},(_,i)=>entryForDate(`2026-10-0${3+i}`,c).id),['home','moon','observe','friend','walk','meet']);
});
test('Expanded rotations honor explicit historical dates and rotate all 90 entries',async()=>{
 const fs=await import('node:fs');const c=JSON.parse(fs.readFileSync('calendar/content.json','utf8'));
 assert.equal(c.rotation.length,90);
 assert.equal(entryForDate('2027-01-07',c).id,'autumn');
 assert.equal(entryForDate('2027-01-14',c).id,c.schedule[7]);
 const fixture={firstDate:'2026-10-09',historyStart:'2026-10-08',entries:[{id:'a'},{id:'b'}],schedule:['a','b'],rotation:['a','b'],historySchedule:{'2026-10-08':'a'}};
 assert.equal(entryForDate('2026-10-08',fixture).id,'a');
});
