// JPEG encoders can round differently on ARM and x64. Compare decoded pixels
// for changed images while keeping exact checks for all generated code/data.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const sharp=require('sharp');
async function check(){
 const paths=execFileSync('git',['diff','--name-only','HEAD','--','miniprogram/generated','miniprogram/assets','miniprogram/photos-a','miniprogram/photos-b','miniprogram/photos-c'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 for(const path of paths){
  if(!path.endsWith('.jpg'))throw Error('Generated resource is stale: '+path);
  const before=execFileSync('git',['show','HEAD:'+path]);
  const a=await sharp(before).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const b=await sharp(fs.readFileSync(path)).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(JSON.stringify(a.info)!==JSON.stringify(b.info))throw Error('Generated image dimensions changed: '+path);
  let sum=0,max=0;for(let i=0;i<a.data.length;i++){const d=Math.abs(a.data[i]-b.data[i]);sum+=d;max=Math.max(max,d);}
  const mean=sum/a.data.length;
  if(max>8||mean>0.05)throw Error('Generated image is stale: '+path+' (max='+max+', mean='+mean+')');
  console.log('PASS: JPEG rounding tolerance: '+path+' (max='+max+', mean='+mean+')');
 }
 console.log('PASS: generated code/data match; image pixels match within encoder rounding tolerance.');
}
check().catch(error=>{console.error(error);process.exitCode=1;});
