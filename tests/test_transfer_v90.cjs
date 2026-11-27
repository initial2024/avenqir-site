"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
require(path.resolve(__dirname,'../site/transfer-schema.js'));
const api=globalThis.AVENQIR_TRANSFER;
const B='avenqir_v6_bookmarks',N='avenqir_v6_notes',F='avenqir.link-atlas.favorites.v8',T='avenqir_v5_timer';
const START='avenqir.start.favorites.v1';
const bookmark=(id,url,n)=>({id,name:n,category:'学习',url,note:'local note',at:1710000000000,fav:false,todo:true,custom:true});
const note=(id,title,body)=>({id,title,body,at:1710000000000});
const current={ [B]:[bookmark('b1','https://example.org/one','Local')], [N]:[note('n1','My note','LOCAL PRIORITY')], [F]:['https://example.org/favorite'],[T]:{total:60,remaining:60,label:'local timer',running:false,endAt:0}};
const incoming={ [B]:[bookmark('b1','https://example.org/one','Incoming older'),bookmark('b2','https://example.org/two','New')],[N]:[note('n1','My note','REMOTE OVERWRITE'),note('n2','New note','Added')],[F]:['https://example.org/favorite','https://example.org/another'],[T]:{total:120,remaining:120,label:'incoming',running:false,endAt:0}};
const storeMap=new Map(Object.entries(current).map(([k,v])=>[k,JSON.stringify(v)]));let changes=[];
const storage={getItem:k=>storeMap.get(k)||null,setItem:(k,v)=>{changes.push(k);storeMap.set(k,v)},removeItem:k=>storeMap.delete(k)};
assert.equal(api.validate(B,current[B]),true);
assert.equal(api.validate(N,current[N]),true);
const keys=[B,N,F,T];
const preview=api.prepareImport(storage,incoming,keys,'merge');
assert.equal(preview.counts.written,3,'only changed list keys to be written');
assert.equal(preview.counts.unchanged,1,'current timer is preserved on merge');
assert.equal(api.importInto(storage,incoming,keys,'merge'),3);
assert.deepEqual(JSON.parse(storeMap.get(B)).map(x=>x.id),['b1','b2']);
assert.equal(JSON.parse(storeMap.get(B))[0].name,'Local');
assert.deepEqual(JSON.parse(storeMap.get(N)).map(x=>x.id),['n1','n2']);
assert.equal(JSON.parse(storeMap.get(N))[0].body,'LOCAL PRIORITY','notes with same ID cannot be overwritten on merge');
assert.deepEqual(JSON.parse(storeMap.get(F)),['https://example.org/favorite','https://example.org/another']);
assert.equal(JSON.parse(storeMap.get(T)).label,'local timer');
assert.equal(api.importInto(storage,incoming,[B],'merge'),0,'idempotent merge');
const readable=api.toMarkdown(incoming);
assert.ok(readable.includes('AVENQIR 可读数据备份'));
assert.ok(readable.includes('New note'));
assert.ok(readable.includes('不能从此 Markdown 文件恢复'));
assert.ok(readable.includes('https://example.org/another'));
const snap=storeMap.get(B);
assert.equal(api.importInto(storage,incoming,[B],'replace'),1);
assert.notEqual(storeMap.get(B),snap,'replace can overwrite when explicitly selected');
assert.equal(JSON.parse(storeMap.get(B))[0].name,'Incoming older');
assert.throws(()=>api.prepareImport(storage,incoming,keys,'unexpected'),/未知恢复模式/);
assert.throws(()=>api.prepareImport(storage,{[B]:[{id:'broken'}]},[B],'merge'),/校验/);
assert.throws(()=>api.readArchive({format:'wrong',data:incoming}),/不是/);
for(const path of ['https://example.org','//example.org','../tools.html','tools.html?q=secret','javascript:evil']){
 assert.equal(api.validate(START,[path]),false,'reject arbitrary, private query and external shortcuts');
}
storage.setItem(START,JSON.stringify(['tools.html#image']));
const startArchive=api.makeExport(storage,['start']).archive;
assert.deepEqual(api.readArchive(startArchive)[START],['tools.html#image']);
assert.equal(api.importInto(storage,{[START]:['tools.html#image','notes.html']},[START],'merge'),1);
assert.deepEqual(JSON.parse(storage.getItem(START)),['tools.html#image','notes.html']);
assert.equal(api.validate('avenqir.start.recent.v1',['notes.html']),false,'usage history is outside the backup allowlist');
const rec=require('../site/recommendations-model.js');
const now=Date.now();
const localRec={version:1,clicks:[{toolId:'image',ts:now-600000},{toolId:'json',ts:now-91*rec.DAY}],
 ratings:{image:{stars:3,updatedAt:now-1000}}};
const incomingRec={version:1,clicks:[{toolId:'image',ts:now-599000},{toolId:'image',ts:now-1000}],
 ratings:{image:{stars:5,updatedAt:now-100}}};
storage.setItem(rec.KEY,JSON.stringify(localRec));
assert.equal(api.validate(rec.KEY,incomingRec),true);
assert.equal(api.validate(rec.KEY,{...incomingRec,ratings:{image:{stars:7,updatedAt:now}}}),false);
const archive=api.makeExport(storage,['recommendations']).archive;
assert.equal(archive.data[rec.KEY].clicks.length,1);
assert.equal(api.importInto(storage,{[rec.KEY]:incomingRec},[rec.KEY],'merge'),1);
const recResult=JSON.parse(storage.getItem(rec.KEY));
assert.equal(recResult.clicks.length,2);
assert.equal(recResult.ratings.image.stars,5);
assert.equal(rec.score(recResult,7,now).image.score,100);
assert.equal(api.validate('avenqir.recommendations.token.v1','0'.repeat(64)),false);
const before=storeMap.get(N);let failOnce=true;
const failureStore={
 getItem:k=>storeMap.get(k)||null,
 setItem:(k,v)=>{if(k===N&&failOnce){failOnce=false;throw Error('quota exceeded');}storeMap.set(k,v)},
 removeItem:k=>storeMap.delete(k)
};
assert.throws(()=>api.importInto(failureStore,incoming,[N],'replace'),/quota/);
assert.equal(storeMap.get(N),before,'rollback leaves original record unchanged');
const transHTML=fs.readFileSync(path.resolve(__dirname,'../site/transfer.html'),'utf8');
const ui=fs.readFileSync(path.resolve(__dirname,'../site/device-transfer.js'),'utf8');
assert.ok(transHTML.includes('id="transferMode"'));
assert.ok(transHTML.includes('id="transferExportMarkdown"'));
assert.ok(transHTML.includes('id="transferRestore"'));
assert.ok(ui.includes('API.prepareImport('));
assert.ok(ui.includes('API.toMarkdown('));
assert.ok(ui.includes("mode?.value==='replace'?'replace':'merge'"));
for(const f of [ui,fs.readFileSync(path.resolve(__dirname,'../site/transfer-schema.js'),'utf8')]){
 assert.ok(!f.includes('fetch('));
 assert.ok(!f.includes('XMLHttpRequest'));
}
console.log('PASS: JSON restore merge keeps local IDs, handles URL duplicates, private Markdown export, atomic rollback and exact replace');
