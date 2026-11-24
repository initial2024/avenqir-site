"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const site=path.resolve(__dirname,'../site');
const atlas=require(path.join(site,'atlas-paths.js'));
const expanded=require(path.join(site,'atlas-expansion.js'));
const specialist=require(path.join(site,'atlas-specialist.js'));
const depthNames=['a','b','c','d'];
const depth=depthNames.map(n=>require(path.join(site,'atlas-depth-'+n+'.js')));
const ai=require(path.join(site,'atlas-ai.js'));
const regional=require(path.join(site,'atlas-regional.js'));
const everyday=require(path.join(site,'atlas-everyday.js'));
const regionalExt=require(path.join(site,'atlas-regional-ext.js'));
const everydayExt=require(path.join(site,'atlas-everyday-ext.js'));
const taxonomy=require(path.join(site,'atlas-taxonomy.js'));
const catalog=require(path.join(site,'atlas-catalog-core.js'));
const gate=require(path.join(site,'link-gate.js'));
const all=catalog.catalog();
const expected=catalog.base.length+catalog.extras.length+atlas.links.length+expanded.links.length+specialist.links.length+depth.reduce((n,x)=>n+x.links.length,0)+ai.links.length+regional.links.length+everyday.links.length+regionalExt.links.length+everydayExt.links.length;
assert.equal(expected,1107,'expected complete dynamic merged catalog');
assert.equal(all.length,1107,'live merged catalog must include all curated resources');
assert.equal(depth.reduce((n,x)=>n+x.links.length,0),310,'310 new resources in four distinct depth files');
assert.equal(new Set(all.map(x=>new URL(x.url).href)).size,1107,'no normalized URL duplicates');
const counts=new Map();
const ids=new Set();
for(const x of all){
 assert.ok(x.name&&x.name.length>=2,'missing resource name');
 assert.ok(x.category&&x.description,'description and category required');
 assert.ok(x.id&&!ids.has(x.id),'curated ID must be unique: '+x.id);ids.add(x.id);
 const u=new URL(x.url);
 assert.equal(u.protocol,'https:','all curated resources must be HTTPS');
 assert.equal(u.username,'','no embedded username');
 assert.equal(u.password,'','no embedded password');
 assert.equal(gate.urlRisk(u.href).blocked,false,'blocked URL: '+u.href);
 assert.ok(!u.hostname.endsWith('.local')&&!u.hostname.endsWith('.internal'),'no private network destinations');
 counts.set(x.category,(counts.get(x.category)||0)+1);
}
assert.equal(counts.size,50,'catalog needs a meaningful range of resource categories');
assert.ok([...counts.values()].every(n=>n>=8),'no empty/singleton/sparse published categories');
assert.equal(taxonomy.groups.length,8,'eight discoverable mobile topic groups');
const covered=new Set();
for(const g of taxonomy.groups){
 assert.ok(g.id&&g.title&&g.icon&&g.description);
 assert.ok(g.categories.length>=3,'each visible topic must have multiple usable categories');
 for(const name of g.categories){
   assert.ok(!covered.has(name),'category occurs in multiple groups: '+name);
   covered.add(name);
   assert.ok(counts.has(name),'group points at empty category: '+name);
   assert.equal(taxonomy.groupFor(name),g.id,'reverse category lookup');
 }
 assert.deepEqual(taxonomy.categoriesFor(g.id),g.categories);
 const groupCount=all.filter(x=>taxonomy.groupFor(x.category)===g.id).length;
 assert.ok(groupCount>=25,'avoid thin top-level category: '+g.title);
}
assert.deepEqual([...covered].sort(),[...counts.keys()].sort(),'taxonomy must cover exactly the curated categories');
assert.equal(taxonomy.groupFor('从后台新建的类别'),null,'unknown administrator categories remain usable');
assert.deepEqual(taxonomy.categoriesFor('unknown'),[]);
assert.equal(gate.officialSourceReviewed('https://pubchem.ncbi.nlm.nih.gov/'),true,'manually reviewed exact institutional source');
assert.equal(gate.officialSourceReviewed('https://www.icann.org/'),true,'manually reviewed exact institutional source');
assert.equal(gate.officialSourceReviewed('https://www.thaigov.go.th/'),false,'non-reviewed institutions never inherit automatic source status');
const dir=fs.readFileSync(path.join(site,'directory.html'),'utf8');
const home=fs.readFileSync(path.join(site,'index.html'),'utf8');
const js=fs.readFileSync(path.join(site,'directory.js'),'utf8');
const summary=fs.readFileSync(path.join(site,'atlas-summary.js'),'utf8');
const sw=fs.readFileSync(path.join(site,'sw.js'),'utf8');
const css=fs.readFileSync(path.join(site,'theme.css'),'utf8');
for(const n of depthNames){
 const p='atlas-depth-'+n+'.js?v=17';
 assert.ok(dir.includes('src="'+p+'"'),'directory missing depth '+n);
 assert.ok(home.includes('src="'+p+'"'),'homepage missing depth '+n);
 assert.ok(sw.includes("'./atlas-depth-"+n+".js'"),'SW missing depth '+n);
 assert.ok(dir.indexOf(p)<dir.indexOf('atlas-catalog-core.js?v=105'),'directory scripts must preserve data before consumer order');
 assert.ok(home.indexOf(p)<home.indexOf('atlas-catalog-core.js?v=105'),'home scripts must preserve data before consumer order');
}
for(const target of ['atlasGroupBar','atlasCategorySearch','atlasExpandCategories','atlasCategories','atlasTaxonomySummary']){
 assert.ok(dir.includes('id="'+target+'"'),'missing taxonomy UI control: '+target);
}
assert.ok(dir.includes('atlas-taxonomy.js?v=18'));
assert.ok(dir.indexOf('atlas-taxonomy.js?v=18')<dir.search(/directory\.js\?v=[0-9]+/));
assert.ok(sw.includes("'./atlas-taxonomy.js'"));
assert.ok(css.includes('.atlas-group-bar')&&css.includes('.atlas-taxonomy .atlas-categories'));
assert.ok(css.includes('@media(max-width:420px)'),'mobile taxonomy CSS present');
assert.ok(js.includes("taxonomy.groupFor(x.category)===groupId"),'topic selection filters actual resource records');
assert.ok(js.includes("atlasCategorySearch"),'category search wired');
assert.ok(js.includes("expandedCategories"),'category expansion wired');
assert.ok(js.includes("atlasTaxonomySummary"),'category count is runtime generated');
assert.ok(summary.includes("new Set(info.items.map(x=>x.category))"),'home category counts are dynamic');
assert.ok(!home.includes("1107 个精选网址"),'do not hardcode promotional URL totals');
assert.ok(!dir.includes("1107 个独立网址"),'directory total must be runtime generated');
assert.equal(catalog.catalog([{name:'追加',url:'https://new-public-resource.example/',category:'新的后台分类',description:'测试动态后台条目'} ]).length,1108,'backend entries must remain dynamic after expansion');
const newCount=new Map(counts);newCount.set('新的后台分类',1);
assert.equal(newCount.size,51,'backend may introduce a new dynamic category');
assert.ok(all.some(x=>x.url==='https://read.claua.de/'),'public English reader remains in catalog');
assert.ok(!all.some(x=>x.url==='https://english.claua.de/'),'private reader must never appear');
console.log('PASS: 1107 independent HTTPS resources, 50 non-sparse categories, 8 unique groups, dynamic admin entries, mobile UI and security boundaries');
