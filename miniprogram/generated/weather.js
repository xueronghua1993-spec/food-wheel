// Generated from H5 by scripts/build-miniprogram.cjs. Do not edit.
function locationOf(data,source='ip'){
 const latitude=Number(data.latitude),longitude=Number(data.longitude);
 const name=String(data.city||data.name||'').trim();
 if(data.success===false||data.latitude==null||data.longitude==null||!name||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('location');
 return {name:name.slice(0,80),latitude,longitude,source};
}
function describeWeather(code){
 if(code===0)return '晴';if([1,2,3].includes(code))return ['','晴间多云','局部多云','阴'][code];
 if([45,48].includes(code))return '雾';if([51,53,55,56,57].includes(code))return '毛毛雨';
 if([61,63,65,66,67,80,81,82].includes(code))return '雨';if([71,73,75,77,85,86].includes(code))return '雪';
 if([95,96,99].includes(code))return '雷雨';return '天气状况未知';
}
function weatherIcon(description){
 if(description==='晴')return '☀️';
 if(description.includes('多云'))return '🌤️';
 if(description==='阴')return '☁️';
 if(description==='雾')return '🌫️';
 if(description==='雷雨')return '⛈️';
 if(description==='雪')return '❄️';
 if(description.includes('雨'))return '🌧️';
 return '☁️';
}
function weatherOf(data){
 const current=data.current,daily=data.daily;
 if(!current||!daily||typeof current.temperature_2m!=='number'||!Number.isFinite(current.temperature_2m)||!Number.isFinite(daily.temperature_2m_max?.[0])||!Number.isFinite(daily.temperature_2m_min?.[0])||typeof current.time!=='string'||!daily.time?.[0])throw Error('weather');
 return {temperature:Math.round(current.temperature_2m),description:describeWeather(current.weather_code),high:Math.round(daily.temperature_2m_max[0]),low:Math.round(daily.temperature_2m_min[0]),time:current.time,date:daily.time[0],zone:data.timezone||'UTC'};
}

module.exports={locationOf,describeWeather,weatherIcon,weatherOf};
