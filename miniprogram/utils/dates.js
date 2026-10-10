const core=require('../generated/calendar-core');
function today(now=new Date()) {return new Date(+now+8*3600000).toISOString().slice(0,10);}
function dateInfo(key,formatter=typeof Intl==='undefined'?null:Intl){
 // Validate before deriving fields; Date.parse alone normalizes invalid dates.
 core.offsetDate(key,0);
 const [year,month,day]=key.split('-').map(Number),date=new Date(key+'T04:00:00Z');
 let lunar='';if(formatter)try{lunar=core.dateInfo(key).lunar;}catch{/* No guessed lunar dates. */}
 return {year,month,day,lunar,weekday:['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][date.getUTCDay()],remainingDays:Math.round((Date.UTC(year,11,31)-Date.UTC(year,month-1,day))/86400000)};
}
module.exports={today,dateInfo,offsetDate:core.offsetDate,resolveDate:core.resolveDate,entryForDate:core.entryForDate};
