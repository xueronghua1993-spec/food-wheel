const {createWeather}=require('../../utils/weather');
Component({
 data:{weather:null,loading:false,error:'',enabled:false},
 lifetimes:{attached(){this.service=createWeather(wx);this.active=true;this.sequence=0;let enabled=false;try{enabled=wx.getStorageSync('mini-weather-enabled-v1')===true;}catch{}this.setData({enabled});if(enabled)this.loadWeather();},detached(){this.active=false;this.sequence++;this.service.invalidate();}},
 pageLifetimes:{show(){if(this.service&&this.data.enabled){this.active=true;this.loadWeather();}},hide(){this.sequence++;this.service?.invalidate();this.setData({loading:false});}},
 methods:{
  async loadWeather(force=false){if(!this.service||this.data.loading&&!force)return;const token=++this.sequence;this.setData({loading:true,error:'',enabled:true});try{wx.setStorageSync('mini-weather-enabled-v1',true);}catch{}
   try{const weather=await this.service.load(force);if(this.active&&token===this.sequence&&weather)this.setData({weather});}
   catch{if(this.active&&token===this.sequence)this.setData({error:'天气暂时不可用，点击重试'});}
   finally{if(this.active&&token===this.sequence)this.setData({loading:false});}
  },
  refresh(){this.loadWeather(true);},
  chooseCity(){wx.showModal({title:'选择天气城市',editable:true,placeholderText:'输入城市，例如杭州',confirmText:'搜索',success:async result=>{if(!result.confirm)return;const name=String(result.content||'').trim();if(!name)return;const token=++this.sequence;this.service.invalidate();this.setData({loading:true,error:''});try{const places=await this.service.search(name);if(!this.active||token!==this.sequence)return;if(!places.length){this.setData({error:'没有找到这个城市，请换个名称'});return;}wx.showActionSheet({itemList:places.map(x=>x.label),success:result=>{if(!this.active)return;try{this.service.choose(places[result.tapIndex]);this.loadWeather(true);}catch{this.setData({error:'城市未能保存，请重试'});}}});}catch{if(this.active&&token===this.sequence)this.setData({error:'城市搜索暂时不可用，请重试'});}finally{if(this.active&&token===this.sequence)this.setData({loading:false});}}});}
 }
});
