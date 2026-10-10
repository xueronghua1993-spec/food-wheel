import {mealConfig} from './config.mjs';
import {validatePreferences,validateOptions} from './meal-rules.mjs';
const $=id=>document.getElementById(id);
const dialog=$('meal-dialog'),form=$('meal-form'),status=$('meal-status'),submit=$('meal-submit'),results=$('meal-results'),apply=$('meal-apply');
let endpoint;try{const url=new URL(mealConfig.endpoint);if(url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/api/meal')endpoint=url.href;}catch{/* Not configured: keep the entry hidden. */}
let controller,options=[];
function clearResults(){options=[];results.replaceChildren();apply.hidden=true;}
function stop(){controller?.abort();controller=undefined;submit.disabled=false;submit.textContent='生成 3 个建议';}
function reset(){stop();clearResults();status.textContent='';$('meal-code').value='';}
if(endpoint){
 $('meal-open').hidden=false;
 $('meal-open').onclick=()=>{reset();dialog.showModal();};
 $('meal-close').onclick=()=>{reset();dialog.close();};
 dialog.addEventListener('close',reset);
 dialog.addEventListener('cancel',reset);
 form.addEventListener('input',()=>{stop();clearResults();status.textContent='';});
 form.onsubmit=async event=>{
  event.preventDefault();if(controller)return;
  clearResults();status.textContent='';
  let preferences;try{preferences=validatePreferences({budget:$('meal-budget').value,taste:$('meal-taste').value,avoid:$('meal-avoid').value.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean)});}catch(e){status.textContent=e.message;return;}
  const code=$('meal-code').value.trim();if(code.length<16||code.length>128||!/^[\x21-\x7e]+$/.test(code)){status.textContent='请输入有效的试用码。';return;}
  const current=new AbortController();controller=current;submit.disabled=true;submit.textContent='正在推荐…';status.textContent='正在按你的条件挑选…';
  const timer=setTimeout(()=>current.abort(),30000);
  try{
   const response=await fetch(endpoint,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal:current.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+code},body:JSON.stringify(preferences)});
   const data=await response.json();if(controller!==current||!dialog.open)return;
   if(!response.ok){status.textContent=typeof data.error==='string'&&data.error.length<=100?data.error:'暂时没有生成推荐，请稍后重试。';return;}
   options=validateOptions(data,preferences);
   for(const item of options){const li=document.createElement('li'),title=document.createElement('strong'),reason=document.createElement('p'),ingredients=document.createElement('small');title.textContent=item.name;reason.textContent=item.reason;ingredients.textContent='主要食材：'+item.ingredients.join('、');li.append(title,reason,ingredients);results.append(li);}
   apply.hidden=false;status.textContent='挑好了，确认后可以放进转盘。';
  }catch(e){if(controller===current&&dialog.open){clearResults();status.textContent=current.signal.aborted?'等待时间较长，请稍后重试。':e.message?.includes('格式')||e.message?.includes('忌口')?e.message:'连接失败，请稍后重试。';}}
  finally{clearTimeout(timer);if(controller===current)stop();}
 };
 apply.onclick=()=>{
  if(options.length!==3)return;
  const detail={names:options.map(x=>x.name),accepted:false};
  window.dispatchEvent(new CustomEvent('meal-menu-request',{detail}));
  if(detail.accepted){reset();dialog.close();}
 };
}
