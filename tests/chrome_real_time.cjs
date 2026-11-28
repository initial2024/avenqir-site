"use strict";
// Local QA only. Use Chromium's native CDP pipe instead of TCP discovery:
// no proxy/port-file race, no inherited listening sockets, and no retry after
// navigation (a failed application assertion must always remain a failure).
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const [chrome,profile,url]=process.argv.slice(2);
if(!chrome||!profile||!/^http:\/\/127\.0\.0\.1:\d+\//.test(url))throw Error('local fixture only');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function launch(dir){
 const child=spawn(chrome,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-pipe','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
 let stderr='',closed=false,serial=0,buffer=Buffer.alloc(0);
 const pending=new Map();
 child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-8000);});
 function fail(error){if(closed)return;closed=true;for(const j of pending.values()){clearTimeout(j.timer);j.reject(error);}pending.clear();}
 child.on('error',e=>fail(e));
 child.on('exit',(code,signal)=>fail(Error('Chrome exited: '+(signal||code))));
 child.stdio[3].on('error',e=>fail(e));
 child.stdio[4].on('error',e=>fail(e));
 child.stdio[4].on('end',()=>fail(Error('Chrome CDP pipe closed')));
 child.stdio[4].on('data',chunk=>{
  if(closed)return;
  buffer=Buffer.concat([buffer,chunk]);
  if(buffer.length>8*1024*1024){fail(Error('Oversized CDP response'));return;}
  let i;while((i=buffer.indexOf(0))>=0){
   const raw=buffer.subarray(0,i);buffer=buffer.subarray(i+1);
   let m;try{m=JSON.parse(raw.toString('utf8'));}catch{fail(Error('Invalid CDP response'));return;}
   const j=pending.get(m.id);if(!j)continue;
   pending.delete(m.id);clearTimeout(j.timer);
   if(m.error)j.reject(Error(m.error.message));else j.resolve(m.result);
  }
 });
 function call(method,params={},sessionId,timeout=3000){
  if(closed)return Promise.reject(Error('CDP pipe unavailable'));
  return new Promise((resolve,reject)=>{
   const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},timeout);
   pending.set(id,{resolve,reject,timer});
   try{child.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');}catch(e){clearTimeout(timer);pending.delete(id);reject(e);}
  });
 }
 async function stop(){
  fail(Error('CDP session closed'));
  try{child.stdio[3].end();}catch{}
  if(child.exitCode===null&&child.signalCode===null){
   child.kill('SIGTERM');
   await Promise.race([new Promise(r=>child.once('exit',r)),delay(1000)]);
   if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await Promise.race([new Promise(r=>child.once('exit',r)),delay(500)]);}
  }
  try{child.stdio[4].destroy();child.stderr.destroy();}catch{}
 }
 return {call,stop,stderr:()=>stderr};
}
async function connect(){
 let last;
 for(let attempt=1;attempt<=2;attempt++){
  const dir=path.join(profile,'cdp-attempt-'+attempt);fs.mkdirSync(dir,{recursive:false});
  const browser=launch(dir);
  try{
   const deadline=Date.now()+8000;let targets;
   while(Date.now()<deadline&&!targets){
    try{targets=(await browser.call('Target.getTargets',{},undefined,Math.max(100,Math.min(1500,deadline-Date.now())))).targetInfos;}catch(e){last=e;await delay(100);}
   }
   if(!targets)throw last||Error('No CDP targets');
   const page=targets.find(t=>t.type==='page');
   if(!page)throw Error('No Chrome page target');
   const {sessionId}=await browser.call('Target.attachToTarget',{targetId:page.targetId,flatten:true},undefined,2000);
   if(!sessionId)throw Error('No CDP session');
   await browser.call('Page.enable',{},sessionId,2000);await browser.call('Runtime.enable',{},sessionId,2000);
   console.log('CHROME_CDP_PIPE_READY attempt='+attempt);
   return {browser,sessionId};
  }catch(e){last=e;console.error('CHROME_STARTUP_ATTEMPT_FAILED',attempt,e.message,browser.stderr().slice(-1000));await browser.stop();}
 }
 throw last||Error('Chrome startup failed');
}
(async()=>{
 let browser;
 try{
  const connected=await connect();browser=connected.browser;
  const call=(method,params={})=>browser.call(method,params,connected.sessionId);
  await call('Page.navigate',{url});
  const start=Date.now();
  while(Date.now()-start<50000){
   let state;
   try{const r=await call('Runtime.evaluate',{expression:"({result:document.documentElement?.dataset.result||'',error:document.documentElement?.dataset.error||'',metrics:document.documentElement?.dataset.metrics||'',url:location.href})",returnByValue:true});state=r.result?.value;}catch{}
   if(state?.result==='pass'&&state.url===url){if(state.metrics)console.log('CHROME_FIXTURE_METRICS',state.metrics);console.log('CHROME_REAL_TIME_PASS');return;}
   if(state?.result==='fail')throw Error(state.error||'browser fixture failed');
   await delay(100);
  }
  throw Error('browser fixture timed out');
 }catch(e){console.error(e.message);if(browser)console.error(browser.stderr().slice(-2500));process.exitCode=1;}
 finally{if(browser)await browser.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
