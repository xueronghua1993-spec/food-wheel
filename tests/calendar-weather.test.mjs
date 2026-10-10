import test from 'node:test';
import assert from 'node:assert/strict';
import {locationOf,weatherOf,describeWeather} from '../calendar/weather-ui.mjs';
test('IP coordinates and WMO weather descriptions',()=>{
 assert.equal(locationOf({success:true,city:'杭州',latitude:30,longitude:120}).source,'ip');
 assert.throws(()=>locationOf({success:false,city:'杭州',latitude:30,longitude:120}));
 assert.throws(()=>locationOf({city:'杭州',latitude:100,longitude:120}));
 assert.equal(describeWeather(95),'雷雨');assert.equal(describeWeather(1234),'天气状况未知');
});
test('valid weather is rounded and bad data is rejected',()=>{
 const weather=weatherOf({timezone:'Asia/Shanghai',current:{temperature_2m:22.4,weather_code:2,time:'2026-10-10T10:00'},daily:{temperature_2m_max:[25.3],temperature_2m_min:[18.6],time:['2026-10-10']}});
 assert.equal(weather.temperature,22);assert.equal(weather.high,25);assert.equal(weather.low,19);
 assert.throws(()=>weatherOf({current:{temperature_2m:NaN}}));
});
