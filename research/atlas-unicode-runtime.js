"use strict";
(function(root){
function unicodeFeatures(raw){
 const q=String(raw||'').normalize('NFKC').toLowerCase().slice(0,512),map=new Map();
 function add(s,w){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);const k=(h>>>0)%8192;map.set(k,Math.min(8,(map.get(k)||0)+w));}
 for(const token of q.match(/[\p{L}\p{M}\p{N}]+/gu)||[]){
  const chars=Array.from(token);
  if(chars.length>=2)add('w:'+token,1.5);
  for(let i=0;i<chars.length;i++){add('u:'+chars[i],.10);if(i+1<chars.length)add('b:'+chars.slice(i,i+2).join(''),.9);if(i+2<chars.length)add('t:'+chars.slice(i,i+3).join(''),1.1);}
 }
 const norm=Math.hypot(...map.values())||1;for(const [k,v] of map)map.set(k,v/norm);
 return map;
}

function create(model,expectedIds){
 if(model?.schema!=='aq-multilingual-research-1'||model.bins!==8192||!Array.isArray(model.classes)||model.classes.length!==64)throw Error('UNICODE_SCHEMA');
 const map=new Map();
 for(const [id,weights] of model.classes){
  if(!expectedIds.includes(id)||map.has(id)||!Array.isArray(weights)||weights.length<1||weights.length>192)throw Error('UNICODE_CLASS');
  let last=-1;const w=new Map();for(const [k,v] of weights){if(!Number.isInteger(k)||k<=last||k>=8192||!Number.isInteger(v)||v<1||v>4096)throw Error('UNICODE_WEIGHT');w.set(k,v/4096);last=k;}map.set(id,w);
 }
 function score(id,f){let n=0;const weights=map.get(id);if(!weights)return 0;for(const [k,v] of f)n+=v*(weights.get(k)||0);return n;}
 function classify(q){const f=unicodeFeatures(q);return [...map.keys()].map(id=>({id,score:score(id,f)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));}
 return Object.freeze({features:unicodeFeatures,score,classify});
}
const api=Object.freeze({unicodeFeatures,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.AVENQIR_RESEARCH_UNICODE=api;
})(typeof self!=='undefined'?self:globalThis);
