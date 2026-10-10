// Generated from H5 by scripts/build-miniprogram.cjs. Do not edit.
function wrapText(ctx,text,maxWidth){
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

module.exports={wrapText};
