import {uuid} from './account-store.mjs';
export function createTodoStore(storage){
 const prefix='daily-calendar-todos-v1:';
 let date='',items=[],error='';
 const valid=x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&x.text.trim()&&Array.from(x.text).length<=100&&typeof x.done==='boolean';
 function save(){
  try{storage.setItem(prefix+date,JSON.stringify(items));error='';return true;}
  catch{error='本次修改未能保存，当前页面仍可使用。';return false;}
 }
 return {
  select(next){
   date=next;items=[];error='';
   try{
    const raw=storage.getItem(prefix+date);
    if(raw!==null){const values=JSON.parse(raw);if(!Array.isArray(values)||!values.every(valid))throw Error('invalid');items=values;}
   }catch{error='无法读取这天的待办，暂时显示空列表。';}
   return this.snapshot();
  },
  snapshot(){return {date,items:items.map(x=>({...x})),error};},
  add(value){
   const text=value.trim();
   if(!text)return {error:'先写一件今天想做的事。'};
   if(Array.from(text).length>100)return {error:'每件待办最多 100 个字符。'};
   if(items.length>=50)return {error:'每天最多记录 50 件待办。'};
   items.push({id:uuid(),text,done:false});
   save();return {error:'',...this.snapshot()};
  },
  toggle(id){const item=items.find(x=>x.id===id);if(item){item.done=!item.done;save();}return this.snapshot();},
  remove(id){items=items.filter(x=>x.id!==id);save();return this.snapshot();}
 };
}
export function mountTodos({getToday,onCount}){
 const $=id=>document.getElementById(id);
 let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};}
 const local=storage;storage={getItem:key=>(window.appStore||local).getItem(key),setItem:(key,value)=>(window.appStore||local).setItem(key,value)};
 const store=createTodoStore(storage);
 let selected='',readOnly=false;
 function render(){
  const state=store.snapshot(),done=state.items.filter(x=>x.done).length;
  $('todo-heading').textContent=readOnly?'当日待办':'今日待办';
  $('todo-date').textContent=selected;
  $('todo-count').textContent='已完成 '+done+'/'+state.items.length;
  $('todo-message').textContent=state.error;
  $('todo-form').hidden=readOnly;
  $('todo-empty').hidden=state.items.length>0;
  $('todo-empty').textContent=readOnly?'这天没有记录待办。':'写下一件小事，让今天更有方向。';
  $('todo-list').replaceChildren();
  for(const item of state.items){
   const li=document.createElement('li');li.className='todo-row'+(item.done?' is-done':'');
   const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span');
   box.type='checkbox';box.checked=item.done;box.disabled=readOnly;box.setAttribute('aria-label','完成：'+item.text);
   text.textContent=item.text;
   box.onchange=()=>{store.toggle(item.id);render();};
   label.append(box,text);li.append(label);
   if(!readOnly){const remove=document.createElement('button');remove.type='button';remove.textContent='删除';remove.setAttribute('aria-label','删除：'+item.text);remove.onclick=()=>{store.remove(item.id);render();};li.append(remove);}
   $('todo-list').append(li);
  }
  if(selected===getToday())onCount(done,state.items.length);
 }
 $('todo-form').onsubmit=event=>{
  event.preventDefault();if(readOnly)return;
  const result=store.add($('todo-input').value);
  if(result.error&&!result.items){$('todo-message').textContent=result.error;$('todo-input').focus();return;}
  $('todo-input').value='';render();$('todo-input').focus();
 };
 window.addEventListener('personal-data-change',()=>{if(selected){store.select(selected);$('todo-input').value='';render();}const today=createTodoStore(storage).select(getToday()).items;onCount(today.filter(x=>x.done).length,today.length);});
 return {select(date){
  if(date===selected){readOnly=date!==getToday();render();return;}
  selected=date;readOnly=date!==getToday();store.select(date);$('todo-input').value='';render();
 }};
}
