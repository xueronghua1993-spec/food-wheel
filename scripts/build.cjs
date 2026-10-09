const fs=require('node:fs');
const sharp=require('sharp');
async function build(){
 fs.mkdirSync('public',{recursive:true});
 fs.copyFileSync('index.html','public/index.html');
 fs.copyFileSync('logo.svg','public/logo.svg');
 await sharp('share-card.svg').png().toFile('public/share-card.png');
 await sharp('logo.svg').resize(180,180).png().toFile('public/apple-touch-icon.png');
 const info=await sharp('public/share-card.png').metadata();
 if(info.width!==1200||info.height!==630)throw new Error('Wrong share card dimensions');
 console.log('PASS: public assets and 1200×630 PNG');
}
build().catch(error=>{console.error(error);process.exit(1);});
