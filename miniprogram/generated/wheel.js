// Generated from H5 by scripts/build-miniprogram.cjs. Do not edit.
const presets={food:['面条','米饭套餐','饺子','麻辣烫','汉堡','火锅'],coffee:['美式','拿铁','卡布奇诺','澳白','摩卡','冷萃']};
const palettes={food:['#cfe4ce','#e6edcd','#bfdcd0','#dde8c9','#d3e5dd','#f0e8c8'],coffee:['#d8e3c7','#e8e6c9','#c9decf','#dce8da','#cddfd7','#e5ead0']};
function validate(values){
 const items=values.map(v=>v.trim());
 if(items.length<2||items.length>10)return{error:'请保留 2～10 个选项。'};
 for(let i=0;i<items.length;i++){
  if(!items[i])return{error:'第 '+(i+1)+' 项不能为空。',index:i};
  if(Array.from(items[i]).length>8)return{error:'第 '+(i+1)+' 项最多 8 个字符。',index:i};
  if(items.indexOf(items[i])!==i)return{error:'第 '+(i+1)+' 项重复了。',index:i};
 }
 return{items,error:''};
}
function nextRotation(current,index,count){
 const target=(360-(index+.5)*360/count)%360;
 return current+1440+(target-current%360+360)%360;
}

module.exports={presets,palettes,validate,nextRotation};
