"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const site=path.resolve(__dirname,'../site');
for(const file of [
 'atlas-paths','atlas-expansion','atlas-specialist','atlas-depth-a','atlas-depth-b',
 'atlas-depth-c','atlas-depth-d','atlas-ai','atlas-regional','atlas-everyday',
 'atlas-regional-ext','atlas-everyday-ext','atlas-popular-links'
])require(path.join(site,file+'.js'));
const catalog=require(path.join(site,'atlas-catalog-core.js')).catalog();
const newLinks=require(path.join(site,'atlas-popular-links.js')).links;
const picks=require(path.join(site,'atlas-popular-picks.js'));
const gate=require(path.join(site,'link-gate.js'));
const safety=require(path.join(site,'atlas-safety.js'));
const model=require(path.join(site,'atlas-popular.js'));
const full=model.pool(catalog);
const byId=new Map(full.map(pick=>[pick.entry.id,pick]));
const urls=new Set(catalog.map(entry=>new URL(entry.url).href));
assert.equal(catalog.length,1239+newLinks.length);
assert.equal(catalog.length,urls.size);
assert.ok(newLinks.length>=80&&newLinks.length<=150);
assert.ok(newLinks.every(entry=>gate.officialSourceReviewed(entry.url)&&safety.inspect(entry.url).type==='reviewed'));
assert.ok(gate.OFFICIAL_URLS.length/catalog.length>=.8);
assert.ok(full.length>=60&&full.length<=100);
assert.equal(full.length,picks.length);
assert.equal(byId.size,full.length);
assert.ok(full.filter(pick=>pick.home).length>=12);
for(const {entry,topic,description,reason,login,files,region,randomSafe} of full){
 assert.ok(entry.name&&urls.has(new URL(entry.url).href));
 assert.ok(model.topics.some(row=>row[0]===topic));
 assert.ok(description[0].length>=20&&description[0].length<=45,entry.id);
 assert.ok(description[1]&&reason.every(Boolean));
 assert.ok(['no','optional','required','depends'].includes(login));
 assert.ok([files,region,randomSafe].every(v=>typeof v==='boolean'));
 if(randomSafe)assert.notEqual(files,true);
}
for(const [id,,,ids] of model.tasks){
 if(id==='random')continue;
 const mounted=ids.filter(key=>byId.has(key));
 assert.ok(mounted.length>=3&&mounted.length<=8,id);
}
const pending={...byId.get('dA055'),randomSafe:true};
assert.ok(pending.entry);
assert.equal(model.access(pending.entry.url,gate,safety).confirmed,false);
const canva=byId.get('n078');
assert.equal(model.access(canva.entry.url,gate,safety).confirmed,true);
const ready=byId.get('r11');
assert.equal(model.access(ready.entry.url,gate,safety).confirmed,true);
const bad={entry:{url:'https://127.0.0.1/'},randomSafe:true};
const blocked={threatStatus:url=>url===ready.entry.url?'listed':'unknown'};
assert.equal(model.drawRandom([bad,pending,ready],gate,blocked,null,()=>0),null);
assert.equal(model.drawRandom([bad,pending,ready],gate,safety,null,()=>0),ready);
assert.equal(model.drawRandom([ready],gate,null,null,()=>0),null);
assert.equal(model.access('https://www.khanacademy.org/?sample=1',gate,safety).confirmed,false);
for(const page of ['index.html','directory.html']){
 const html=fs.readFileSync(path.join(site,page),'utf8');
 for(const asset of ['atlas-popular-links','atlas-popular-picks','atlas-popular','atlas-popular-ui']){
  assert.ok(html.includes(asset+'.js?v='),page+' '+asset);
 }
 assert.ok(html.indexOf('atlas-popular-links.js?')<html.indexOf('atlas-catalog-core.js?'));
 assert.ok(html.indexOf('atlas-safety.js?')<html.indexOf('atlas-popular-ui.js?'));
}
console.log('PASS Popular picks, duplicate prevention, intent coverage, exact evidence and random exclusions');
