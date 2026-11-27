"use strict";
(function(root){
  // Tags describe existing editorial topics and task memberships, never price or security.
  function build(catalog,picks,model){
    const index=new Map(), labels=new Map(), ids=new Map(catalog.map(x=>[x.id,x.url]));
    const add=(id,key)=>{const url=ids.get(id);if(!url)return;if(!index.has(url))index.set(url,new Set());index.get(url).add(key);};
    for(const [id,icon,zh,en] of model.topics){labels.set('topic:'+id,[zh,en]);}
    for(const p of picks)if(labels.has('topic:'+p.topic))add(p.id,'topic:'+p.topic);
    for(const [id,zh,en,members] of model.tasks){if(!members.length)continue;labels.set('task:'+id,[zh,en]);for(const member of members)add(member,'task:'+id);}
    return {labels,forURL:url=>[...(index.get(url)||[])],matches:(url,selected)=>[...selected].every(t=>index.get(url)?.has(t))};
  }
  const api=Object.freeze({build});root.AVENQIR_ATLAS_TAGS=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
