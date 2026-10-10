const {presets,validate,nextRotation}=require('../../generated/wheel');
const {menuKeys,todoPrefix}=require('../../generated/account-store');
const {today,dateInfo,entryForDate}=require('../../utils/dates'),catalog=require('../../generated/content');
const {canvasNode,drawWheel}=require('../../utils/canvas');
Page({
 data:{mode:'food',menu:presets.food,busy:false,winner:'',notice:'',editing:false,draft:[],draftRows:[],editError:'',miniText:'',miniDate:'',miniPhoto:'/assets/fallback.jpg',todoCount:'0/0'},
 onLoad(){this.store=getApp().store;this.rotation=0;wx.showShareMenu?.({menus:['shareAppMessage','shareTimeline']});},
 onReady(){canvasNode(this,'wheel').then(({node,width})=>{
  this.canvas=node;this.size=width;const dpr=wx.getWindowInfo().pixelRatio;node.width=width*dpr;node.height=width*dpr;this.ctx=node.getContext('2d');this.ctx.scale(dpr,dpr);this.paint();
 }).catch(()=>this.setData({notice:'转盘画面未能载入，仍可点击按钮随机选择。'}));},
 onShow(){
  this._active=true;this.store=this.store||getApp().store;this.reload();
 },
 onHide(){this._active=false;this.finishSpin?.();this.photoToken=(this.photoToken||0)+1;},
 onUnload(){this.onHide();clearTimeout(this.frame);},
 reload(){
  const store=this.store||getApp().store;let menu=[...presets[this.data.mode]],notice='';
  try{const values=JSON.parse(store.getItem(menuKeys[this.data.mode]));if(values!==null){if(!Array.isArray(values)||values.some(x=>typeof x!=='string')||validate(values).error)throw Error('invalid');menu=validate(values).items;}}
  catch{notice='保存的选项无法读取，已使用默认选项。';}
  const changed=JSON.stringify(menu)!==JSON.stringify(this.data.menu);
  if(changed&&this.data.winner)notice='菜单已更新，请重新选择。';
  const day=today(),entry=entryForDate(day,catalog),info=dateInfo(day);let todos=[];
  try{todos=JSON.parse(store.getItem(todoPrefix+day)||'[]');if(!Array.isArray(todos))todos=[];}catch{}
  this.setData({menu,notice,winner:changed?'':this.data.winner,miniText:entry?.text||'好好过今天。',miniDate:info.month+'月'+info.day+'日 · '+info.weekday,todoCount:todos.filter(x=>x.done).length+'/'+todos.length});this.paint();
  this.setData({miniPhoto:entry?.imagePath||'/assets/fallback.jpg'});
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
  try{(this.store||getApp().store).setItem(menuKeys[this.data.mode],JSON.stringify(checked.items));this.setData({menu:checked.items,editing:false,winner:'',editError:'',notice:''});this.paint();}
  catch{this.setData({editError:'菜单未能保存，请检查设备存储后重试。'});}
 },
 resetMenu(){if(this.data.busy)return;wx.showModal({title:'恢复默认菜单？',content:'当前自定义选项会被替换。',success:r=>{if(!r.confirm)return;try{this.store.setItem(menuKeys[this.data.mode],JSON.stringify(presets[this.data.mode]));this.setData({winner:'',editing:false,editError:''});this.reload();}catch{this.setData(this.data.editing?{editError:'默认菜单未能保存，请重试。'}:{notice:'默认菜单未能保存，请重试。'});}}});},
 openCalendar(){if(!this.data.busy)wx.navigateTo({url:'/pages/calendar/calendar'});},
 imageError(){this.setData({miniPhoto:'/assets/fallback.jpg'});},
 onShareAppMessage(){return {title:'今天吃什么？把纠结留给转盘',path:'/pages/index/index'};},
 onShareTimeline(){return {title:'日常小决定 · 今天吃什么？'};}
});
