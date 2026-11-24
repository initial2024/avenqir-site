"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../site');
require(path.join(base,'atlas-expansion.js'));
const specialist=require(path.join(base,'atlas-specialist.js'));
require(path.join(base,'atlas-depth-a.js'));
require(path.join(base,'atlas-depth-b.js'));
require(path.join(base,'atlas-depth-c.js'));
require(path.join(base,'atlas-depth-d.js'));
require(path.join(base,'atlas-ai.js'));
require(path.join(base,'atlas-regional.js'));
require(path.join(base,'atlas-everyday.js'));
require(path.join(base,'atlas-regional-ext.js'));
require(path.join(base,'atlas-everyday-ext.js'));
const paths=require(path.join(base,'atlas-paths.js'));
const gate=require(path.join(base,'link-gate.js'));
const catalog=require(path.join(base,'atlas-catalog-core.js'));
const home=fs.readFileSync(path.join(base,'index.html'),'utf8');
const html=fs.readFileSync(path.join(base,'directory.html'),'utf8');
const worker=fs.readFileSync(path.join(base,'sw.js'),'utf8');
const supplied=[
 'https://cn.aifoxs.com/ai-detect',
 'https://ip.net.coffee/',
 'https://www.livme.cc/',
 'https://read.claua.de/'
];
assert.equal(specialist.links.length,31,'new resources must all be distinct (not double count Desmos/Regex101)');
assert.equal(new Set(specialist.links.map(x=>x.url)).size,specialist.links.length);
assert.equal(catalog.catalog().length,1239,'all static curated links should now be addressable');
for(const url of supplied){
 const x=catalog.catalog().find(r=>r.url===url);
 assert.ok(x,'missing user-requested destination '+url);
 assert.ok(x.name&&x.description,'missing informational description '+url);
 assert.equal(gate.urlRisk(url).blocked,false,'cannot open valid public HTTPS destination '+url);
 assert.equal(gate.officialSourceReviewed(url),false,'a submitted/uncertain URL must not inherit a safety/provenance exemption');
}
assert.ok(catalog.catalog().some(x=>x.url==='https://www.desmos.com/calculator'),'keep the existing Desmos tool');
assert.ok(!specialist.links.some(x=>x.url==='https://www.desmos.com/'),'no duplicate Desmos homepage counted as a new tool');
assert.ok(!specialist.links.some(x=>x.url==='https://regex101.com/'),'do not duplicate an existing developer resource');
assert.ok(!catalog.catalog().some(x=>x.url==='https://english.claua.de/'),'private English reader must never be added');
for(const x of specialist.links){
 const u=new URL(x.url);
 assert.equal(u.protocol,'https:');
 assert.equal(u.username,'');
 assert.equal(u.password,'');
 assert.ok(x.description.length>=8,'clear descriptions are needed');
 assert.equal(gate.urlRisk(u.href).blocked,false,'safe URL parsing: '+u.href);
}
const tasks=['mathvisual','ipdiagnose','aicheck','englishread'];
assert.equal(paths.flows.length,11);
for(const id of tasks){
 const flow=paths.flows.find(x=>x.id===id);
 assert.ok(flow&&flow.note,'missing task or usage warnings: '+id);
 const entries=paths.itemsForFlow(id,catalog.catalog());
 assert.deepEqual(entries.map(x=>x.url),flow.urls,'task sequence must resolve to actual catalog entries');
}
assert.ok(paths.flows.find(x=>x.id==='englishread').urls.includes('https://read.claua.de/'));
assert.ok(paths.flows.find(x=>x.id==='ipdiagnose').urls.includes('https://ip.net.coffee/'));
assert.ok(paths.flows.find(x=>x.id==='aicheck').note.includes('误报'));
assert.ok(html.includes('src="atlas-specialist.js?v=16"'));
assert.ok(home.includes('src="atlas-specialist.js?v=16"'));
assert.ok(html.indexOf('atlas-specialist.js?v=16')<html.indexOf('atlas-catalog-core.js?v=110'));
assert.ok(home.indexOf('atlas-specialist.js?v=16')<home.indexOf('atlas-catalog-core.js?v=110'));
assert.ok(worker.includes("'./atlas-specialist.js'"));
assert.ok(!worker.includes("'./english.claua.de'"));
const model=fs.readFileSync(path.join(base,'atlas-personalize.js'),'utf8');
assert.ok(!model.includes('fetch('),'local recommender must not upload activity');
assert.ok(!model.includes('navigator.sendBeacon('),'local recommender must not beacon activity');
const fixtureStore=new Map();
const storage={getItem:k=>fixtureStore.get(k)||null,setItem:(k,v)=>fixtureStore.set(k,v),removeItem:k=>fixtureStore.delete(k)};
const recommend=require(path.join(base,'atlas-personalize.js')).create(storage);
assert.equal(recommend.record('英语阅读','open'),false,'no passive usage tracking before user opt-in');
assert.equal(recommend.setEnabled(true),true);
assert.equal(recommend.record('英语阅读','open'),true);
const suggestions=recommend.recommend(catalog.catalog(),[],6);
assert.ok(suggestions.some(x=>x.item.category==='英语阅读'),'new language category participates in local recommendation');
assert.ok(suggestions.every(x=>x.reason),'explain every recommendation');
assert.equal(recommend.setEnabled(false),false);
assert.equal(fixtureStore.size,0,'turning off recommendations removes local model storage');
console.log('PASS: 1239 deduplicated HTTPS links, 4 submitted sites, 11 usable trails, safety gating and local opt-in');
