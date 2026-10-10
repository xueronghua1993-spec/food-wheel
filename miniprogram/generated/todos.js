// Generated from H5 by scripts/build-miniprogram.cjs. Do not edit.
const {uuid}=require('./account-store');
function createTodoStore(storage){
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

module.exports={createTodoStore};
