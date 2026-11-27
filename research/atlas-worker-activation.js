"use strict";
// Research-only bridge from verified bytes to a real Worker. No legacy cache or network model.
(function(root){
 function activate({values,items,signal,onResult=()=>{},onError=()=>{},workerURL}){
  if(!Array.isArray(values)||values.length!==1||typeof values[0]!=='string'||!Array.isArray(items)||!items.length||!signal)return Promise.reject(Error('activate'));
  if(signal.aborted)return Promise.reject(Error('cancelled'));
  return new Promise((resolve,reject)=>{
   let worker,client,settled=false,closed=false;
   function close(){if(closed)return;closed=true;signal.removeEventListener('abort',abort);if(client)client.close();else worker?.terminate();}
   function fail(){if(closed)return;const pending=!settled;settled=true;close();if(pending)reject(Error('activate'));else onError('worker');}
   function abort(){if(settled)return;settled=true;close();reject(Error('cancelled'));}
   try{
    const url=new URL(workerURL,root.location.href);
    if(url.origin!==root.location.origin||url.username||url.password||url.hash)throw Error('origin');
    worker=new root.Worker(url);
    client=root.AVENQIR_RESEARCH_WORKER_CLIENT.create(worker,(urls,q,ms)=>{if(!closed&&settled)onResult(urls,q,ms);},fail,count=>{
     if(closed||settled)return;
     if(signal.aborted){abort();return;}
     if(!Number.isSafeInteger(count)||count<1||count>items.length){fail();return;}
     settled=true;signal.removeEventListener('abort',abort);
     resolve(Object.freeze({query(q){if(!closed)client.query(q);},replaceCatalog(next){if(!closed&&Array.isArray(next)&&next.length)client.init(values[0],next);},close,count}));
    });
    signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted){abort();return;}
    client.init(values[0],items);
   }catch{fail();}
  });
 }
 root.AVENQIR_RESEARCH_ACTIVATION=Object.freeze({activate});
})(globalThis);
