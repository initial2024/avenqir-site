"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../site');
const paths=require(path.join(dir,'atlas-paths.js'));
require(path.join(dir,'atlas-expansion.js'));
require(path.join(dir,'atlas-specialist.js'));
for(const name of ['a','b','c','d'])require(path.join(dir,'atlas-depth-'+name+'.js'));
const ai=require(path.join(dir,'atlas-ai.js'));
const regional=require(path.join(dir,'atlas-regional.js'));
const everyday=require(path.join(dir,'atlas-everyday.js'));
const regionalExt=require(path.join(dir,'atlas-regional-ext.js'));
const everydayExt=require(path.join(dir,'atlas-everyday-ext.js'));
const catalog=require(path.join(dir,'atlas-catalog-core.js'));
const gate=require(path.join(dir,'link-gate.js'));
const region=require(path.join(dir,'atlas-region.js'));
const merged=catalog.catalog(),codes=new Set(region.regions.map(x=>x.code));
assert.equal(region.regions.length,40,'40 manually selectable countries or regions');
assert.equal(codes.size,40,'country/region IDs must not collide');
assert.equal(new Set(region.regions.map(x=>x.label)).size,40,'region labels distinct');
assert.ok(region.regions.every(x=>x.area),'grouped select needs region geography');
assert.equal(regional.links.length,95);
assert.equal(everyday.links.length,60);
assert.equal(regionalExt.links.length,140);
assert.equal(everydayExt.links.length,112);
assert.equal(ai.links.length,62);
assert.equal(merged.length,1107,'combined catalog must include all new resource sources');
const actual=new Map();
for(const item of merged){
  if(!item.region)continue;
  assert.ok(codes.has(item.region),'invalid region: '+item.region);
  const record=actual.get(item.region)||{total:0,day:0,official:0,cats:new Set()};
  record.total++;record.cats.add(item.category);
  if(item.localUse==='everyday')record.day++;else record.official++;
  actual.set(item.region,record);
  const url=new URL(item.url);
  assert.equal(url.protocol,'https:','region URLs require HTTPS');
  assert.ok(!url.username&&!url.password);
  assert.equal(gate.urlRisk(url.href).blocked,false,'do not include blocked regional URL '+url.href);
  assert.equal(catalog.validURL(item.url),url.href);
}
assert.equal(actual.size,40);
for(const [c,v] of actual){
 assert.ok(v.total>=9,c+' should have substantial local sites');
 assert.ok(v.day>=4,c+' must have everyday sites');
 assert.ok(v.official>=5,c+' must have government/institutional resources');
 assert.ok(v.cats.size>=3,c+' must not be single-purpose');
}
assert.equal(region.hint('Asia/Tokyo'),'JP');
assert.equal(region.hint('Asia/Taipei'),'TW');
assert.equal(region.hint('Africa/Johannesburg'),'ZA');
assert.equal(region.hint('UTC'),null,'ambiguous zone must not guess');
assert.equal(region.hint('America/New_York'),null,'unsupported zone must not guess');
assert.equal(region.hint('__proto__'),null,'reject prototype-like input');
const data=new Map([['existing-private-notes','do not alter']]);let writes=0;
const storage={
 getItem:k=>data.get(k)||null,
 setItem:(k,v)=>{writes++;data.set(k,v);},
 removeItem:k=>{data.delete(k);}
};
const clock=()=>Date.UTC(2026,10,23,12);
let zone='Asia/Tokyo';
const engine=region.create(storage,()=>zone);
assert.equal(engine.selection().enabled,false);
assert.deepEqual(engine.recommend(merged,[],8,clock),[],'no passive recommendations before opt-in');
assert.equal(writes,0,'no storage write before opt-in');
assert.equal(data.has(region.KEY),false);
assert.equal(engine.choose('JP'),false,'cannot silently enable suggestions');
assert.equal(engine.enable(),true,'user can explicitly opt in');
assert.equal(engine.selection().code,'JP');
assert.equal(engine.selection().source,'timezone');
const auto=engine.recommend(merged,[],8,clock);
assert.equal(auto.length,8);
assert.ok(auto.every(x=>x.item.region==='JP'),'only selected region');
assert.ok(auto.filter(x=>x.item.localUse==='everyday').length>=4,'show practical local services before public references');
assert.ok(auto.some(x=>x.item.localUse!=='everyday'),'also show authoritative resources');
assert.ok(auto.every(x=>x.reason.includes('不是 IP 定位')));
assert.deepEqual(auto.map(x=>x.item.url),engine.recommend(merged,[],8,clock).map(x=>x.item.url),'stable within a day');
assert.equal(engine.choose('AE'),true);
assert.equal(engine.selection().source,'manual');
assert.equal(engine.selection().code,'AE');
assert.ok(engine.recommend(merged,[],8,clock).every(x=>x.item.region==='AE'));
assert.equal(engine.choose('ZZ'),false,'unknown region rejected');
assert.equal(engine.selection().code,'AE','failed change does not reset chosen region');
assert.equal(engine.useAutomatic(),true);
zone='Etc/UTC';
assert.equal(engine.selection().code,null);
assert.equal(engine.recommend(merged,[],8,clock).length,0,'unknown time zone must omit region cards');
const persisted=JSON.parse(data.get(region.KEY));
assert.deepEqual(Object.keys(persisted).sort(),['code','enabled','mode','v']);
assert.ok(!data.get(region.KEY).includes('https://'),'never save concrete URLs');
assert.equal(engine.disable(),false);
assert.equal(data.has(region.KEY),false,'turning off erases region model');
assert.equal(data.get('existing-private-notes'),'do not alter','do not touch other browser data');
const disabled=region.create(null,()=>zone);
assert.equal(disabled.enable(),false,'disabled storage cannot imply opt-in');
assert.deepEqual(disabled.recommend(merged,[],8,clock),[]);

