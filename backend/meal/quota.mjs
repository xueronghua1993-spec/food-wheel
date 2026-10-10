export const DEFAULT_LIMITS=Object.freeze({daily:20,monthly:300,hourly:3});
const dateKey=time=>new Date(time+8*3600000).toISOString().slice(0,10);
function records(raw,month){
 if(typeof raw!=='string'||Buffer.byteLength(raw)>65536||raw&& !raw.endsWith('\n'))throw Error('invalid ledger');
 if(!raw)return [];
 const rows=raw.trimEnd().split('\n').map(line=>JSON.parse(line));
 if(rows.length>300||rows.some(x=>!Number.isSafeInteger(x.time)||typeof x.client!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(x.client)||dateKey(x.time).slice(0,7)!==month))throw Error('invalid ledger');
 return rows;
}
export async function reserveQuota(store,client,now=Date.now(),limits=DEFAULT_LIMITS){
 for(const name of ['daily','monthly','hourly'])if(!Number.isSafeInteger(limits[name])||limits[name]<1||limits[name]>DEFAULT_LIMITS[name])throw Error('invalid limits');
 if(typeof client!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(client)||!Number.isSafeInteger(now))throw Error('invalid client');
 const day=dateKey(now),month=day.slice(0,7),key=`meal-quota/${month}.jsonl`;
 for(let attempt=0;attempt<12;attempt++){
  const raw=await store.read(key),rows=records(raw,month);
  if(rows.length>=limits.monthly)return {ok:false,code:'monthly_limit'};
  if(rows.filter(x=>dateKey(x.time)===day).length>=limits.daily)return {ok:false,code:'daily_limit'};
  const prevMonth=dateKey(now-3600000).slice(0,7);
  const recent=prevMonth===month?rows:[...records(await store.read(`meal-quota/${prevMonth}.jsonl`),prevMonth),...rows];
  const mine=recent.filter(x=>x.client===client&&x.time>now-3600000);
  if(mine.length>=limits.hourly||mine.some(x=>x.time>now-60000))return {ok:false,code:'rate_limit'};
  // Competing invocations can append only at the exact size they read.
  const line=JSON.stringify({time:now,client})+'\n';
  if(await store.append(key,line,Buffer.byteLength(raw)))return {ok:true};
 }
 return {ok:false,code:'busy'};
}
