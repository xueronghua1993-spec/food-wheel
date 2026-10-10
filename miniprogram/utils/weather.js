const {createRequest,query}=require('./request'),config=require('../config');
const {locationOf,weatherOf,weatherIcon}=require('../generated/weather');
function createWeather(platform){
 const request=createRequest(platform);let generation=0;
 return {
  invalidate(){generation++;},
  async load(force=false){
   const current=++generation;
   let place;try{place=locationOf(platform.getStorageSync('daily-weather-city-v1'),'manual');}catch{}
   if(!place)place=locationOf(await request(config.ipURL));
   if(current!==generation)return null;
   const cacheKey='mini-weather-v1:'+place.latitude+','+place.longitude;
   let cached;try{cached=platform.getStorageSync(cacheKey);}catch{}
   const data=!force&&cached&&Date.now()-cached.at>=0&&Date.now()-cached.at<15*60000?cached.weather:weatherOf(await request(config.weatherURL+'?'+query({latitude:place.latitude,longitude:place.longitude,current:'temperature_2m,weather_code',daily:'temperature_2m_max,temperature_2m_min',timezone:'auto',forecast_days:1})));
   if(current!==generation)return null;
   try{platform.setStorageSync(cacheKey,{at:Date.now(),weather:data});}catch{}
   return {...data,name:place.name,icon:weatherIcon(data.description),source:place.source==='ip'?'IP 估算':'手动选择'};
  },
  async search(name){const response=await request(config.geocodingURL+'?'+query({name,count:5,language:'zh'}));return (response.results||[]).map(x=>({...locationOf(x,'manual'),label:[x.name,x.admin1,x.country].filter(Boolean).join(' · ')}));},
  choose(place){platform.setStorageSync('daily-weather-city-v1',locationOf(place,'manual'));generation++;},
  auto(){platform.removeStorageSync('daily-weather-city-v1');generation++;}
 };
}
module.exports={createWeather};
