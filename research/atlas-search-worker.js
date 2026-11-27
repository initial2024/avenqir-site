"use strict";
// Research only. The caller must verify the bytes and obtain consent before init.
importScripts('../site/atlas-domain-embedding.js','atlas-model-codec.js','atlas-unicode-runtime.js','atlas-multilingual-intents.js','atlas-multilingual-topics.js','atlas-retrieval-runtime.js');
const embed=globalThis.AVENQIR_DOMAIN_EMBEDDING, retrieval=globalThis.AVENQIR_RESEARCH_RETRIEVAL;
let state=null,epoch=0;
function validModel(model){
 if(model?.schema!=='aq-domain-embedding-research-2'||model.bins!==4096||!Array.isArray(model.classes)||model.classes.length!==64||!model.parents||typeof model.parents!=='object')throw Error('MODEL_SCHEMA');
 const ids=new Set();
 for(const row of model.classes){if(!Array.isArray(row)||row.length!==2)throw Error('MODEL_CLASS');const [id,weights]=row;if(typeof id!=='string'||ids.has(id)||!Array.isArray(weights)||weights.length>4096)throw Error('MODEL_CLASS');ids.add(id);const keys=new Set();for(const pair of weights){if(!Array.isArray(pair)||pair.length!==2)throw Error('MODEL_WEIGHT');const [k,w]=pair;if(!Number.isInteger(k)||k<0||k>=4096||keys.has(k)||!Number.isInteger(w)||w<1||w>4096)throw Error('MODEL_WEIGHT');keys.add(k);}}
 for(const [id,p] of Object.entries(model.parents))if(!ids.has(id)||!ids.has(p)||id===p)throw Error('MODEL_PARENT');
}
function loadCatalog(raw){
 if(!Array.isArray(raw)||raw.length>10000)throw Error('CATALOG_LIMIT');
 return raw.filter(x=>x&&typeof x.url==='string'&&typeof x.name==='string'&&typeof x.description==='string').map(x=>({url:x.url.slice(0,1800),name:x.name.slice(0,90),category:String(x.category||'').slice(0,40),description:x.description.slice(0,320)})).filter(x=>{try{const u=new URL(x.url);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}});
}
self.onmessage=e=>{
 const m=e.data;if(!m||!Number.isSafeInteger(m.id)||m.id<0)return;
 try{
  if(m.type==='init'){
   state=null;epoch++;
   const codec=globalThis.AVENQIR_RESEARCH_CODEC;let model,unicode=null;
   if(typeof m.model==='string'){
    const raw=JSON.parse(m.model);
    if(raw.schema==='aq-semantic-bundle-2'){
     model=codec.deserialize(JSON.stringify(raw.domain));validModel(model);
     unicode=globalThis.AVENQIR_RESEARCH_UNICODE.create(codec.deserialize(JSON.stringify(raw.unicode)),model.classes.map(x=>x[0]));
    }else model=codec.deserialize(m.model);
   }else model=m.model;
   validModel(model);
   const baseline=embed.create({schema:'aq-domain-embedding-1',bins:model.bins,classes:model.classes.slice(0,28)}),items=loadCatalog(m.items);
   state={session:retrieval.createSession(items,model,embed.features,baseline,unicode)};
   self.postMessage({type:'ready',id:m.id,epoch,count:items.length});return;
  }
  if(m.type==='clear'){state=null;epoch++;self.postMessage({type:'cleared',id:m.id,epoch});return;}
  if(m.type!=='rank'||!state||m.epoch!==epoch||typeof m.query!=='string')throw Error('STALE_OR_NOT_READY');
  const started=performance.now();
  const urls=state.session.rank(m.query);
  self.postMessage({type:'result',id:m.id,epoch,urls,elapsedMs:performance.now()-started});
 }catch(e){self.postMessage({type:'error',id:m.id,epoch,code:String(e.message||'WORKER_ERROR').slice(0,80)});}
};
