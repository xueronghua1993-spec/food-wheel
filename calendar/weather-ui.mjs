const $=id=>document.getElementById(id),TTL=15*60*1000;
export function locationOf(data,source='ip'){
 const latitude=Number(data.latitude),longitude=Number(data.longitude);
 const name=String(data.city||data.name||'').trim();
 if(data.success===false||data.latitude==null||data.longitude==null||!name||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('location');
 return {name:name.slice(0,80),latitude,longitude,source};
}
export function describeWeather(code){
 if(code===0)return '晴';if([1,2,3].includes(code))return ['','晴间多云','局部多云','阴'][code];
 if([45,48].includes(code))return '雾';if([51,53,55,56,57].includes(code))return '毛毛雨';
 if([61,63,65,66,67,80,81,82].includes(code))return '雨';if([71,73,75,77,85,86].includes(code))return '雪';
 if([95,96,99].includes(code))return '雷雨';return '天气状况未知';
}
export function weatherOf(data){
 const current=data.current,daily=data.daily;
 if(!current||!daily||typeof current.temperature_2m!=='number'||!Number.isFinite(current.temperature_2m)||!Number.isFinite(daily.temperature_2m_max?.[0])||!Number.isFinite(daily.temperature_2m_min?.[0])||typeof current.time!=='string'||!daily.time?.[0])throw Error('weather');
 return {temperature:Math.round(current.temperature_2m),description:describeWeather(current.weather_code),high:Math.round(daily.temperature_2m_max[0]),low:Math.round(daily.temperature_2m_min[0]),time:current.time,date:daily.time[0],zone:data.timezone||'UTC'};
}
async function json(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch(url,{signal:controller.signal,referrerPolicy:'no-referrer'});if(!response.ok)throw Error('network');return await response.json();}
 finally{clearTimeout(timer);}
}
function read(store,key){try{return JSON.parse(store.getItem(key));}catch{return null;}}
function write(store,key,value){try{store.setItem(key,JSON.stringify(value));}catch{/* Display continues when storage is unavailable. */}}
function validCache(value){
 if(!value||!Number.isFinite(value.at)||Date.now()-value.at<0||Date.now()-value.at>TTL)return false;
 try{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:value.weather.zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=k=>p.find(v=>v.type===k).value;
 return value.weather.date===part('year')+'-'+part('month')+'-'+part('day');
 }catch{return false;}
}
export function mountWeather(){
 let session,local;
 try{session=window.sessionStorage;}catch{}try{local=window.localStorage;}catch{}
 let generation=0,searchGeneration=0,current=null,lastLoaded=0;
 function show(place,weather,cached=false){
  current=place;lastLoaded=Date.now();
  $('weather-city').textContent=place.name;
  $('weather-summary').textContent=weather.temperature+'°C · '+weather.description+' · '+weather.low+'～'+weather.high+'°C';
  $('weather-info').textContent=(place.source==='ip'?'IP 估算':'手动选择')+' · 当地 '+weather.date+' '+weather.time.slice(11,16)+(cached?' · 缓存':'');
 }
 async function load(place=null,force=false){
  const token=++generation;
  $('weather-summary').textContent='正在获取天气…';$('weather-info').textContent='';$('weather-city').textContent=place?.name||'当地天气';
  try{
   if(!place){
    const saved=read(local,'daily-weather-city-v1');
    if(saved)try{place=locationOf(saved,'manual');}catch{}
   }
   if(!place){
    const cached=read(session,'daily-weather-ip-v1');
    if(!force&&cached&&Date.now()-cached.at<TTL)place=locationOf(cached.location);
    else{place=locationOf(await json('https://ipwho.is/?fields=success,city,latitude,longitude'));write(session,'daily-weather-ip-v1',{at:Date.now(),location:place});}
   }
   if(token!==generation)return;
   $('weather-city').textContent=place.name;
   const cacheKey='daily-weather-v1:'+place.latitude+','+place.longitude;
   const cached=read(session,cacheKey);
   if(!force&&validCache(cached)){show(place,cached.weather,true);return;}
   const url=new URL('https://api.open-meteo.com/v1/forecast');
   for(const [k,v]of Object.entries({latitude:place.latitude,longitude:place.longitude,current:'temperature_2m,weather_code',daily:'temperature_2m_max,temperature_2m_min',timezone:'auto',forecast_days:1}))url.searchParams.set(k,v);
   const weather=weatherOf(await json(url));
   if(token!==generation)return;
   write(session,cacheKey,{at:Date.now(),weather});show(place,weather);
  }catch{
   if(token!==generation)return;current=place;
   $('weather-summary').textContent=place?'天气暂时不可用，请稍后重试。':'无法估算城市，请手动选择。';
   $('weather-info').textContent='不影响日历和待办使用。';
  }
 }
 $('weather-change').onclick=()=>{$('weather-form').hidden=!$('weather-form').hidden;if(!$('weather-form').hidden)$('weather-search').focus();};
 $('weather-retry').onclick=()=>load(current,true);
 $('weather-auto').onclick=()=>{try{local.removeItem('daily-weather-city-v1');}catch{}$('weather-results').replaceChildren();$('weather-form').hidden=true;load(null,true);};
 $('weather-form').onsubmit=async event=>{
  event.preventDefault();const query=$('weather-search').value.trim();
  if(query.length<2){$('weather-search-status').textContent='请输入至少两个字符的城市名称。';return;}
  const token=++searchGeneration;
  $('weather-search-status').textContent='正在查找城市…';$('weather-results').replaceChildren();
  try{
   const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.searchParams.set('name',query);url.searchParams.set('count','5');url.searchParams.set('language','zh');
   const data=await json(url);if(token!==searchGeneration)return;
   const results=data.results||[];
   $('weather-search-status').textContent=results.length?'请选择城市：':'没有找到，请试试城市英文名或加上省份。';
   for(const result of results){
    let place;try{place=locationOf(result,'manual');}catch{continue;}
    const button=document.createElement('button');button.type='button';button.textContent=[result.name,result.admin1,result.country].filter(Boolean).join(' · ');
    button.onclick=()=>{write(local,'daily-weather-city-v1',place);$('weather-form').hidden=true;load(place);};$('weather-results').append(button);
   }
  }catch{if(token===searchGeneration)$('weather-search-status').textContent='城市查询失败，请稍后重试。';}
 };
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastLoaded>TTL)load(current);});
 load();
}
if(typeof document!=='undefined'&&document.getElementById('weather-widget'))mountWeather();
