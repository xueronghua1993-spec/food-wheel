export function wrapText(ctx,text,maxWidth){
 const result=[];const punctuation=/^[，。？！、；：）】》”’]/;
 for(const paragraph of String(text).split('\n')){
  if(!paragraph){result.push('');continue;}
  let line='';
  for(const char of paragraph){
   if(line&&ctx.measureText(line+char).width>maxWidth){
    if(punctuation.test(char)&&Array.from(line).length>1){
     const chars=Array.from(line);const last=chars.pop();result.push(chars.join(''));line=last+char;
    }else{result.push(line);line=char;}
   }else line+=char;
  }
  if(line)result.push(line);
 }
 return result;
}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('图片未能载入'));image.src=url;});}
export async function renderCalendarImage(entry,info){
 await document.fonts.ready;
 let image;try{image=await loadImage(entry.imagePath);}catch{image=await loadImage('./calendar/assets/fallback.jpg');}
 const canvas=document.createElement('canvas');canvas.width=1080;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器暂不支持保存图片');
 const font='"Noto Serif CJK SC","Songti SC","SimSun",serif';
 ctx.font=`54px ${font}`;
 const lines=wrapText(ctx,entry.text,900);
 ctx.font='32px sans-serif';const sourceLines=wrapText(ctx,`${entry.author} · ${entry.work}`,900);
 const paperH=120,photoH=720,quoteY=paperH+photoH+90,lineH=82;
 const sourceY=quoteY+lines.length*lineH+24;
 const dateY=sourceY+sourceLines.length*48+100;
 canvas.height=dateY+240;
 ctx.fillStyle='#fcfff6';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.textBaseline='top';ctx.fillStyle='#617259';ctx.font='32px sans-serif';ctx.textAlign='left';ctx.fillText('日常小决定',60,48);ctx.textAlign='right';ctx.fillText('每日一页',1020,48);ctx.fillStyle='#263e33';ctx.beginPath();ctx.arc(540,60,15,0,Math.PI*2);ctx.fill();
 const ratio=Math.max(1080/image.naturalWidth,photoH/image.naturalHeight);
 const sw=1080/ratio,sh=photoH/ratio;
 ctx.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,0,paperH,1080,photoH);
 ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#285744';ctx.font=`54px ${font}`;
 lines.forEach((line,i)=>ctx.fillText(line,540,quoteY+i*lineH));
 ctx.font='32px sans-serif';ctx.fillStyle='#60705d';sourceLines.forEach((line,i)=>ctx.fillText(line,540,sourceY+i*48));
 if(entry.type==='story'){ctx.font='28px sans-serif';ctx.fillText('故事概述 · 日常小决定',540,sourceY+sourceLines.length*48+12);}
 ctx.strokeStyle='#d2d8c9';ctx.beginPath();ctx.moveTo(90,dateY-28);ctx.lineTo(990,dateY-28);ctx.stroke();
 // Align visible glyphs rather than font boxes: serif digits and CJK fonts
 // have different ascenders and internal leading on mobile browsers.
 const drawAtInkTop=(text,x,y)=>{
  const metrics=ctx.measureText(text);
  ctx.fillText(text,x,y+metrics.actualBoundingBoxAscent);
 };
 const rowTop=dateY+28,rowHeight=156,dateX=400;
 ctx.textBaseline='alphabetic';ctx.textAlign='left';
 ctx.fillStyle='#62854e';ctx.font='160px Georgia,serif';
 const dayText=String(info.day).padStart(2,'0'),dayMetrics=ctx.measureText(dayText);
 const dayHeight=dayMetrics.actualBoundingBoxAscent+dayMetrics.actualBoundingBoxDescent;
 // Center the date within a fixed left column, independent of the day digits.
 const dayX=220-(dayMetrics.actualBoundingBoxRight-dayMetrics.actualBoundingBoxLeft)/2+dayMetrics.actualBoundingBoxLeft;
 drawAtInkTop(dayText,dayX,rowTop+(rowHeight-dayHeight)/2);
 ctx.fillStyle='#285744';ctx.font='40px sans-serif';
 drawAtInkTop(`${info.year}年${info.month}月${info.day}日`,dateX,rowTop);
 ctx.font='32px sans-serif';ctx.fillStyle='#60705d';
 drawAtInkTop(info.weekday,dateX,rowTop+62);
 if(info.lunar)drawAtInkTop(`农历${info.lunar}`,dateX,rowTop+114);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('保存失败，请重试')),'image/png'));
}
