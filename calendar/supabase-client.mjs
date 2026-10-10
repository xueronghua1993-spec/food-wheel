import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.102.0?bundle';
export const siteURL='https://xueronghua1993-spec.github.io/food-wheel/';
export function makeClient(){
 return createClient('https://scmqmdqwlrtlydehsvlo.supabase.co','sb_publishable_VEPgn3pXy4jZYN9A0mPYIg_oY2z1y5Z',{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
  global:{fetch:async(input,init={})=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
   const abort=()=>controller.abort();init.signal?.addEventListener('abort',abort,{once:true});
   try{return await fetch(input,{...init,signal:controller.signal});}
   finally{clearTimeout(timer);init.signal?.removeEventListener('abort',abort);}
  }}
 });
}
