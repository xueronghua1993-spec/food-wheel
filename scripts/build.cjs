const fs=require('node:fs');
const sharp=require('sharp');
async function build(){
 fs.mkdirSync('public',{recursive:true});
 const source=fs.readFileSync('index.html','utf8');
 const fingerprint=require('node:crypto').createHash('sha256').update(source);
 function hashDirectory(dir){
  for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const filename=dir+'/'+item.name;
   if(item.isDirectory())hashDirectory(filename);
   else fingerprint.update(filename).update(fs.readFileSync(filename));
  }
 }
 hashDirectory('calendar');
 hashDirectory('ai');
 const version=fingerprint.digest('hex').slice(0,12);
 fs.cpSync('calendar','public/calendar',{recursive:true});
 fs.mkdirSync('public/ai',{recursive:true});
 for(const name of ['config.mjs','meal-rules.mjs','meal-ui.mjs','meal.css'])fs.copyFileSync('ai/'+name,'public/ai/'+name);
 const html=source.replace("const buildVersion='__BUILD_VERSION__';","const buildVersion='"+version+"';")
  .replaceAll('./calendar/calendar.css','./calendar/calendar.css?v='+version)
  .replaceAll('./calendar/calendar-ui.mjs','./calendar/calendar-ui.mjs?v='+version)
  .replaceAll('./calendar/weather-ui.mjs','./calendar/weather-ui.mjs?v='+version)
  .replaceAll('./ai/meal.css','./ai/meal.css?v='+version)
  .replaceAll('./ai/meal-ui.mjs','./ai/meal-ui.mjs?v='+version);
 const mealFile='public/ai/meal-ui.mjs';
 fs.writeFileSync(mealFile,fs.readFileSync(mealFile,'utf8').replace(/(\.\/[^'"\s]+\.mjs)(?=['"])/g,'$1?v='+version));
 for(const name of ['calendar-ui.mjs','calendar-export.mjs','calendar-todos.mjs','weather-ui.mjs']){
  const filename='public/calendar/'+name;
  const code=fs.readFileSync(filename,'utf8').replace(/(\.\/[^'"\s]+\.(?:mjs|json|jpg))(?=['"])/g,'$1?v='+version);
  fs.writeFileSync(filename,code);
 }
 const catalog=JSON.parse(fs.readFileSync('public/calendar/content.json','utf8'));
 for(const entry of catalog.entries)entry.imagePath+='?v='+version;
 fs.writeFileSync('public/calendar/content.json',JSON.stringify(catalog));
 fs.writeFileSync('public/index.html',html);
 fs.writeFileSync('public/release.json',JSON.stringify({version}));
 fs.copyFileSync('logo.svg','public/logo.svg');
 fs.copyFileSync('566c863115e216b54f908af769b51080.txt','public/566c863115e216b54f908af769b51080.txt');
 fs.copyFileSync('e33e810e10527a1d51a0341534a9b38d.txt','public/e33e810e10527a1d51a0341534a9b38d.txt');
 await sharp('share-card.svg').png().toFile('public/share-card.png');
 await sharp('logo.svg').resize(180,180).png().toFile('public/apple-touch-icon.png');
 const info=await sharp('public/share-card.png').metadata();
 if(info.width!==1200||info.height!==630)throw new Error('Wrong share card dimensions');
 console.log('PASS: public assets and 1200×630 PNG');
}
build().catch(error=>{console.error(error);process.exit(1);});