const html=fs.readFileSync(path.join(dir,'directory.html'),'utf8');
const home=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
const ui=fs.readFileSync(path.join(dir,'atlas-region-ui.js'),'utf8');
const model=fs.readFileSync(path.join(dir,'atlas-region.js'),'utf8');
const wiring=fs.readFileSync(path.join(dir,'directory.js'),'utf8');
const privacy=fs.readFileSync(path.join(dir,'privacy.html'),'utf8');
for(const source of ['atlas-ai.js','atlas-regional.js','atlas-everyday.js','atlas-regional-ext.js','atlas-everyday-ext.js']){
 assert.ok(home.includes('src="'+source+'?v=18"'),'home missing resource '+source);
 assert.ok(html.includes('src="'+source+'?v=18"'),'directory missing resource '+source);
 assert.ok(sw.includes("'./"+source+"'"),'offline worker missing '+source);
 assert.ok(html.indexOf(source+'?v=18')<html.indexOf('atlas-catalog-core.js?v=19'),'resource before catalog');
 assert.ok(home.indexOf(source+'?v=18')<home.indexOf('atlas-catalog-core.js?v=19'),'home resource before catalog');
}
for(const tag of ['atlasRegionToggle','atlasRegionStatus','atlasRegionBody','atlasRegionSelect','atlasRegionCards','atlasRegionClear']){
 assert.ok(html.includes('id="'+tag+'"'),'missing local region control '+tag);
}
assert.ok(html.indexOf('atlas-region.js?v=18')<html.indexOf('atlas-region-ui.js?v=30'));
assert.ok(html.includes('atlas-region-ui.js?v=30') && html.indexOf('atlas-region-ui.js?v=30')<html.search(/directory\.js\?v=[0-9]+/),'v9.4 region UI must precede directory runtime');
assert.ok(ui.includes('optgroup'),'40-region selector needs grouping');
assert.ok(ui.includes("root.document?.documentElement?.lang"),'region UI must match visible document language');
assert.ok(ui.includes("return page||setting||'en'"),'explicit Traditional/Simplified document locale must override stale module locale');
assert.ok(ui.includes("Original source description (Chinese)"),'original source remains accessible on demand');
assert.ok(ui.includes("new Intl.DisplayNames"),'country names should follow chosen display language');
assert.ok(ui.includes('englishDescription(item,label)'),'English regional cards need a readable summary');
const localePacks = require(path.join(dir,'atlas-region-ui.js'));
const interfaceLocales = require(path.join(dir,'aq-i18n.js')).LOCALES.map(x=>x.code);
assert.deepEqual(localePacks.localeCodes,interfaceLocales,'all 40 interface languages must have regional labels');
for(const code of interfaceLocales){
 const uiPack=localePacks.localeCodes.includes(code);
 assert.equal(uiPack,true,'Missing regional UI locale '+code);
}
assert.ok(/^(?:East|Eastern) Asia$/.test(localePacks.regionGroup('东亚')),'runtime ICU can render the English M49 region name as East or Eastern Asia');
assert.equal(localePacks.PACK_KEYS.length,8,'regional labels must cover eight recurring UI roles');
const previousTestDocument=globalThis.document;
try {
 for (const code of interfaceLocales) {
  globalThis.document={documentElement:{lang:code}};
  for (const label of localePacks.PACK_KEYS) {
   const translated=localePacks.phrase(label);
   assert.ok(typeof translated==='string' && translated.length>2,
    'Missing '+label+' label for '+code);
  }
 }
 globalThis.document={documentElement:{lang:'ja'}};
 assert.equal(localePacks.language(),'ja','Japanese locale must remain Japanese');
 assert.ok(localePacks.phrase('auto').includes('タイムゾーン'));
 globalThis.document={documentElement:{lang:'zh-Hant'}};
 assert.equal(localePacks.language(),'zh-Hant','Traditional Chinese must not collapse to Simplified');
 assert.ok(localePacks.phrase('auto').includes('根據'));
 globalThis.document={documentElement:{lang:'ar'}};
 assert.ok(localePacks.phrase('auto').includes('المنطقة'));
} finally {
 if(previousTestDocument===undefined) delete globalThis.document;
 else globalThis.document=previousTestDocument;
}
assert.ok(ui.includes("new Intl.DisplayNames"),'country and area names use browser locale data');
assert.ok(ui.includes("phrase('auto')"),'auto selector localized, not hard-coded Chinese');
const regionUi=require(path.join(dir,'atlas-region-ui.js'));
assert.equal(regionUi.englishDescription({id:'every011',category:'旅游出行',description:'新加坡出行与配送服务'},'Singapore'),
 'Ride-hailing, transportation and delivery services in Singapore');
