function createRequest(platform){
 return (url,options={})=>new Promise((resolve,reject)=>{
  platform.request({url,method:options.method||'GET',data:options.data,header:options.header||{},timeout:10000,
   success(response){
    if(response.statusCode>=200&&response.statusCode<300){resolve(response.data);return;}
    const data=response.data||{},error=new Error(data.msg||data.message||data.error_description||'请求失败，请稍后重试。');
    error.status=response.statusCode;reject(error);
   },
   fail(){reject(new Error('网络暂时不可用，请检查网络后重试。'));}
  });
 });
}
function query(values){return Object.entries(values).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');}
module.exports={createRequest,query};
