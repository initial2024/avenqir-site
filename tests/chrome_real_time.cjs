"use strict";
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const [chrome,profile,url]=process.argv.slice(2);
if(!chrome||!profile||!/^http:\/\/127\.0\.0\.1:\d+\//.test(url))throw Error('local fixture only');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
let stderr='';child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-8000)});
let ws;
(async()=>{
 try{
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<100&&!fs.existsSync(portFile);i++)await delay(100);
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const target=targets.find(x=>x.type==='page');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let seq=0;const pending=new Map();
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);const job=pending.get(m.id);if(job){pending.delete(m.id);m.error?job.reject(Error(m.error.message)):job.resolve(m.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  await call('Page.enable');await call('Runtime.enable');await call('Page.navigate',{url});
  const start=Date.now();
  while(Date.now()-start<50000){
   let state;
   try{const r=await call('Runtime.evaluate',{expression:"({result:document.documentElement?.dataset.result||'',error:document.documentElement?.dataset.error||'',url:location.href})",returnByValue:true});state=r.result?.value;}catch{}
   if(state?.result==='pass'){console.log('CHROME_REAL_TIME_PASS');return;}
   if(state?.result==='fail')throw Error(state.error||'browser fixture failed');
   await delay(100);
  }
  throw Error('browser fixture timed out');
 }catch(e){console.error(e.message);console.error(stderr.slice(-2500));process.exitCode=1;}
 finally{try{ws?.close()}catch{}child.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;child.kill('SIGTERM');});
