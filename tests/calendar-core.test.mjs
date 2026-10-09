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
