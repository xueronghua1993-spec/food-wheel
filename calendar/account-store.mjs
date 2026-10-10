// One durable snapshot per account keeps its cache and pending operations atomic.
export const menuKeys={food:'personal-food-wheel-v1',coffee:'personal-coffee-wheel-v1'};
export const todoPrefix='daily-calendar-todos-v1:';
export function uuid(){return globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3)|8).toString(16);});}
const fresh=()=>({data:{},queue:[],imports:{}});
export function createAccountStore(storage,onChange=()=>{}){
 let owner=null;
 const accountKey=id=>'account-data-v1:'+id;
 function read(id){const raw=storage.getItem(accountKey(id));if(!raw)return fresh();const value=JSON.parse(raw);if(!value.data||!Array.isArray(value.queue)||!value.imports)throw Error('invalid account cache');return value;}
 function write(id,state){storage.setItem(accountKey(id),JSON.stringify(state));}
 function apply(data,op){
  if(op.type==='menu'){data[menuKeys[op.row.mode]]=JSON.stringify(op.row.items);return;}
  const key=todoPrefix+op.row.todo_date,items=JSON.parse(data[key]||'[]').filter(x=>x.id!==op.row.id);
  if(op.type==='todo')items.push({id:op.row.id,text:op.row.content,done:op.row.done});
  data[key]=JSON.stringify(items);
 }
 function operations(id,key,value,previous){
  const now=new Date().toISOString(),mode=Object.keys(menuKeys).find(m=>menuKeys[m]===key);
  if(mode)return[{type:'menu',row:{user_id:id,mode,items:JSON.parse(value),updated_at:now},token:uuid()}];
  if(!key.startsWith(todoPrefix))throw Error('unsupported private key');
  const date=key.slice(todoPrefix.length),before=JSON.parse(previous||'[]'),after=JSON.parse(value),ops=[];
  for(const item of before)if(!after.some(x=>x.id===item.id))ops.push({type:'deleteTodo',row:{id:item.id,user_id:id,todo_date:date},token:uuid()});
  for(const item of after){const old=before.find(x=>x.id===item.id);if(!old||old.text!==item.text||old.done!==item.done)ops.push({type:'todo',row:{id:item.id,user_id:id,todo_date:date,content:item.text,done:item.done,updated_at:now},token:uuid()});}
  return ops;
 }
 return {
  get owner(){return owner;},
  use(id){owner=id||null;onChange();},
  getItem(key){return owner?(read(owner).data[key]??null):storage.getItem(key);},
  setItem(key,value){
   if(!owner){storage.setItem(key,value);return;}
   const state=read(owner);state.queue.push(...operations(owner,key,value,state.data[key]));state.data[key]=value;write(owner,state);onChange();
  },
  pending(id){return read(id).queue;},
  async flush(id,send){
   // Tokens acknowledge only the operation actually sent, never a newer edit.
   for(let n=0;n<500;n++){const op=read(id).queue[0];if(!op)return;await send(op);const state=read(id);state.queue=state.queue.filter(x=>x.token!==op.token);write(id,state);}
   throw Error('Too many pending edits; retry sync');
  },
  replace(id,menus,todos){
   const state=read(id),data={};
   for(const row of menus)if(menuKeys[row.mode])data[menuKeys[row.mode]]=JSON.stringify(row.items);
   for(const row of todos){const key=todoPrefix+row.todo_date;const list=JSON.parse(data[key]||'[]');list.push({id:row.id,text:row.content,done:row.done});data[key]=JSON.stringify(list);}
   for(const op of state.queue)apply(data,op);
   state.data=data;write(id,state);
  },
  importGuest(id){
   const state=read(id);
   for(let i=0;i<storage.length;i++){
    const key=storage.key(i),raw=storage.getItem(key);if(!raw)continue;
    if(Object.values(menuKeys).includes(key)){
     const values=JSON.parse(raw);if(state.data[key]||!Array.isArray(values)||values.length<2||values.length>10||values.some(x=>typeof x!=='string'||!x.trim()||Array.from(x).length>8)||new Set(values).size!==values.length)continue;
     const ops=operations(id,key,raw,null);state.queue.push(...ops);state.data[key]=raw;
    }else if(key.startsWith(todoPrefix)&&/^\d{4}-\d{2}-\d{2}$/.test(key.slice(todoPrefix.length))){
     const old=JSON.parse(state.data[key]||'[]'),incoming=JSON.parse(raw);if(!Array.isArray(incoming))continue;
     for(const item of incoming){
      const stamp=key+':'+item.id;if(state.imports[stamp]||typeof item.text!=='string'||!item.text.trim()||Array.from(item.text).length>100||typeof item.done!=='boolean'||old.length>=50)continue;
      const next={...item,id:uuid()};state.imports[stamp]=next.id;old.push(next);
      state.queue.push(...operations(id,key,JSON.stringify([next]),null));
     }
     state.data[key]=JSON.stringify(old);
    }
   }
   write(id,state);onChange();
  }
 };
}
