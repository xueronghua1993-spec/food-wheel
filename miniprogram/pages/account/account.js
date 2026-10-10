const config=require('../../config');
Page({
 data:{user:null,status:'',pending:0,importNeeded:false,screen:'login',email:'',password:'',message:'',busy:false},
 onLoad(){this.account=getApp().account;},
 onShow(){this._active=true;this.unsubscribe=this.account.subscribe(state=>this.setData(state));this.setData(this.account.state());},
 onHide(){this._active=false;this.unsubscribe?.();this.unsubscribe=null;},
 onUnload(){this.onHide();},
 switchScreen(event){if(!this.data.busy)this.setData({screen:event.currentTarget.dataset.screen,password:'',message:''});},
 emailInput(event){this.setData({email:event.detail.value});},
 passwordInput(event){this.setData({password:event.detail.value});},
 async submit(){
  if(this.data.busy)return;const screen=this.data.screen,email=this.data.email.trim(),password=this.data.password;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){this.setData({message:'请填写有效的邮箱地址。'});return;}
  if(screen!=='reset'&&Array.from(password).length<8){this.setData({message:'本站登录密码至少需要 8 个字符。'});return;}
  this.setData({busy:true,message:'正在处理…'});
  try{
   if(screen==='login'){await this.account.login(email,password);this.setData({password:'',message:''});}
   else if(screen==='signup'){const result=await this.account.signup(email,password);this.setData({password:'',screen:result.verify?'verify':'login',message:result.verify?'':'注册成功。'});}
   else if(screen==='reset'){await this.account.reset(email);this.setData({password:'',screen:'resetSent',message:''});}
   this.setData(this.account.state());
  }catch(error){this.setData({message:error.message||'操作失败，请重试。'});}
  finally{this.setData({busy:false});}
 },
 async sync(){if(this.data.busy)return;this.setData({busy:true});try{await this.account.sync();this.setData(this.account.state());}finally{this.setData({busy:false});}},
 importGuest(){if(this.data.busy)return;wx.showModal({title:'导入游客数据？',content:'已有云端菜单保留，待办追加。此设备的游客数据也会保留。',success:async result=>{if(!result.confirm)return;this.setData({busy:true});try{await this.account.importGuest();this.setData({...this.account.state(),message:''});}catch{this.setData({message:'导入未能保存，请重试。'});}finally{this.setData({busy:false});}}});},
 skipImport(){try{this.account.skipImport();this.setData(this.account.state());}catch{this.setData({message:'选择未能保存，请重试。'});}},
 logout(){if(this.data.busy)return;const finish=()=>{try{this.account.logout();this.setData({...this.account.state(),screen:'login',password:'',message:'已退出，回到游客模式。'});}catch{this.setData({message:'退出未能完成，请重试。'});}};if(this.account.state().pending)wx.showModal({title:'部分修改尚未同步',content:'退出后仍保留在此设备，下次登录可继续上传。是否退出？',success:r=>{if(r.confirm)finish();}});else finish();},
 copySite(){wx.setClipboardData({data:config.siteURL});}
});
