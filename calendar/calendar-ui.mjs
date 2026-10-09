import {beijingDate,dateInfo,entryForDate,resolveDate,offsetDate} from './calendar-core.mjs';
import {renderCalendarImage} from './calendar-export.mjs';
const $=id=>document.getElementById(id);
export function mountCalendar({catalog,root}){
 const historyStart=catalog.historyStart||catalog.firstDate;
 let today=beijingDate(),selected=resolveDate(new URL(location.href).searchParams.get('date'),today,historyStart),current=null,toastTimer=null;
 const toast=text=>{clearTimeout(toastTimer);const node=$('calendar-toast');node.hidden=!text;node.textContent=text;if(!text)return;const host=$('calendar-preview').open?$('calendar-preview'):$('calendar-detail').open?$('calendar-detail'):document.body;host.append(node);toastTimer=setTimeout(()=>{node.hidden=true;},3500);};
 function render(push=false){
  current=entryForDate(selected,catalog);if(!current){$('calendar-status').textContent='这一页暂未准备好，请先使用小决定。';return;}
  const info=dateInfo(selected);$('calendar-card').hidden=false;$('calendar-actions').hidden=false;$('calendar-navigation').hidden=false;$('calendar-status').textContent='';toast('');
  const photo=$('calendar-photo');photo.onerror=()=>{photo.onerror=null;photo.src='./calendar/assets/fallback.jpg';photo.alt='日常小决定原创山水备用画面';};photo.alt=current.imageAlt;photo.src=current.imagePath;
  $('calendar-kind').textContent={quote:'每日一句',excerpt:'读一段经典',story:'一个小故事'}[current.type];
  $('calendar-text').textContent=current.text;$('calendar-text').dataset.type=current.type;
  $('calendar-source').textContent=current.type==='story'?`根据${current.author}${current.work}转述`:`${current.author} ${current.work}`;
  $('calendar-story').hidden=!current.fullText;$('calendar-story').open=false;$('calendar-full').textContent=current.fullText||'';
  $('calendar-day').textContent=String(info.day).padStart(2,'0');$('calendar-date').textContent=`${info.year}年${info.month}月${info.day}日`;
  $('calendar-weekday').textContent=info.weekday;$('calendar-lunar').textContent=info.lunar?'农历'+info.lunar:'';$('calendar-lunar').hidden=!info.lunar;
  $('calendar-mini-date').textContent=`${info.month}月${info.day}日 · ${info.weekday}`;$('calendar-mini-text').textContent=current.text;const mini=$('calendar-mini-photo');mini.onload=()=>{$('calendar-peek-background').src=mini.currentSrc||mini.src;};mini.onerror=()=>{mini.onerror=null;mini.src='./calendar/assets/fallback.jpg';};mini.src=current.imagePath;
  $('calendar-remaining').textContent=`今年还剩 ${info.remainingDays} 天`;
  $('calendar-prev').disabled=selected<=historyStart;$('calendar-today').disabled=selected===today;$('calendar-next').disabled=selected>=today;$('calendar-detail-title').textContent=selected===today?'今日日历':'往日日历';

  if(push){$('calendar-panel').scrollTop=0;const url=new URL(location.href);if(selected===today)url.searchParams.delete('date');else url.searchParams.set('date',selected);history.pushState(null,'',url);}
 }
 $('calendar-prev').onclick=()=>{if(selected>historyStart){selected=offsetDate(selected,-1);render(true);}};
 $('calendar-next').onclick=()=>{if(selected<today){selected=offsetDate(selected,1);render(true);}};
 $('calendar-today').onclick=()=>{selected=today;render(true);};
 window.addEventListener('popstate',()=>{selected=resolveDate(new URL(location.href).searchParams.get('date'),today,historyStart);render();});
 function refresh(){const next=beijingDate();if(next!==today){const wasToday=selected===today;today=next;if(wasToday)selected=today;render(true);}}
 setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('focus',refresh);
 const showSaveImage=async(blob,date,entry)=>{
  const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('图片未能生成'));reader.readAsDataURL(blob);});
  $('calendar-output').src=dataUrl;$('calendar-output').alt=`${date} 日历：${entry.text}`;$('calendar-preview').showModal();toast('图片已生成，长按保存到相册');
 };
 $('calendar-save').onclick=async()=>{
  const button=$('calendar-save'),snapshot=current,date=selected;button.disabled=true;button.textContent='正在导出…';toast('');
  try{
   const blob=await renderCalendarImage(snapshot,dateInfo(date));
   const file=new File([blob],`每日一页-${date}.png`,{type:'image/png'});
   const wechat=/MicroMessenger/i.test(navigator.userAgent);
   const mobile=wechat||/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)||navigator.maxTouchPoints>1;
   let shared=false;
   if(!wechat&&navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file]});shared=true;toast('导出成功');}
    catch(error){if(error.name==='AbortError'){toast('已取消导出');return;}}
   }
   if(!shared){
    if(mobile)await showSaveImage(blob,date,snapshot);
    else{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('导出成功');}
   }
  }catch{toast('导出失败，请重试');}
  finally{button.disabled=false;button.textContent='保存图片';}
 };
 $('calendar-preview-close').onclick=()=>$('calendar-preview').close();
 $('calendar-preview').addEventListener('close',()=>{$('calendar-output').removeAttribute('src');toast('');});
 render();return {refresh};
}
$('calendar-open').onclick=()=>$('calendar-detail').showModal();
$('calendar-detail-close').onclick=()=>$('calendar-detail').close();
try{
 const response=await fetch('./calendar/content.json');if(!response.ok)throw new Error('content');const catalog=await response.json();
 if(!catalog.entries?.length||!catalog.entries.every(e=>e.verified)||!catalog.schedule?.length)throw new Error('catalog');
 mountCalendar({catalog,root:$('calendar-panel')});
}catch{$('calendar-mini-text').textContent='日历暂未载入，点击重试查看';$('calendar-status').textContent='日历暂时没能载入，刷新可重试；小决定仍可使用。';}
