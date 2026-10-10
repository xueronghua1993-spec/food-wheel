const {createWeather}=require('../../utils/weather');
Component({
 data:{weather:null,loading:false},
 lifetimes:{
  attached(){this.service=createWeather(wx,{automatic:true});this.active=true;this.sequence=0;this.loadWeather();},
  detached(){this.active=false;this.sequence++;this.service.invalidate();}
 },
 pageLifetimes:{
  show(){if(this.service){this.active=true;this.loadWeather();}},
  hide(){this.active=false;this.sequence++;this.service?.invalidate();this.setData({loading:false});}
 },
 methods:{
  async loadWeather(){
   if(!this.service||this.data.loading)return;
   const token=++this.sequence;this.setData({loading:true});
   try{const weather=await this.service.load();if(this.active&&token===this.sequence&&weather)this.setData({weather:{...weather,cityLabel:weather.source==='IP 估算'?'':weather.name}});}
   catch{if(this.active&&token===this.sequence)this.setData({weather:null});}
   finally{if(this.active&&token===this.sequence)this.setData({loading:false});}
  }
 }
});
