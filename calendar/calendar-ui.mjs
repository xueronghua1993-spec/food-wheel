import {beijingDate,dateInfo,entryForDate,resolveDate,offsetDate} from './calendar-core.mjs';
import {renderCalendarImage} from './calendar-export.mjs';
const $=id=>document.getElementById(id);
export function mountCalendar({catalog,root}){
 let today=beijingDate(),selected=resolveDate(new URL(location.href).searchParams.get('date'),today,catalog.firstDate),current=null,outputUrl=null;
 const message=text=>{$('calendar-message').textContent=text;};
 function render(push=false){
  current=entryForDate(selected,catalog);if(!current){$('calendar-status').textContent='这一页暂未准备好，请先使用小决定。';return;}
  const info=dateInfo(selected);$('calendar-card').hidden=false;$('calendar-actions').hidden=false;$('calendar-links').hidden=false;$('calendar-credits').hidden=false;$('calendar-status').textContent='';message('');$('calendar-share-fallback').hidden=true;
  const photo=$('calendar-photo');photo.onerror=()=>{photo.onerror=null;photo.src='./calendar/assets/fallback.jpg';photo.alt='日常小决定原创山水备用画面';$('calendar-credit-photo').textContent='备用画面：日常小决定原创';$('calendar-image-link').hidden=true;};photo.alt=current.imageAlt;photo.src=current.imagePath;
  $('calendar-kind').textContent={quote:'每日一句',excerpt:'读一段经典',story:'一个小故事'}[current.type];
  $('calendar-text').textContent=current.text;$('calendar-text').dataset.type=current.type;
  $('calendar-source').textContent=current.type==='story'?`根据${current.author}${current.work}转述`:`${current.author} ${current.work}`;
  $('calendar-story').hidden=!current.fullText;$('calendar-story').open=false;$('calendar-full').textContent=current.fullText||'';
  $('calendar-day').textContent=String(info.day).padStart(2,'0');$('calendar-date').textContent=`${info.year}年${info.month}月${info.day}日`;
  $('calendar-weekday').textContent=info.weekday;$('calendar-lunar').textContent=info.lunar?'农历'+info.lunar:'';$('calendar-lunar').hidden=!info.lunar;
  $('calendar-mini-date').textContent=`${info.month}月${info.day}日 · ${info.weekday}`;$('calendar-mini-text').textContent=current.text;const mini=$('calendar-mini-photo');mini.onerror=()=>{mini.onerror=null;mini.src='./calendar/assets/fallback.jpg';};mini.src=current.imagePath;
  $('calendar-remaining').textContent=`今年还剩 ${info.remainingDays} 天`;
  $('calendar-prev').disabled=selected<=catalog.firstDate;$('calendar-today').hidden=selected===today;
  $('calendar-credit-text').textContent=current.type==='story'?'正文为原创转述，卡片文字为故事概述。':'古典原文 · 简体展示';
  $('calendar-text-link').href=current.textSource;$('calendar-credit-photo').textContent=`摄影：${current.imageAuthor} · ${current.imageLicense}`;$('calendar-image-link').href=current.imageSource;$('calendar-image-link').hidden=false;
  if(push){const url=new URL(location.href);if(selected===today)url.searchParams.delete('date');else url.searchParams.set('date',selected);history.pushState(null,'',url);}
 }
 $('calendar-prev').onclick=()=>{if(selected>catalog.firstDate){selected=offsetDate(selected,-1);render(true);}};
 $('calendar-today').onclick=()=>{selected=today;render(true);};
 window.addEventListener('popstate',()=>{selected=resolveDate(new URL(location.href).searchParams.get('date'),today,catalog.firstDate);render();});
 function refresh(){const next=beijingDate();if(next!==today){const wasToday=selected===today;today=next;if(wasToday)selected=today;render(true);}}
 setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('focus',refresh);
 $('calendar-share').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('date',selected);url.searchParams.delete('v');try{await navigator.clipboard.writeText(url.href);message('链接已复制，可以发给朋友。');}catch{$('calendar-share-fallback').hidden=false;$('calendar-share-url').value=url.href;message('长按链接即可复制。');}};
 $('calendar-save').onclick=async()=>{
  const button=$('calendar-save'),snapshot=current,date=selected;button.disabled=true;button.textContent='正在制作…';message('');
  try{const blob=await renderCalendarImage(snapshot,dateInfo(date));if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl=URL.createObjectURL(blob);$('calendar-output').src=outputUrl;$('calendar-output').alt=`${date} 日历：${snapshot.text}`;$('calendar-download').href=outputUrl;$('calendar-download').download=`每日一页-${date}.png`;$('calendar-preview').showModal();}
  catch{message('图片暂时没能保存，请重试。');}
  finally{button.disabled=false;button.textContent='保存日历';}
 };
 $('calendar-preview-close').onclick=()=>$('calendar-preview').close();
 $('calendar-preview').addEventListener('close',()=>{if(outputUrl){URL.revokeObjectURL(outputUrl);outputUrl=null;$('calendar-output').removeAttribute('src');$('calendar-download').removeAttribute('href');}});
 render();return {refresh};
}
$('calendar-open').onclick=()=>$('calendar-detail').showModal();
$('calendar-detail-close').onclick=()=>$('calendar-detail').close();
try{
 const response=await fetch('./calendar/content.json');if(!response.ok)throw new Error('content');const catalog=await response.json();
 if(!catalog.entries?.length||!catalog.entries.every(e=>e.verified)||!catalog.schedule?.length)throw new Error('catalog');
 mountCalendar({catalog,root:$('calendar-panel')});
}catch{$('calendar-mini-text').textContent='日历暂未载入，点击重试查看';$('calendar-status').textContent='日历暂时没能载入，刷新可重试；小决定仍可使用。';}
