// Generated files are committed so importing the native project needs no npm setup.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const repo=path.resolve(__dirname,'..'),out=path.join(repo,'miniprogram');
const read=name=>fs.readFileSync(path.join(repo,name),'utf8');
function write(name,value){const file=path.join(out,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
function commonJS(source,names){
 return '// Generated from H5 by scripts/build-miniprogram.cjs. Do not edit.\n'+source.replace(/^export /gm,'')+'\nmodule.exports={'+names.join(',')+'};\n';
}
async function build(){
 const html=read('index.html');
 const presets=html.match(/const presets=([^;]+);/),palettes=html.match(/const palettes=([^;]+);/);
 const start=html.indexOf('function validate('),end=html.indexOf('function loadMenu(');
 if(!presets||!palettes||start<0||end<=start)throw Error('H5 menu extraction changed; update the builder.');
 write('generated/wheel.js',commonJS('const presets='+presets[1]+';\nconst palettes='+palettes[1]+';\n'+html.slice(start,end),['presets','palettes','validate','nextRotation']));
 const sources=['index.html','calendar/account-store.mjs','calendar/calendar-core.mjs','calendar/calendar-todos.mjs','calendar/weather-ui.mjs','calendar/calendar-export.mjs','calendar/content.json'];
 write('generated/account-store.js',commonJS(read(sources[1]),['menuKeys','todoPrefix','uuid','createAccountStore']));
 write('generated/calendar-core.js',commonJS(read(sources[2]),['beijingDate','dateInfo','resolveDate','offsetDate','entryForDate']));
 const todos=read(sources[3]).split('export function mountTodos')[0].replace("import {uuid} from './account-store.mjs';","const {uuid}=require('./account-store');");
 write('generated/todos.js',commonJS(todos,['createTodoStore']));
 const weather=read(sources[4]).split('async function json(')[0].replace(/^const \$=.*\n/,'');
 write('generated/weather.js',commonJS(weather,['locationOf','describeWeather','weatherIcon','weatherOf']));
 write('generated/text.js',commonJS(read(sources[5]).split('function loadImage(')[0],['wrapText']));
 const catalog=JSON.parse(read(sources[6]));
 for(let i=0;i<catalog.entries.length;i++){
  const entry=catalog.entries[i],group='photos-'+['a','b','c'][Math.floor(i/30)];
  if(!group)throw Error('More than 90 photos: add another subpackage.');
  const filename=path.basename(entry.imagePath);
  const bytes=await sharp(path.join(repo,entry.imagePath)).resize({width:480,withoutEnlargement:true}).jpeg({quality:50,mozjpeg:true}).toBuffer();
  write(group+'/assets/'+filename,bytes);entry.imagePath='/'+group+'/assets/'+filename;entry.package=group;
 }
 write('generated/content.js','// Generated from H5 catalog.\nmodule.exports='+JSON.stringify(catalog)+';\n');
 write('assets/fallback.jpg',await sharp(path.join(repo,'calendar/assets/fallback.jpg')).resize({width:480,withoutEnlargement:true}).jpeg({quality:50,mozjpeg:true}).toBuffer());
 for(const group of ['photos-a','photos-b','photos-c']){
  write(group+'/loader.js','Page({});\n');write(group+'/loader.json','{"navigationBarTitleText":"日历照片"}\n');
  write(group+'/loader.wxml','<view>照片已准备好，请返回日历。</view>\n');write(group+'/loader.wxss','view{padding:48rpx;color:#285744;}\n');
 }
 const fingerprint=crypto.createHash('sha256');
 for(const name of sources)fingerprint.update(name).update(read(name));
 for(const name of fs.readdirSync(path.join(repo,'calendar/assets')).sort())fingerprint.update(name).update(fs.readFileSync(path.join(repo,'calendar/assets',name)));
 write('generated/source.json',JSON.stringify({sha256:fingerprint.digest('hex'),entries:catalog.entries.length},null,2)+'\n');
 const size=dir=>fs.readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?size(path.join(dir,e.name)):fs.statSync(path.join(dir,e.name)).size),0);
 let photos=0;for(const group of ['photos-a','photos-b','photos-c']){const n=size(path.join(out,group));if(n>=2*1024*1024)throw Error(group+' exceeds 2 MB');photos+=n;console.log(group+': '+n+' bytes');}
 const total=size(out);if(total>=2*1024*1024)throw Error('WeChat package size limit exceeded');
 console.log('PASS: '+catalog.entries.length+' calendar entries; main '+total+' bytes, total '+total+' bytes');
}
build().catch(error=>{console.error(error);process.exitCode=1;});
