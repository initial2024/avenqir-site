"use strict";
// Research only: the production directory does not load this module.
(function(root){
 const CACHE='avenqir-semantic-model-v2-candidate';
 const MIME=new Set(['application/json','application/octet-stream','text/plain','text/json']);
 function create(specs,env=root,storageTimeout=5000,loadTimeout=45000){
  if(!Number.isInteger(loadTimeout)||loadTimeout<100||loadTimeout>45000)throw Error('load_timeout_config');
  if(!Number.isInteger(storageTimeout)||storageTimeout<50||storageTimeout>10000)throw Error('storage_timeout_config');
  if(!Array.isArray(specs)||!specs.length||specs.length>4)throw Error('manifest');
  const manifest=specs.map(s=>{const u=new URL(s.file,env.location.href);
   if(u.origin!==env.location.origin||u.username||u.password||u.hash||!Number.isInteger(s.bytes)||s.bytes<1||s.bytes>512*1024||!/^[a-f0-9]{64}$/.test(s.sha256))throw Error('manifest');
   return {...s,url:u.href};});
  if(new Set(manifest.map(s=>s.url)).size!==manifest.length)throw Error('manifest');
  let running=false,controller=null,revision=0,active=null;
  const total=manifest.reduce((n,s)=>n+s.bytes,0);
  // CacheStorage has no AbortSignal. Bound the caller's wait independently.
  function bounded(operation){
   let timer;return Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('storage_timeout')),storageTimeout);})]).finally(()=>clearTimeout(timer));
  }
  // AbortSignal alone cannot settle an uncooperative browser API or activation
  // callback. Reject the caller independently and dispose late results.
  function abortable(operation,signal,dispose=()=>{}){
   if(signal.aborted)return Promise.reject(Error('cancelled'));
   return new Promise((resolve,reject)=>{
    let aborted=false;
    const stop=()=>{aborted=true;signal.removeEventListener('abort',stop);reject(Error('cancelled'));};
    signal.addEventListener('abort',stop,{once:true});
    Promise.resolve().then(()=>{if(signal.aborted)throw Error('cancelled');return operation();}).then(value=>{
     signal.removeEventListener('abort',stop);
     if(aborted||signal.aborted){try{Promise.resolve(dispose(value)).catch(()=>{});}catch{};reject(Error('cancelled'));return;}
     resolve(value);
    },error=>{signal.removeEventListener('abort',stop);reject(error);});
   });
  }
  const cancelBody=r=>r?.body?.cancel();
  async function discardCache(){if(env.caches)await bounded(()=>env.caches.delete(CACHE));}
  async function cachedBytes(response,s,signal){
   if(response.body?.getReader){
    const reader=response.body.getReader(),out=new Uint8Array(s.bytes);let n=0;
    try{while(true){const {done,value}=await abortable(()=>bounded(()=>reader.read()),signal);if(done)break;if(n+value.length>s.bytes)throw Error('integrity');out.set(value,n);n+=value.length;}if(n!==s.bytes)throw Error('integrity');return out;}
    finally{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}}
   }
   if(response.headers?.get('content-length')!==String(s.bytes))throw Error('integrity');
   return new Uint8Array(await abortable(()=>bounded(()=>response.arrayBuffer()),signal));
  }
  async function verify(bytes,s){
   if(bytes.byteLength!==s.bytes)throw Error('integrity');
   if(!env.crypto?.subtle)throw Error('crypto_unavailable');
   const hash=[...new Uint8Array(await env.crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   if(hash!==s.sha256)throw Error('integrity');
   try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('model_format');}
  }
  function alive(id,signal){if(id!==revision||signal.aborted)throw Error('cancelled');}
  async function fetchOne(s,signal,report){
   let r;try{r=await abortable(()=>env.fetch(s.url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal,referrerPolicy:'no-referrer'}),signal,cancelBody);}catch{throw Error('network');}
   if(!r.ok||r.status!==200||r.headers.get('content-range')){
    // The model is an immutable complete asset. Never activate a range response.
    try{Promise.resolve(r.body?.cancel()).catch(()=>{});}catch{}
    throw Error(r.status===429?'rate_limited':'http');
   }
   if(r.url&&new URL(r.url).origin!==env.location.origin)throw Error('origin');
   if(!MIME.has(String(r.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()))throw Error('mime');
   const wireLength=r.headers.get('content-length'),encoding=(r.headers.get('content-encoding')||'identity').toLowerCase();
   const declaredComplete=encoding==='identity'&&wireLength===String(s.bytes);
   const out=new Uint8Array(s.bytes);let n=0;
   if(r.body?.getReader){
    const reader=r.body.getReader();try{while(true){let chunk;try{chunk=await abortable(()=>reader.read(),signal);}catch{throw Error(signal.aborted?'cancelled':'network');}const {done,value}=chunk;if(signal.aborted)throw Error('cancelled');if(done)break;if(n+value.length>s.bytes)throw Error('integrity');out.set(value,n);n+=value.length;report(n);}}finally{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}}
   }else{
    // No streaming API: only accept a bounded advertised length.
    if(r.headers.get('content-length')!==String(s.bytes))throw Error('stream');
    let data;try{data=new Uint8Array(await abortable(()=>r.arrayBuffer(),signal));}catch{throw Error(signal.aborted?'cancelled':'network');}if(data.length!==s.bytes)throw Error('integrity');out.set(data);n=data.length;report(n);
   }
   // Some engines reject a premature socket EOF; others finish the stream.
   // When the identity response promised the full length, both mean an interrupted transfer.
   if(n!==s.bytes)throw Error(n<s.bytes&&declaredComplete?'network':'integrity');return out;
  }
  async function load({consent=false,restore=false,activate,onProgress=()=>{}}={}){
   if(running)throw Error('busy');
   if(consent!==true)throw Error('consent');
   if(typeof activate!=='function')throw Error('activate');
   running=true;const id=++revision,ctl=new AbortController();controller=ctl;
   let timedOut=false;const deadline=setTimeout(()=>{timedOut=true;ctl.abort();},loadTimeout);
   let cache=null,downloaded=0,staged=[],persisted=false;const started=performance.now();
   try{
    try{if(env.caches)cache=await abortable(()=>bounded(()=>env.caches.open(CACHE)),ctl.signal);}catch{}
    alive(id,ctl.signal);
    if(restore&&!cache)return {state:'missing'};
    for(const s of manifest){
     alive(id,ctl.signal);let bytes;
     if(restore){const r=await abortable(()=>bounded(()=>cache.match(s.url)),ctl.signal,cancelBody);if(!r)return {state:'missing'};bytes=await cachedBytes(r,s,ctl.signal);}
     else bytes=await fetchOne(s,ctl.signal,n=>onProgress({bytes:downloaded+n,total,rate:(downloaded+n)/Math.max(.05,(performance.now()-started)/1000)}));
     const value=await abortable(()=>verify(bytes,s),ctl.signal);staged.push({s,bytes,value});downloaded+=bytes.length;
    }
    alive(id,ctl.signal);
    // Activation must acknowledge the worker is usable before writing any cache.
    const candidate=await abortable(()=>activate(staged.map(x=>x.value),ctl.signal),ctl.signal,x=>x?.close?.());
    try{alive(id,ctl.signal);}catch(e){candidate?.close?.();throw e;}
    if(!candidate||typeof candidate.close!=='function')throw Error('activate');
    // Finalization is atomic with respect to cancellation; no cancellation after commit starts.
    clearTimeout(deadline);controller=null;
    active?.close();active=candidate;
    // Only the candidate cache participates in restore; no legacy model is needed.
    if(!restore&&cache){try{for(const x of staged)await bounded(()=>cache.put(x.s.url,new Response(x.bytes,{headers:{'Content-Type':'application/json','Content-Length':String(x.bytes.length)}})));persisted=true;}catch{try{await discardCache();}catch{}}}
    else persisted=restore;
    return {state:'ready',persisted,bytes:downloaded};
   }catch(e){
    if(restore&&cache&&!ctl.signal.aborted){try{await discardCache();}catch{}}
    const known=new Set(['integrity','crypto_unavailable','model_format','network','http','rate_limited','origin','mime','stream','cancelled','activate','storage_timeout']);
    throw Error(timedOut?'timeout':ctl.signal.aborted?'cancelled':known.has(e.message)?e.message:'load');
   }finally{clearTimeout(deadline);running=false;controller=null;}
  }
  function cancel(){controller?.abort();}
  // Removal and activation share one operation lock. Otherwise a new load
  // could persist into the same cache while an earlier remove is deleting it.
  async function remove(){
   if(running)throw Error('busy');
   running=true;revision++;
   const previous=active;active=null;
   try{try{previous?.close();}finally{await discardCache();}}
   finally{running=false;controller=null;}
  }
  return Object.freeze({load,cancel,remove,active:()=>!!active,total});
 }
 const api=Object.freeze({create,CACHE});if(typeof module==='object'&&module.exports)module.exports=api;else root.AVENQIR_RESEARCH_LOADER=api;
})(typeof self!=='undefined'?self:globalThis);
