const catalog=require('../../generated/content');
const {today,dateInfo,resolveDate,offsetDate,entryForDate}=require('../../utils/dates');
const {createTodoStore}=require('../../generated/todos'),{exportCalendar}=require('../../utils/canvas');
Page({
 data:{today:'',selected:'',firstDate:catalog.historyStart||catalog.firstDate,entry:null,info:{},photo:'/assets/fallback.jpg',photoLoading:false,photoError:'',view:'paper',fullOpen:false,todos:[],done:0,todoInput:'',todoError:'',readOnly:false,status:'',saving:false,previewPath:'',albumDenied:false},
 onLoad(options){
  this.todos=createTodoStore(getApp().store);this.generation=0;
  wx.showShareMenu?.({menus:['shareAppMessage','shareTimeline']});
  const now=today();this.setData({today:now});this.select(resolveDate(options.date,now,this.data.firstDate));
 },
 onShow(){
  this._active=true;
  this.refreshDate();this.readTodos();this.setData({status:'保存在此设备。'});
  this.midnightTimer=setInterval(()=>this.refreshDate(),30000);
 },
 onHide(){this._active=false;clearInterval(this.midnightTimer);},
 onUnload(){this.onHide();this.generation++;},
 refreshDate(){const now=today();if(now!==this.data.today){const wasToday=this.data.selected===this.data.today;this.setData({today:now});this.select(wasToday?now:this.data.selected);}},
 select(date){
  const now=today(),selected=resolveDate(date,now,this.data.firstDate),entry=entryForDate(selected,catalog),info=dateInfo(selected),generation=++this.generation;
  this.setData({today:now,selected,entry,info,readOnly:selected!==now,photo:entry?.imagePath||'/assets/fallback.jpg',photoLoading:false,photoError:'',fullOpen:false,todoInput:'',todoError:'',previewPath:'',albumDenied:false});this.readTodos();
 },
 readTodos(){
  const state=this.todos.select(this.data.selected);this.setData({todos:state.items,done:state.items.filter(x=>x.done).length,todoError:state.error,readOnly:this.data.selected!==today()});
 },
 prev(){if(this.data.saving)return;if(this.data.selected>this.data.firstDate)this.select(offsetDate(this.data.selected,-1));},
 next(){if(this.data.saving)return;if(this.data.selected<this.data.today)this.select(offsetDate(this.data.selected,1));},
 goToday(){if(!this.data.saving)this.select(today());},
 pickDate(event){if(!this.data.saving)this.select(event.detail.value);},
 switchView(event){const view=event.currentTarget.dataset.view;if(['paper','todos'].includes(view))this.setData({view});},
 toggleFull(){this.setData({fullOpen:!this.data.fullOpen});},
 inputTodo(event){this.setData({todoInput:event.detail.value});},
 canEdit(){return this.data.selected===today();},
 addTodo(){if(!this.canEdit())return;const result=this.todos.add(this.data.todoInput);if(result.error&&!result.items){this.setData({todoError:result.error});return;}this.setData({todoInput:''});this.readTodos();},
 toggleTodo(event){if(!this.canEdit())return;this.todos.toggle(event.currentTarget.dataset.id);this.readTodos();},
 removeTodo(event){if(!this.canEdit())return;this.todos.remove(event.currentTarget.dataset.id);this.readTodos();},
 photoError(){this.setData({photo:'/assets/fallback.jpg',photoError:'照片未能载入，暂用备用画面。',photoLoading:false});},
 retryPhoto(){if(!this.data.saving)this.select(this.data.selected);},
 async saveImage(){
  if(this.data.saving||!this.data.entry)return;this.setData({saving:true,albumDenied:false});
  const entry=this.data.entry,info=this.data.info,photo=this.data.photo;
  try{const previewPath=await exportCalendar(this,entry,info,photo);this.setData({previewPath});wx.showToast({title:'图片已生成',icon:'success'});}
  catch(error){wx.showToast({title:error.message||'图片生成失败，请重试',icon:'none'});}
  finally{this.setData({saving:false});}
 },
 previewImage(){if(this.data.previewPath)wx.previewImage({urls:[this.data.previewPath],current:this.data.previewPath});},
 saveAlbum(){
  if(!this.data.previewPath||this.data.saving)return;this.setData({saving:true});
  wx.saveImageToPhotosAlbum({filePath:this.data.previewPath,
   success:()=>{this.setData({albumDenied:false});wx.showToast({title:'已保存到相册',icon:'success'});},
   fail:error=>{
    const message=String(error.errMsg||'');
    if(/cancel/i.test(message)){wx.showToast({title:'已取消保存',icon:'none'});return;}
    this.setData({albumDenied:/auth|denied/i.test(message)});wx.showToast({title:/auth|denied/i.test(message)?'请允许保存到相册':'保存失败，可预览图片后保存',icon:'none'});
   },complete:()=>this.setData({saving:false})
  });
 },
 openSettings(){wx.openSetting({success:result=>{if(result.authSetting['scope.writePhotosAlbum']){this.setData({albumDenied:false});this.saveAlbum();}}});},
 closePreview(){if(!this.data.saving)this.setData({previewPath:'',albumDenied:false});},
 onShareAppMessage(){return {title:'每日一页 · '+this.data.selected,path:'/pages/calendar/calendar?date='+this.data.selected};},
 onShareTimeline(){return {title:'每日一页 · '+this.data.selected,query:'date='+this.data.selected};}
});