assert.equal(regionUi.englishDescription({id:'every014',category:'实用',description:'新加坡邮政和包裹查询'},'Singapore'),
 'Singapore postal services and parcel tracking');
const genericDescription=regionUi.englishDescription({id:'unknown',category:'Utilities',description:'第三方网站'},'Japan');
assert.ok(!/[\u3400-\u9fff]/.test(genericDescription),'English fallback should not leak Chinese text');
assert.ok(genericDescription.includes('Japan'));
assert.ok(wiring.includes('regionRecommendations?.render()'),'new catalog must re-render local regions');
for(const source of [ui,model]){
 for(const forbidden of ['fetch(', 'XMLHttpRequest', 'sendBeacon(', 'navigator.geolocation', 'getCurrentPosition(', 'RTCPeerConnection','document.cookie']){
  assert.ok(!source.includes(forbidden),'no invasive geolocation/network: '+forbidden);
 }
}
assert.ok(privacy.includes('可选地区推荐'));
assert.ok(privacy.includes('40 个国家或地区'));
assert.ok(!merged.some(x=>x.url==='https://english.claua.de/'),'do not disclose private reader');
assert.equal(gate.officialSourceReviewed('https://www.thaigov.go.th/'),false,'official-looking additions do not bypass exact-url trust');
const transfer=fs.readFileSync(path.join(dir,'transfer-schema.js'),'utf8');
assert.ok(!transfer.includes(region.KEY),'region choices not backed up or synced across devices');
console.log('PASS: 1107 distinct HTTPS destinations, 40 supported countries/regions with practical local choices, opt-in on-device-only timezone hints and official external-link safeguards');
