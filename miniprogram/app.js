const {createAccountService}=require('./utils/account');
App({
 onLaunch(){
  this.account=createAccountService(wx);
  this.ready=this.account.restore();
  this.networkListener=result=>{if(result.isConnected)this.account.sync();};
  wx.onNetworkStatusChange(this.networkListener);
 },
 onShow(){if(this.ready)this.ready.then(()=>this.account.sync());},
 onHide(){this.account?.suspend();}
});
