import http from 'node:http';
import {createMealHandler} from './app.mjs';
import {createOssStore} from './oss-store.mjs';
import {DEFAULT_LIMITS} from './quota.mjs';
const env=process.env;
const cap=(name,max)=>{const n=Number(env[name]||max);return Number.isSafeInteger(n)&&n>0&&n<=max?n:0;};
const limits={daily:cap('DAILY_LIMIT',DEFAULT_LIMITS.daily),monthly:cap('MONTHLY_LIMIT',DEFAULT_LIMITS.monthly),hourly:cap('HOURLY_LIMIT',DEFAULT_LIMITS.hourly)};
let store;
if(env.AI_ENABLED==='true')try{store=await createOssStore();}catch{console.error('Meal service unavailable: quota storage is not configured.');}
const config={enabled:env.AI_ENABLED==='true'&&Object.values(limits).every(x=>x>0),apiKey:env.DEEPSEEK_API_KEY,model:env.DEEPSEEK_MODEL||'deepseek-flash',betaCode:env.AI_BETA_CODE,hashSalt:env.AI_HASH_SALT,allowedOrigin:env.ALLOWED_ORIGIN,limits};
const server=http.createServer(createMealHandler({config,store}));
server.requestTimeout=10000;server.headersTimeout=10000;
server.listen(Number(env.PORT)||9000,'0.0.0.0');
