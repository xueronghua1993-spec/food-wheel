const {presets,validate,nextRotation}=require('../../generated/wheel');
const {menuKeys,todoPrefix}=require('../../generated/account-store');
const {today,dateInfo,entryForDate}=require('../../utils/dates'),catalog=require('../../generated/content');
const {createWeather}=require('../../utils/weather'),{canvasNode,drawWheel}=require('../../utils/canvas');
Page({
 data:{mode:'food',menu:presets.food,busy:false,winner:'',notice:'',editing:false,draft:[],draftRows:[],editError:'',status:'游客模式',logged:false,miniText:'',miniDate:'',miniPhoto:'/assets/fallback.jpg',todoCount:'0/0',weather:null,weatherMessage:'天气获取中…',weatherOpen:false,cityInput:'',cities:[],cityMessage:''},
 onLoad(){this.account=getApp().account;this.weather=createWeather(wx);this.rotation=0;wx.showShareMenu?.({menus:['shareAppMessage','shareTimeline']});},
 onReady(){canvasNode(this,'wheel').then(({node,width})=>{
  this.canvas=node;this.size=width;const dpr=wx.getWindowInfo().pixelRatio;node.width=width*dpr;node.height=width*dpr;this.ctx=node.getContext('2d');this.ctx.scale(dpr,dpr);this.paint();
 }).catch(()=>this.setData({notice:'转盘画面未能载入，仍可点击按钮随机选择。'}));},
 onShow(){
  this._active=true;this.account=this.account||getApp().account;
  this.unsubscribe=this.account.subscribe(()=>{this.setData({status:this.account.state().status,logged:!!this.account.state().user});if(!this.data.busy&&!this.data.editing)this.reload();});
  this.reload();this.loadWeather();
 },
 onHide(){this._active=false;this.unsubscribe?.();this.unsubscribe=null;this.finishSpin?.();this.weather?.invalidate();this.weatherToken=(this.weatherToken||0)+1;this.photoToken=(this.photoToken||0)+1;this.searchToken=(this.searchToken||0)+1;},
 onUnload(){this.onHide();clearTimeout(this.frame);},
 reload(){
  const account=this.account||getApp().account,state=account.state();let menu=[...presets[this.data.mode]],notice='';
  try{const values=JSON.parse(account.store.getItem(menuKeys[this.data.mode]));if(values!==null){if(!Array.isArray(values)||values.some(x=>typeof x!=='string')||validate(values).error)throw Error('invalid');menu=validate(values).items;}}
  catch{notice='保存的选项无法读取，已使用默认选项。';}
  const changed=JSON.stringify(menu)!==JSON.stringify(this.data.menu);
  if(changed&&this.data.winner)notice='菜单已更新，请重新选择。';
  const day=today(),entry=entryForDate(day,catalog),info=dateInfo(day);let todos=[];
  try{todos=JSON.parse(account.store.getItem(todoPrefix+day)||'[]');if(!Array.isArray(todos))todos=[];}catch{}
  this.setData({menu,notice,winner:changed?'':this.data.winner,status:state.status,logged:!!state.user,miniText:entry?.text||'好好过今天。',miniDate:info.month+'月'+info.day+'日 · '+info.weekday,todoCount:todos.filter(x=>x.done).length+'/'+todos.length});this.paint();
  const photoToken=this.photoToken=(this.photoToken||0)+1;
  if(entry)wx.loadSubpackage?.({name:entry.package,success:()=>{if(this._active&&photoToken===this.photoToken)this.setData({miniPhoto:entry.imagePath});},fail:()=>{}});
 },
 paint(){if(this.ctx)drawWheel(this.ctx,this.size,this.data.menu,this.data.mode,this.rotation||0);},
 switchMode(event){if(this.data.busy||this.data.editing)return;const mode=event.currentTarget.dataset.mode;if(!presets[mode]||mode===this.data.mode)return;this.rotation=0;this.setData({mode,winner:''});this.reload();},
 spin(){
  if(this.data.busy||this.data.editing)return;
  const items=[...this.data.menu],mode=this.data.mode,index=Math.floor(Math.random()*items.length),from=this.rotation||0,target=nextRotation(from,index,items.length),started=Date.now();
  this.setData({busy:true,winner:''});let done=false;
  const finish=()=>{if(done)return;done=true;clearTimeout(this.frame);this.rotation=target;this.paint();this.setData({busy:false,winner:items[index]});this.finishSpin=null;if(this._active)this.reload();};
  this.finishSpin=finish;
  const animate=()=>{if(done)return;const progress=Math.min((Date.now()-started)/3000,1);this.rotation=from+(target-from)*(1-Math.pow(1-progress,4));if(this.ctx)drawWheel(this.ctx,this.size,items,mode,this.rotation);if(progress===1)finish();else this.frame=setTimeout(animate,32);};animate();
 },
 editMenu(){if(this.data.busy)return;this.rowSequence=0;this.setData({editing:true,draft:[...this.data.menu],draftRows:this.data.menu.map(value=>({id:++this.rowSequence,value})),editError:''});},
 cancelEdit(){this.setData({editing:false,editError:''});this.reload();},
 draftInput(event){const draft=[...this.data.draft],draftRows=this.data.draftRows.map(row=>({...row})),index=event.currentTarget.dataset.index;draft[index]=event.detail.value;draftRows[index].value=event.detail.value;this.setData({draft,draftRows,editError:''});},
 addOption(){if(this.data.draft.length<10)this.setData({draft:[...this.data.draft,''],draftRows:[...this.data.draftRows,{id:++this.rowSequence,value:''}]});},
 removeOption(event){const draft=[...this.data.draft],draftRows=[...this.data.draftRows],index=event.currentTarget.dataset.index;draft.splice(index,1);draftRows.splice(index,1);this.setData({draft,draftRows,editError:''});},
 saveMenu(){
  const checked=validate(this.data.draft);if(checked.error){this.setData({editError:checked.error});return;}
  try{(this.account||getApp().account).store.setItem(menuKeys[this.data.mode],JSON.stringify(checked.items));this.setData({menu:checked.items,editing:false,winner:'',editError:'',notice:''});this.paint();}
  catch{this.setData({editError:'菜单未能保存，请检查设备存储后重试。'});}
 },
 resetMenu(){if(this.data.busy||this.data.editing)return;wx.showModal({title:'恢复默认菜单？',content:'当前自定义选项会被替换。',success:r=>{if(!r.confirm)return;try{this.account.store.setItem(menuKeys[this.data.mode],JSON.stringify(presets[this.data.mode]));this.setData({winner:''});this.reload();}catch{this.setData({notice:'默认菜单未能保存，请重试。'});}}});},
 openCalendar(){if(!this.data.busy)wx.navigateTo({url:'/pages/calendar/calendar'});},
 openAccount(){if(!this.data.busy&&!this.data.editing)wx.navigateTo({url:'/pages/account/account'});},
 async loadWeather(force=false){
  if(!this.weather)return;const token=this.weatherToken=(this.weatherToken||0)+1;this.setData({weatherMessage:'天气获取中…'});
  try{const value=await this.weather.load(force);if(value&&this._active&&token===this.weatherToken)this.setData({weather:value,weatherMessage:''});}
  catch{if(this._active&&token===this.weatherToken)this.setData({weatherMessage:'天气暂不可用，可选择城市或重试。'});}
 },
 toggleWeather(){this.setData({weatherOpen:!this.data.weatherOpen});},
 cityInput(event){this.searchToken=(this.searchToken||0)+1;this.setData({cityInput:event.detail.value});},
 async searchCity(){
  const name=this.data.cityInput.trim();if(name.length<2){this.setData({cityMessage:'请输入至少两个字符的城市名称。'});return;}
  const token=this.searchToken=(this.searchToken||0)+1;this.setData({cityMessage:'查找城市中…',cities:[]});
  try{const cities=await this.weather.search(name);if(token===this.searchToken&&this._active)this.setData({cities,cityMessage:cities.length?'请选择城市：':'未找到城市，可试试英文名。'});}
  catch{if(token===this.searchToken&&this._active)this.setData({cityMessage:'查询失败，请稍后重试。'});}
 },
 chooseCity(event){try{this.searchToken=(this.searchToken||0)+1;this.weather.choose(this.data.cities[event.currentTarget.dataset.index]);this.setData({weatherOpen:false,cities:[]});this.loadWeather();}catch{this.setData({cityMessage:'城市未能保存，请重试。'});}},
 autoWeather(){try{this.weather.auto();this.setData({weatherOpen:false});this.loadWeather(true);}catch{this.setData({cityMessage:'城市设置未能清除，请重试。'});}},
 retryWeather(){this.loadWeather(true);},
 imageError(){this.setData({miniPhoto:'/assets/fallback.jpg'});},
 onShareAppMessage(){return {title:'今天吃什么？把纠结留给转盘',path:'/pages/index/index'};},
 onShareTimeline(){return {title:'日常小决定 · 今天吃什么？'};}
});
