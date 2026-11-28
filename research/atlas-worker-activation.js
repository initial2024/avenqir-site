"use strict";
// Prefer isolated Worker. A compatible browser-local engine uses the identical
// verified model and ranking implementation if Worker startup is unavailable.
(function(root){
 const STARTUP_MS=5000;
 function activate(options){
  const {values,items,signal,onResult=()=>{},onError=()=>{},workerURL}=options;
  if(!Array.isArray(values)||values.length!==1||typeof values[0]!=='string'||!Array.isArray(items)||!items.length||!signal)return Promise.reject(Error('activate_input'));
  if(signal.aborted)return Promise.reject(Error('cancelled'));
  let url;try{url=new URL(workerURL,root.location.href);if(url.origin!==root.location.origin||url.username||url.password||url.hash)throw Error('origin');}catch{return Promise.reject(Error('origin'));}
  // Pass only fields that the shared runtime actually accepts; avoid cloning
  // unrelated catalog properties, functions or browser-specific objects.
  const project=list=>list.filter(x=>x&&typeof x.url==='string'&&typeof x.name==='string'&&typeof x.description==='string').map(x=>({url:x.url,name:x.name,description:x.description,category:String(x.category||'')}));
  let records;try{records=project(items);}catch{return Promise.reject(Error('activate_input'));}
  if(!records.length||records.length>10000)return Promise.reject(Error('activate_input'));
  function workerSession(){
   return new Promise((resolve,reject)=>{
    let worker,client,settled=false,closed=false,timer;
    function close(){if(closed)return;closed=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(client)client.close();else worker?.terminate();}
    function fail(code='worker_start'){if(closed)return;const pending=!settled;settled=true;close();if(pending)reject(Error(code==='worker_start_timeout'?'worker_start_timeout':'worker_start'));else onError('worker');}
    function abort(){if(settled)return;settled=true;close();reject(Error('cancelled'));}
    try{
     worker=new root.Worker(url.href);
     client=root.AVENQIR_RESEARCH_WORKER_CLIENT.create(worker,(urls,q,ms,suggestions)=>{if(!closed&&settled)onResult(urls,q,ms,suggestions);},fail,count=>{
      if(closed||settled)return;
      if(signal.aborted){abort();return;}
      if(!Number.isSafeInteger(count)||count<1||count>records.length){fail();return;}
      settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);
      resolve(Object.freeze({mode:'worker',query(q){if(!closed)client.query(q);},replaceCatalog(next){if(!closed&&Array.isArray(next)&&next.length){try{client.init(values[0],project(next));}catch{fail();}}},close,count}));
     });
     signal.addEventListener('abort',abort,{once:true});
     if(signal.aborted){abort();return;}
     timer=setTimeout(()=>fail('worker_start_timeout'),STARTUP_MS);
     client.init(values[0],records);
    }catch{fail();}
   });
  }
  function localSession(){
   if(signal.aborted)throw Error('cancelled');
   const engine=root.AVENQIR_RESEARCH_LOCAL_ENGINE;
   if(!engine||engine.revision!==url.searchParams.get('v'))throw Error('activate_runtime');
   let current;try{current=engine.createEngine(values[0],records);}catch{throw Error('activate_local');}
   if(!Number.isSafeInteger(current.count)||current.count<1||current.count>records.length)throw Error('activate_local');
   if(signal.aborted)throw Error('cancelled');
   let closed=false,timer=null,seq=0;
   function close(){if(closed)return;closed=true;seq++;clearTimeout(timer);current=null;}
   function query(raw){
    if(closed)return;const q=String(raw||'').slice(0,513),id=++seq;clearTimeout(timer);
    timer=setTimeout(()=>{if(closed||id!==seq)return;try{const started=performance.now(),urls=current.session.rank(q),suggestions=urls.length?[]:current.session.suggest(q);if(!closed&&id===seq)onResult(urls,q,performance.now()-started,suggestions);}catch{close();onError('worker');}},0);
   }
   return Object.freeze({mode:'local',count:current.count,query,replaceCatalog(next){if(closed||!Array.isArray(next)||!next.length)return;seq++;clearTimeout(timer);try{current=engine.createEngine(values[0],project(next));if(!current.count)throw Error('catalog');}catch{close();onError('worker');}},close});
  }
  return workerSession().catch(e=>{
   if(signal.aborted||e.message==='cancelled')throw Error('cancelled');
   // Yield before synchronous local initialization and honor cancellation.
   return new Promise((resolve,reject)=>{setTimeout(()=>{try{resolve(localSession());}catch(err){reject(err);}},0);});
  });
 }
 root.AVENQIR_RESEARCH_ACTIVATION=Object.freeze({activate});
})(globalThis);
