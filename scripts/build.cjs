const fs=require('node:fs');
const sharp=require('sharp');
async function build(){
 fs.mkdirSync('public',{recursive:true});
 const source=fs.readFileSync('index.html','utf8');
 const version=require('node:crypto').createHash('sha256').update(source).digest('hex').slice(0,12);
 const html=source.replace("const buildVersion='__BUILD_VERSION__';","const buildVersion='"+version+"';");
 fs.writeFileSync('public/index.html',html);
 fs.writeFileSync('public/release.json',JSON.stringify({version}));
 fs.copyFileSync('logo.svg','public/logo.svg');
 fs.copyFileSync('e33e810e10527a1d51a0341534a9b38d.txt','public/e33e810e10527a1d51a0341534a9b38d.txt');
 await sharp('share-card.svg').png().toFile('public/share-card.png');
 await sharp('logo.svg').resize(180,180).png().toFile('public/apple-touch-icon.png');
 const info=await sharp('public/share-card.png').metadata();
 if(info.width!==1200||info.height!==630)throw new Error('Wrong share card dimensions');
 console.log('PASS: public assets and 1200×630 PNG');
}
build().catch(error=>{console.error(error);process.exit(1);});
