"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const site=path.resolve(__dirname,'../site');
const recommendation=require(path.join(site,'atlas-personalize.js'));
const KEY=recommendation.KEY;
let day=20500, writes=0, reads=0;
const map=new Map([['avenqir.link-atlas.favorites.v8','["https://example.com/"]']]);
const storage={
 getItem(k){reads++;return map.get(k)||null},
 setItem(k,v){writes++;map.set(k,v)},
 removeItem(k){writes++;map.delete(k)}
};
const now=()=>day*86400000;
const model=recommendation.create(storage,now);
const original=map.get('avenqir.link-atlas.favorites.v8');
assert.equal(model.read().enabled,false,'default must be OFF');
assert.deepEqual(model.recommend([{name:'x',category:'材料',url:'https://example.com/'}]),[],'no recommendations while OFF');
assert.equal(model.record('材料','open'),false,'no passive tracking before consent');
assert.equal(model.record('材料','save'),false,'no passive save tracking before consent');
assert.equal(writes,0,'OFF must not write any local usage records');
assert.equal(map.has(KEY),false);
assert.equal(model.setEnabled(true),true,'explicit consent enables model');
assert.equal(model.read().enabled,true);
assert.equal(model.record('材料','open'),true);
assert.equal(model.record('材料','open'),true);
assert.equal(model.record('科研','save'),true);
assert.equal(model.setInterest('教育',true),true);
assert.equal(model.setInterest('安全',true),true);
assert.equal(model.setInterest('材料',true),true);
assert.equal(model.setInterest('__proto__',true),false);
assert.equal(model.record('https://example.com/secret','open'),false,'category aggregation must reject raw URLs');
assert.equal(model.record('example.com','open'),false,'category aggregation must reject hostnames');
assert.equal(map.has(KEY),true);
const stored=JSON.parse(map.get(KEY));
assert.equal(stored.v,1);
assert.equal(stored.enabled,true);
assert.equal(stored.activity['材料'].opens,2);
assert.equal(stored.activity['科研'].saves,1);
assert.deepEqual(stored.interests,['教育','安全','材料']);
assert.equal('https://example.com/secret' in stored.activity,false,'do not persist concrete websites');
const fixture=[
 {url:'https://science.example/1',category:'材料',name:'材料数据库',description:'材料'},
 {url:'https://science.example/2',category:'材料',name:'晶体结构',description:'晶体'},
 {url:'https://science.example/3',category:'科研',name:'科研论文',description:'论文'},
 {url:'https://learn.example/4',category:'教育',name:'教育课程',description:'课程'},
 {url:'https://learn.example/5',category:'安全',name:'安全指南',description:'安全'},
 {url:'https://learn.example/6',category:'休闲',name:'休闲项目',description:'休闲'}
];
const picks=model.recommend(fixture,['https://science.example/1'],4);
assert.ok(picks.length>=3&&picks.length<=4);
assert.ok(!picks.some(x=>x.item.url==='https://science.example/1'),'existing favorites excluded');
assert.ok(!picks.some(x=>x.item.category==='休闲'),'no unsupported interests');
assert.ok(picks.every(x=>typeof x.reason==='string'&&x.reason.length>5));
assert.deepEqual(model.recommend(fixture,['https://science.example/1'],4).map(x=>x.item.url),picks.map(x=>x.item.url),'stable daily order');
day+=61;
const expired=model.read();
assert.equal(expired.activity['材料'],undefined,'old click data must expire');
assert.equal(expired.activity['科研'],undefined,'old favorite counts must expire');
assert.equal(JSON.parse(map.get(KEY)).activity['材料'],undefined,'storage itself must be physically pruned on next visit');
assert.deepEqual(expired.interests,['教育','安全','材料'],'manual choices can persist until disabled');
assert.equal(model.setEnabled(false),false);
assert.equal(map.has(KEY),false,'disable deletes all local recommendation data');
assert.equal(model.record('材料','open'),false);
assert.equal(map.get('avenqir.link-atlas.favorites.v8'),original,'other local favorites are never deleted');
const blocked={getItem(){return null},setItem(){throw new Error('QuotaExceeded')},removeItem(){}};
const unsupported=recommendation.create(blocked,now);
assert.equal(unsupported.setEnabled(true),false,'cannot promise consent when storage fails');
assert.equal(unsupported.record('材料','open'),false);
const core=fs.readFileSync(path.join(site,'atlas-personalize.js'),'utf8');
const ui=fs.readFileSync(path.join(site,'atlas-personalize-ui.js'),'utf8');
const html=fs.readFileSync(path.join(site,'directory.html'),'utf8');
const wiring=fs.readFileSync(path.join(site,'directory.js'),'utf8');
const privacy=fs.readFileSync(path.join(site,'privacy.html'),'utf8');
for(const x of ['fetch(', 'XMLHttpRequest','sendBeacon(','navigator.serviceWorker','document.cookie']){
 assert.ok(!core.includes(x),'no networking/tracking in recommendation model: '+x);
 assert.ok(!ui.includes(x),'no networking/tracking in recommendation UI: '+x);
}
for(const x of ['atlasLocalToggle','atlasLocalBody','atlasLocalCategories','atlasLocalCards','atlasLocalClear','atlasLocalStatus']){
 assert.ok(html.includes('id="'+x+'"'),'missing opt-in UI: '+x);
}
assert.ok(html.indexOf('atlas-personalize.js?v=16')<html.indexOf('atlas-personalize-ui.js?v=16'));
assert.ok(html.indexOf('atlas-personalize-ui.js?v=16')<html.indexOf('directory.js?v=16'));
assert.ok(wiring.includes("localRecommendations?.recordOpen("),'approved navigation records category');
assert.ok(wiring.includes("localRecommendations?.recordSave("),'save records category');
assert.ok(wiring.includes('items:()=>records'),'recommendations recompute with actual catalog');
assert.ok(privacy.includes('60 天'));
assert.ok(!privacy.includes('可以同步个性化'));
const worker=fs.readFileSync(path.join(site,'sw.js'),'utf8');
assert.ok(worker.includes("'./atlas-personalize.js'"));
assert.ok(worker.includes("'./atlas-personalize-ui.js'"));
const transfer=fs.readFileSync(path.join(site,'transfer-schema.js'),'utf8');
assert.ok(!transfer.includes(KEY),'recommendation profile excluded from transfer backups');
console.log('PASS: default-off, explicit opt-in, category-only recommendations, storage expiry, erase, no telemetry or backup');
