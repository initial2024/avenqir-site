"use strict";
(function(root){
function features(raw){
 const text=String(raw||'').normalize('NFKC').toLowerCase().slice(0,512);
 const f=new Map();
 function add(s,w){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);const k=(h>>>0)%4096;f.set(k,Math.min(8,(f.get(k)||0)+w));}
 for(const word of text.match(/[a-z0-9]+/g)||[]){if(word.length<2||/^(the|and|for|with|from|can|how|what|where|this|that|have|want|find|help|you|my|your|into|online)$/.test(word))continue;add('w:'+word,2);if(word.length>=3)for(let i=0;i+3<=word.length;i++)add('g:'+word.slice(i,i+3),.45);}
 for(const chunk of text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu)||[]){for(let i=0;i<chunk.length;i++){add('c:'+chunk[i],.18);if(i+1<chunk.length)add('b:'+chunk.slice(i,i+2),1.2);if(i+2<chunk.length)add('t:'+chunk.slice(i,i+3),.7);}}
 const norm=Math.sqrt([...f.values()].reduce((n,w)=>n+w*w,0))||1;for(const [k,v] of f)f.set(k,v/norm);return f;
}
const SPEC=Object.freeze({"version":"1","file":"atlas-semantic-model-v1.json","bytes":34879,"sha256":"b502f1d6106471627b3adbabfa32c668c100a3a92064136930a770c9d5a126eb","dimensions":28});
function create(model){
 if(!model||model.schema!=='aq-domain-embedding-1'||model.bins!==4096||!Array.isArray(model.classes)||model.classes.length!==SPEC.dimensions)throw Error('model schema');
 const lookup=new Map(),ids=new Set();
 model.classes.forEach(([id,weights],i)=>{if(typeof id!=='string'||ids.has(id)||!Array.isArray(weights)||weights.length>4096)throw Error('model classes');ids.add(id);const seen=new Set();for(const [k,w] of weights){if(!Number.isInteger(k)||k<0||k>=4096||seen.has(k)||!Number.isInteger(w)||w<=0||w>4096)throw Error('model weight');seen.add(k);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push([i,w/4096]);}});
 const docCache=new WeakMap();
 function embed(text){const f=features(text),v=new Float32Array(model.classes.length);for(const [k,w] of f)for(const [i,c] of lookup.get(k)||[])v[i]+=w*c;let peak=0;for(const x of v)peak=Math.max(peak,x);for(let i=0;i<v.length;i++)v[i]=Math.max(0,v[i]-.045);const norm=Math.hypot(...v);if(norm)for(let i=0;i<v.length;i++)v[i]/=norm;return {v,peak};}
 function doc(item){let e=docCache.get(item);if(!e){e=embed([item.name,item.category,item.description].join(' '));docCache.set(item,e);}return e;}
 function rank(query,items){const q=embed(query);if(q.peak<.16||String(query).trim().length<3)return new Map();const out=[];for(const item of items.slice(0,2500)){const d=doc(item);if(d.peak<.13)continue;let sim=0;for(let i=0;i<q.v.length;i++)sim+=q.v[i]*d.v[i];if(sim>=.72)out.push([item.url,sim]);}out.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));return new Map(out.slice(0,12).map(([url,sim])=>[url,1+sim*2]));}
 return Object.freeze({embed,rank});
}
const api=Object.freeze({SPEC,features,create});root.AVENQIR_DOMAIN_EMBEDDING=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
