"use strict";
const fs=require('node:fs');
const path=require('node:path');
const site=path.join(__dirname,'../site');
const load=name=>require(path.join(site,name+'.js'));
for(const name of [
  'atlas-paths','atlas-expansion','atlas-specialist','atlas-depth-a','atlas-depth-b',
  'atlas-depth-c','atlas-depth-d','atlas-ai','atlas-regional','atlas-everyday',
  'atlas-regional-ext','atlas-everyday-ext','atlas-popular-links',
])load(name);
const gate=load('link-gate');
const file=path.join(site,'recommendations-catalog.json');
const prior=JSON.parse(fs.readFileSync(file,'utf8'));
const tools=prior.filter(item=>item.kind==='tool');
const sites=load('atlas-catalog-core').catalog().filter(item=>!gate.urlRisk(item.url).blocked)
  .map(({id,name,url,category})=>({id,title:[name,name],url:new URL(url).href,category,kind:'website'}));
const data=[...tools,...sites];
if(new Set(data.map(item=>item.id)).size!==data.length||data.some(item=>!/^[a-zA-Z0-9-]{1,40}$/.test(item.id)))throw Error('Invalid or duplicate recommendation IDs');
const json='[\n'+data.map(item=>'  '+JSON.stringify(item)).join(',\n')+'\n]\n';
if(process.argv.includes('--check')){
  if(fs.readFileSync(file,'utf8')!==json)throw Error('Recommendation catalog needs regeneration');
}else fs.writeFileSync(file,json);
