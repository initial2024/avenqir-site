"use strict";
const assert=require("node:assert/strict");
const topics=require("../research/atlas-multilingual-topics.js"),fine=require("../research/atlas-multilingual-intents.js"),old=require("../site/atlas-domain-embedding.js"),model=require("../research/atlas-model-v2.json");
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


function combine(a,b,alpha){const m=new Map(a.map(x=>[x.id,x.score*alpha]));for(const x of b)m.set(x.id,(m.get(x.id)||0)+x.score*(1-alpha));return [...m].map(([id,score])=>({id,score})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));}
function compare(rows,tasks,unicodeFeatures,legacyFeatures,train,classify,parents){
 const metrics={unicode:{top1:0,top5:0,parent:0},legacy:{top1:0,top5:0,parent:0},mixed:{top1:0,top5:0,parent:0}};let total=0;
 for(let fold=0;fold<5;fold++){
  const tr=rows.filter((_,i)=>i%5!==fold),te=rows.filter((_,i)=>i%5===fold),u=train(tr,tasks,unicodeFeatures),l=train(tr,tasks,legacyFeatures);
  for(const row of te)for(let i=0;i<tasks.length;i++){const q=row[i+1],a=classify(u,unicodeFeatures,q),b=classify(l,legacyFeatures,q),group=id=>parents[id]||id;total++;
   for(const [key,rank] of [['unicode',a],['legacy',b],['mixed',combine(a,b,.65)]]){
    if(rank[0].score<=0)continue;const t=metrics[key];t.top1+=Number(rank[0].id===tasks[i]);t.top5+=Number(rank.slice(0,5).some(x=>x.id===tasks[i]&&x.score>0));t.parent+=Number(group(rank[0].id)===group(tasks[i]));
   }
  }
 }
 return {total,...metrics};
}

const tasks=topics.tasks.concat(fine.tasks),rows=topics.rows.map((r,i)=>{assert.equal(r[0],fine.rows[i][0]);return r.concat(fine.rows[i].slice(1));});
assert.deepEqual([...tasks].sort(),model.classes.map(x=>x[0]).sort());
assert.equal(rows.length,40);assert.equal(tasks.length,64);
for(const [locale,...phrases] of topics.rows)for(let i=0;i<topics.tasks.length;i++)assert.equal(topics.resolve(phrases[i]),topics.tasks[i],locale);
const report=compare(rows,tasks,unicodeFeatures,old.features,train,classify,model.parents);
assert.equal(report.total,2560);
console.log('64_CLASS_HELD_OUT_REPORT',JSON.stringify(report));

const caps=[96,128,160,192],codec=require('../research/atlas-model-codec.js'),fs=require('node:fs'),path=require('node:path');
const metrics=caps.map(cap=>({cap,top1:0,top5:0,parent:0}));let total=0;
for(let fold=0;fold<5;fold++){const tr=rows.filter((_,i)=>i%5!==fold),te=rows.filter((_,i)=>i%5===fold),weights=caps.map(cap=>train(tr,tasks,unicodeFeatures,cap));
 for(const row of te)for(let i=0;i<tasks.length;i++){total++;for(let j=0;j<caps.length;j++){const rank=classify(weights[j],unicodeFeatures,row[i+1]);const m=metrics[j];if(rank[0].score<=0)continue;const group=id=>model.parents[id]||id;m.top1+=Number(rank[0].id===tasks[i]);m.top5+=Number(rank.slice(0,5).some(x=>x.id===tasks[i]&&x.score>0));m.parent+=Number(group(rank[0].id)===group(tasks[i]));}}
}
const payloads=caps.map(cap=>({schema:'aq-multilingual-research-1',bins:8192,classes:train(rows,tasks,unicodeFeatures,cap)})),packed=payloads.map(codec.serialize);
const domainBytes=fs.statSync(path.join(__dirname,'../research/atlas-model-v2.packed.json')).size;
for(let i=0;i<caps.length;i++){metrics[i].packedBytes=Buffer.byteLength(packed[i]);metrics[i].combinedBytes=metrics[i].packedBytes+domainBytes;}
const best=metrics.filter(m=>m.combinedBytes<=100*1024).sort((a,b)=>b.top1-a.top1||b.top5-a.top5||a.packedBytes-b.packedBytes)[0];
assert.ok(best);assert.equal(total,2560);
const idx=caps.indexOf(best.cap),target=path.join(__dirname,'../research/atlas-full-unicode-weights.packed.json');
assert.deepEqual(codec.deserialize(packed[idx]),payloads[idx]);
if(process.argv.includes('--write'))fs.writeFileSync(target,packed[idx]);
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),packed[idx]);
console.log('64_CLASS_PACKED_CAP_REPORT',JSON.stringify({total,metrics,best}));

const crypto=require('node:crypto');
const bundlePath=path.join(__dirname,'../research/atlas-semantic-bundle-v2.json');
const domainPacked=JSON.parse(fs.readFileSync(path.join(__dirname,'../research/atlas-model-v2.packed.json'),'utf8'));
const fullBundle=JSON.stringify({schema:'aq-semantic-bundle-2',domain:domainPacked,unicode:JSON.parse(packed[idx])})+'\n';
const spec=require('../research/atlas-semantic-manifest.js');
assert.equal(Buffer.byteLength(fullBundle),spec.bytes);assert.equal(crypto.createHash('sha256').update(fullBundle).digest('hex'),spec.sha256);
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(bundlePath,'utf8'),fullBundle);
const unicodeRuntime=require('../research/atlas-unicode-runtime.js');
const loadedUnicode=unicodeRuntime.create(codec.deserialize(packed[idx]),tasks);
for(const q of ['ضغط صورة','PDFを圧縮','QR 코드 생성','научные статьи','地图']){
 assert.deepEqual([...unicodeRuntime.unicodeFeatures(q)], [...unicodeFeatures(q)]);
 const a=loadedUnicode.classify(q),b=classify(payloads[idx].classes,unicodeFeatures,q);
 assert.deepEqual(a.map(x=>x.id),b.map(x=>x.id));
 for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i].score-b[i].score)<1e-10);
}
console.log('FULL_BUNDLE_MANIFEST_AND_RUNTIME_PASS',spec.bytes);

// All UI locales have complete status labels, and ambiguous phrases map only
// to existing reviewed canonical queries; no new intent is fabricated.
const ui=require('../research/atlas-semantic-locales.js');
assert.equal(fine.clarificationRows.length,40);
assert.equal(new Set(fine.clarificationRows.map(r=>fine.normalize(r[1]))).size,40);
assert.deepEqual(ui.locales,fine.locales);
for(const [id,q,qr,code,ai] of fine.clarificationRows){
 const labels=ui.get(id).queryStatus;
 assert.equal(labels.length,9,id);assert.ok(labels.every(x=>typeof x==='string'&&x.trim().length>0),id);
 assert.deepEqual(fine.clarify(q)?.phrases,[qr,code,ai],id);
 assert.equal(fine.clarify(q+' without upload'),null,id);
 assert.equal(fine.resolve(qr).id,'qr-create',id);
 assert.equal(topics.resolve(code),'code',id);assert.equal(topics.resolve(ai),'ai',id);
}
console.log('CLARIFICATION_LOCALE_REPORT',JSON.stringify({locales:40,statusFields:360,canonicalChoices:120,modifiedQueryRefusals:40}));
