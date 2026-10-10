const {createStorage}=require('./utils/storage');
App({
 onLaunch(){this.store=createStorage(wx);}
});
