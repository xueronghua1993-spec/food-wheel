const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts','meal-backend.zip');
const dependency=path.join(root,'backend/meal/node_modules/ali-oss/package.json');
if(!fs.existsSync(dependency))throw Error('先运行：npm ci --prefix backend/meal --omit=dev --ignore-scripts');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'meal-package-'));
try{
 fs.mkdirSync(path.join(temp,'backend/meal'),{recursive:true});fs.mkdirSync(path.join(temp,'ai'));
 for(const name of ['app.mjs','quota.mjs','oss-store.mjs','server.mjs','package.json','package-lock.json'])fs.copyFileSync(path.join(root,'backend/meal',name),path.join(temp,'backend/meal',name));
 fs.cpSync(path.join(root,'backend/meal/node_modules'),path.join(temp,'backend/meal/node_modules'),{recursive:true});
 fs.copyFileSync(path.join(root,'ai/meal-rules.mjs'),path.join(temp,'ai/meal-rules.mjs'));
 fs.writeFileSync(path.join(temp,'bootstrap'),'#!/bin/sh\ncd /code/backend/meal\nexec /var/fc/lang/nodejs20/bin/node server.mjs\n',{mode:0o755});
 fs.mkdirSync(path.dirname(out),{recursive:true});if(fs.existsSync(out))fs.unlinkSync(out);
 execFileSync('zip',['-qr',out,'bootstrap','backend','ai'],{cwd:temp});
 const entries=execFileSync('unzip',['-Z1',out],{encoding:'utf8'}).split('\n');
 if(entries.some(x=>/(?:^|\/)\.env(?:\.|$)|ai\/config\.mjs|index\.html/.test(x)))throw Error('Unexpected package file');
 console.log('PASS: upload package created at '+out+' ('+fs.statSync(out).size+' bytes), no keys or browser config included');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
