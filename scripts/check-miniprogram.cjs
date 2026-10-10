const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {wxmlToJs}=require('miniprogram-compiler');
const compileStyles=require('miniprogram-compiler/src/wcsc');
const root=path.resolve(__dirname,'../miniprogram'),styleFiles=[];let scripts=0,templates=0;
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,item.name);if(item.isDirectory()){walk(file);continue;}
  const source=fs.readFileSync(file);
  if(file.endsWith('.js')){new vm.Script(source.toString(),{filename:file});scripts++;}
  if(file.endsWith('.json'))JSON.parse(source.toString());
  if(file.endsWith('.wxss'))styleFiles.push(path.relative(root,file).replace(/\\/g,'/').slice(0,-5));
  if(file.endsWith('.wxml')){
   // XML checks catch malformed tags/entities. This does not replace the WeChat compiler.
   const template=source.toString()
    .replace(/\s(wx:else|scroll-y|password|show-menu-by-longpress)(?=[\s/>])/g,' $1=""')
    .replace(/\{\{[\s\S]*?\}\}/g,expression=>expression.replace(/&(?![a-z]+;|#\d+;|#x[\da-f]+;)/gi,'&amp;'));
   const markup='<root xmlns:wx="urn:wechat">'+template+'</root>';
   try{new JSDOM(markup,{contentType:'application/xml'});}catch(error){throw Error(file+': '+error.message);}templates++;
  }
 }
}
walk(root);
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'))),project=JSON.parse(fs.readFileSync(path.join(root,'project.config.json')));
assert.equal(project.appid,'wx3b755ea7217f2cc0');assert.equal(project.setting.urlCheck,true);
for(const page of app.pages)for(const ext of ['js','wxml','wxss','json'])assert.ok(fs.existsSync(path.join(root,page+'.'+ext)),page+'.'+ext);
for(const pkg of app.subPackages)for(const page of pkg.pages)assert.ok(fs.existsSync(path.join(root,pkg.root,page+'.js')));
const templateResult=wxmlToJs(root);new Function('global',templateResult);console.log('PASS: WXML compiler ('+templateResult.length+' bytes).');
// This wrapper returns an Error rather than throwing; do not treat it as success.
const styleResult=compileStyles(root,styleFiles);if(styleResult instanceof Error)throw styleResult;
console.log('PASS: WXSS compiler ('+styleFiles.length+' stylesheets).');
console.log('PASS: '+scripts+' JavaScript files, '+templates+' XML templates, registered AppID and page paths. Developer Tools runtime and phone checks remain required.');
