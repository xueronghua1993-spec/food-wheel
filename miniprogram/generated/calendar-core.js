// Generated from H5 by scripts/build-miniprogram.cjs. Do not edit.
const DAY=86400000;
function beijingDate(now=new Date()){
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=k=>p.find(x=>x.type===k).value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
function utcDay(key){
 if(typeof key!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(key))return NaN;
 const d=new Date(`${key}T00:00:00Z`);
 return Number.isFinite(+d)&&d.toISOString().slice(0,10)===key?+d:NaN;
}
function dateInfo(key){
 const n=utcDay(key);if(!Number.isFinite(n))throw new RangeError('Invalid date');
 const [year,month,day]=key.split('-').map(Number);
 const date=new Date(`${key}T04:00:00Z`);
 let lunar='';
 try{
 const parts=new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'}).formatToParts(date);
 const lunarMonth=parts.find(x=>x.type==='month')?.value;
 const d=Number(parts.find(x=>x.type==='day')?.value);
 const days=['','初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
 if(lunarMonth&&days[d])lunar=lunarMonth+days[d];
 }catch{/* Unsupported Chinese calendar: omit rather than guess. */}
 return{year,month,day,weekday:new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',weekday:'long'}).format(date),lunar,remainingDays:Math.round((Date.UTC(year,11,31)-n)/DAY)};
}
function resolveDate(requested,today,firstDate){
 return Number.isFinite(utcDay(requested))&&requested>=firstDate&&requested<=today?requested:today;
}
function offsetDate(key,offset){const n=utcDay(key);if(!Number.isFinite(n))throw new RangeError('Invalid date');return new Date(n+offset*DAY).toISOString().slice(0,10);}
function entryForDate(key,catalog){
 const index=Math.round((utcDay(key)-utcDay(catalog.firstDate))/DAY);
 if(!Number.isFinite(index)||key<(catalog.historyStart||catalog.firstDate))return null;
 const rotation=catalog.rotation||catalog.schedule;
 const id=catalog.historySchedule?.[key]||catalog.schedule[index]||rotation[((index%rotation.length)+rotation.length)%rotation.length];
 return catalog.entries.find(e=>e.id===id)||null;
}

module.exports={beijingDate,dateInfo,resolveDate,offsetDate,entryForDate};
