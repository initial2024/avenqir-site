"use strict";
const assert=require("node:assert/strict");
const {rows,tasks}=require("../research/atlas-multilingual-intents.js");
const old=require("../site/atlas-domain-embedding.js");

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
function train(rows,tasks,features,cap=192){
 const accum=tasks.map((id,i)=>{const m=new Map();for(const row of rows)for(const [k,w] of features(row[i+1]))m.set(k,(m.get(k)||0)+w/rows.length);return [id,m]});
 const df=new Map();for(const [,m] of accum)for(const k of m.keys())df.set(k,(df.get(k)||0)+1);
 return accum.map(([id,m])=>{const v=[...m].map(([k,w])=>[k,w*(1+Math.log((tasks.length+1)/(1+df.get(k))))]).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,cap),norm=Math.hypot(...v.map(x=>x[1]))||1;return [id,v.map(([k,w])=>[k,Math.round(w/norm*4096)]).filter(x=>x[1]>0).sort((a,b)=>a[0]-b[0])];});
}
function classify(weights,features,q){const f=features(q);return weights.map(([id,ws])=>({id,score:ws.reduce((n,[k,w])=>n+(f.get(k)||0)*w/4096,0)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));}
function crossValidate(rows,tasks,features){
 let total=0,top1=0,top5=0,zero=0;const perLocale=[];
 for(let fold=0;fold<5;fold++){
  const tr=rows.filter((_,i)=>i%5!==fold),te=rows.filter((_,i)=>i%5===fold),weights=train(tr,tasks,features);
  for(const row of te){let correct=0;for(let i=0;i<tasks.length;i++){const rank=classify(weights,features,row[i+1]);total++;if(rank[0].score<=0){zero++;continue;}if(rank[0].id===tasks[i]){top1++;correct++;}if(rank.slice(0,5).some(x=>x.id===tasks[i]&&x.score>0))top5++;}perLocale.push({locale:row[0],top1:correct});}
 }
 return {total,top1,top5,zero,perLocale};
}

const fs=require('node:fs'),path=require('node:path');
const baseline=crossValidate(rows,tasks,old.features),unicode=crossValidate(rows,tasks,unicodeFeatures);
const payload=JSON.stringify({schema:'aq-multilingual-research-1',bins:8192,classes:train(rows,tasks,unicodeFeatures)})+'\n';
assert.equal(baseline.total,1120);assert.equal(unicode.total,1120);assert.ok(Buffer.byteLength(payload)<=64*1024);
for(const q of ['한국어','العربية','हिन्दी','ไทย','Русский','বাংলা'])assert.ok(unicodeFeatures(q).size>0);
console.log('UNICODE_HELD_OUT_LOCALE_REPORT',JSON.stringify({baseline,unicode,bytes:Buffer.byteLength(payload)}));
const target=path.join(__dirname,'../research/atlas-multilingual-weights.json');
if(process.argv.includes('--write'))fs.writeFileSync(target,payload);
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),payload);
