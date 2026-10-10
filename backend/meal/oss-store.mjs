// SDK is loaded only in the real cloud runtime; unit tests supply an atomic store.
export async function createOssStore(env=process.env){
 if(!env.OSS_BUCKET||!/^oss-cn-[a-z0-9-]+$/.test(env.OSS_REGION||''))throw Error('missing OSS configuration');
 const credentials=()=>{
  const accessKeyId=env.ALIBABA_CLOUD_ACCESS_KEY_ID,accessKeySecret=env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,stsToken=env.ALIBABA_CLOUD_SECURITY_TOKEN;
  if(!accessKeyId||!accessKeySecret||!stsToken)throw Error('function role required');
  return {accessKeyId,accessKeySecret,stsToken};
 };
 const {default:OSS}=await import('ali-oss');
 const makeClient=()=>new OSS({region:env.OSS_REGION,bucket:env.OSS_BUCKET,secure:true,timeout:5000,...credentials()});
 return {
  async read(key){try{const result=await makeClient().get(key);if(result.content.length>65536)throw Error('oversized ledger');return result.content.toString('utf8');}catch(e){if(e.code==='NoSuchKey')return '';throw e;}},
  async append(key,line,position){try{await makeClient().append(key,Buffer.from(line),{position,headers:{'Content-Type':'application/x-ndjson'}});return true;}catch(e){if(e.code==='PositionNotEqualToLength')return false;throw e;}}
 };
}
