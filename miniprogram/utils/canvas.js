const {palettes}=require('../generated/wheel'),{wrapText}=require('../generated/text');
function canvasNode(page,id){
 return new Promise((resolve,reject)=>wx.createSelectorQuery().in(page).select('#'+id).fields({node:true,size:true}).exec(results=>{
  const value=results?.[0];if(!value?.node){reject(Error('画布未能初始化，请重新打开页面。'));return;}resolve(value);
 }));
}
function drawWheel(ctx,size,items,mode,angle){
 const r=size/2,rotation=angle*Math.PI/180;ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(r,r);
 items.forEach((name,i)=>{
  const step=Math.PI*2/items.length,start=i*step-Math.PI/2+rotation;
  ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r-3,start,start+step);ctx.closePath();ctx.fillStyle=palettes[mode][i%6];ctx.fill();ctx.strokeStyle='#fffef8';ctx.lineWidth=1.5;ctx.stroke();
  const mid=start+step/2,x=Math.cos(mid)*r*.66,y=Math.sin(mid)*r*.66;
  const chars=Array.from(name),limit=items.length>=8?3:4,lines=[];for(let n=0;n<chars.length;n+=limit)lines.push(chars.slice(n,n+limit).join(''));
  const font=Math.min(18*size/320,(size*.59*Math.sin(Math.PI/items.length)-8)/Math.max(...lines.map(s=>Array.from(s).length)));
  ctx.fillStyle='#304638';ctx.font='600 '+font+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  lines.forEach((line,n)=>ctx.fillText(line,x,y+(n-(lines.length-1)/2)*(font+3)));
 });ctx.restore();
}
function loadPhoto(canvas,path){return new Promise((resolve,reject)=>{const image=canvas.createImage();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('照片未能载入'));image.src=path;});}
async function exportCalendar(page,entry,info,path){
 const {node:canvas}=await canvasNode(page,'export-canvas');let image;
 try{image=await loadPhoto(canvas,path);}catch{image=await loadPhoto(canvas,'/assets/fallback.jpg');}
 canvas.width=1080;const ctx=canvas.getContext('2d');ctx.font='54px serif';
 const lines=wrapText(ctx,entry.text,900);ctx.font='32px sans-serif';
 const sources=wrapText(ctx,entry.author+' · '+entry.work,900),quoteY=930,sourceY=quoteY+lines.length*82+24,dateY=sourceY+sources.length*48+100;
 canvas.height=dateY+240;ctx.fillStyle='#fcfff6';ctx.fillRect(0,0,1080,canvas.height);
 ctx.textBaseline='top';ctx.font='32px sans-serif';ctx.fillStyle='#617259';ctx.textAlign='left';ctx.fillText('日常小决定',60,48);ctx.textAlign='right';ctx.fillText('每日一页',1020,48);
 const ratio=Math.max(1080/image.width,720/image.height),sw=1080/ratio,sh=720/ratio;
 ctx.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,0,120,1080,720);
 ctx.textAlign='center';ctx.font='54px serif';ctx.fillStyle='#285744';lines.forEach((line,i)=>ctx.fillText(line,540,quoteY+i*82));
 ctx.font='32px sans-serif';ctx.fillStyle='#60705d';sources.forEach((line,i)=>ctx.fillText(line,540,sourceY+i*48));
 if(entry.type==='story'){ctx.font='28px sans-serif';ctx.fillText('故事概述 · 日常小决定',540,sourceY+sources.length*48+12);}
 ctx.strokeStyle='#d2d8c9';ctx.beginPath();ctx.moveTo(90,dateY-28);ctx.lineTo(990,dateY-28);ctx.stroke();
 ctx.textAlign='center';ctx.font='160px serif';ctx.fillStyle='#62854e';ctx.fillText(String(info.day).padStart(2,'0'),220,dateY+16);
 ctx.textAlign='left';ctx.font='40px sans-serif';ctx.fillStyle='#285744';ctx.fillText(info.year+'年'+info.month+'月'+info.day+'日',400,dateY+28);
 ctx.font='32px sans-serif';ctx.fillStyle='#60705d';ctx.fillText(info.weekday,400,dateY+90);if(info.lunar)ctx.fillText('农历'+info.lunar,400,dateY+142);
 return new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvas,fileType:'png',success:r=>resolve(r.tempFilePath),fail:()=>reject(Error('图片生成失败，请重试。'))},page));
}
module.exports={canvasNode,drawWheel,exportCalendar};
