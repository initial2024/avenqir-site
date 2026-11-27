"use strict";
// Single in-flight request; newest query replaces pending work. Terminate on disable.
(function(root){
 function create(worker,onResult,onError=()=>{},onReady=()=>{}){
  let serial=0,epoch=0,ready=false,closed=false,pending=null,inFlight=null,initId=0,latest=0;
  function send(){if(closed||!ready||inFlight||!pending)return;inFlight=pending;pending=null;worker.postMessage({type:'rank',id:inFlight.id,epoch,query:inFlight.query});}
  worker.onmessage=e=>{if(closed)return;const m=e.data;
   if(m.type==='ready'&&m.id===initId){epoch=m.epoch;ready=true;onReady(m.count);send();return;}
   if(m.type==='error'&&m.id===initId){ready=false;onError(m.code);return;}
   if(!inFlight||m.id!==inFlight.id||m.epoch!==epoch)return;
   const done=inFlight;inFlight=null;
   if(done.id===latest){if(m.type==='result')onResult(m.urls,done.query,m.elapsedMs);else onError(m.code);}
   send();
  };
  worker.onerror=()=>{if(!closed){ready=false;inFlight=null;onError('WORKER_FAILURE');}};
  return Object.freeze({
   init(model,items){if(closed)return;ready=false;pending=null;inFlight=null;initId=++serial;latest=initId;worker.postMessage({type:'init',id:initId,model,items});},
   query(q){if(closed)return;latest=++serial;pending={id:latest,query:String(q||'').slice(0,513)};send();},
   close(){if(closed)return;closed=true;pending=null;inFlight=null;worker.terminate();}
  });
 }
 const api=Object.freeze({create});if(typeof module==='object'&&module.exports)module.exports=api;else root.AVENQIR_RESEARCH_WORKER_CLIENT=api;
})(typeof self!=='undefined'?self:globalThis);
