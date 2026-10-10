// Read-only public configuration checks. Never send email or change cloud records.
(async()=>{
 const base='https://scmqmdqwlrtlydehsvlo.supabase.co',headers={apikey:'sb_publishable_VEPgn3pXy4jZYN9A0mPYIg_oY2z1y5Z'};
 const response=await fetch(base+'/auth/v1/settings',{headers,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Auth settings HTTP '+response.status);
 const settings=await response.json();if(!settings.external?.email)throw Error('Email provider is not enabled');
 console.log('LIVE READ-ONLY: project reachable; email provider enabled; confirmation auto-approved='+settings.mailer_autoconfirm);
 for(const table of ['user_menus','user_todos']){
  const r=await fetch(base+'/rest/v1/'+table+'?select=user_id&limit=1',{headers,signal:AbortSignal.timeout(15000)});
  if(![401,403].includes(r.status))throw Error('Expected anonymous denial for '+table+', got HTTP '+r.status);
  console.log('LIVE READ-ONLY: anonymous read '+table+' denied HTTP '+r.status);
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
