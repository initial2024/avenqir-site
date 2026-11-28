#!/usr/bin/env node
"use strict";
// Build to a NEW temporary/staging directory only. Never uploads or mutates site/.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=path.join(root,'site'),research=path.join(root,'research');
const spec=require('../research/atlas-semantic-manifest.js');
const assets=['atlas-semantic-manifest.js','atlas-semantic-locales.js','atlas-candidate-loader.js','atlas-worker-client.js','atlas-worker-activation.js','atlas-semantic-directory-adapter.js','atlas-search-worker.js','atlas-model-codec.js','atlas-unicode-runtime.js','atlas-multilingual-intents.js','atlas-multilingual-topics.js','atlas-retrieval-runtime.js'];
const entries=assets.slice(0,6);
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function replaceOnce(s,a,b){assert.equal(s.split(a).length,2,'Expected one anchor: '+a);return s.replace(a,b);}
function build(dest){
 assert.ok(!fs.existsSync(dest),'Destination must not exist');
 const parent=fs.realpathSync(path.dirname(dest)),target=path.join(parent,path.basename(dest));
 assert.ok(!target.startsWith(root+path.sep)&&target!==root,'Use external staging directory');
 const bundle=fs.readFileSync(path.join(research,spec.file));
 assert.equal(bundle.length,spec.bytes);assert.equal(digest(bundle),spec.sha256);
 fs.cpSync(source,target,{recursive:true,errorOnExist:true,force:false});
 const sub=path.join(target,'semantic-v2');fs.mkdirSync(sub);
 const hostedName='atlas-semantic-bundle-v2-'+spec.sha256.slice(0,24)+'.json';
 assert.ok(!fs.existsSync(path.join(sub,hostedName)));
 for(const name of assets){
  let data=fs.readFileSync(path.join(research,name),'utf8');
  if(name==='atlas-semantic-manifest.js')data=replaceOnce(data,JSON.stringify(spec.file),JSON.stringify(hostedName));
  if(name==='atlas-search-worker.js')data=replaceOnce(data,"'../site/atlas-domain-embedding.js'","'../atlas-domain-embedding.js'");
  fs.writeFileSync(path.join(sub,name),data);
 }
 fs.writeFileSync(path.join(sub,hostedName),bundle);
 // Bind the shell revision to the candidate's actual runtime and weight bytes.
 const revision=digest(Buffer.concat([...assets,hostedName].map(name=>fs.readFileSync(path.join(sub,name))).concat([fs.readFileSync(path.join(target,'directory.js')),fs.readFileSync(path.join(target,'directory.html')),fs.readFileSync(path.join(target,'sw.js'))]))).slice(0,16);
 const htmlPath=path.join(target,'directory.html');
 let html=fs.readFileSync(htmlPath,'utf8');
 html=replaceOnce(html,'<script src="atlas-semantic-download.js?v=150" defer></script>',entries.map(n=>'<script src="semantic-v2/'+n+'?v=154-'+revision+'" defer></script>').join(''));
 for(const [name,v] of [['directory.js',152],['atlas-catalog-core.js',147],['atlas-expansion.js',126],['atlas-personalize.js',16],['atlas-personalize-ui.js',29]])html=replaceOnce(html,name+'?v='+v,name+'?v=154-'+revision);
 fs.writeFileSync(htmlPath,html);
 const swPath=path.join(target,'sw.js');let sw=fs.readFileSync(swPath,'utf8');
 sw=replaceOnce(sw,"'avenqir-v152-static-20261127-search-refinement'","'avenqir-v154-semantic-candidate-"+revision+"'");
 sw=replaceOnce(sw,"'./atlas-semantic-download.js'",assets.map(n=>"'./semantic-v2/"+n+"'").join(','));
 sw=replaceOnce(sw,"'atlas-semantic-download.js'",entries.map(n=>"'semantic-v2/"+n+"'").join(','));
 assert.ok(!sw.includes(spec.file)&&!sw.includes(hostedName),'Model must never be precached by shell');
 fs.writeFileSync(swPath,sw);
 // The candidate needs neither legacy downloader nor its weight payload.
 for(const name of ['atlas-semantic-download.js','atlas-semantic-model-v1.json'])fs.rmSync(path.join(target,name),{force:true});
 assert.ok(!html.includes('atlas-semantic-download.js'),'Old download script must not load');
 assert.ok(!html.includes('/research/'),'No research server path');
 assert.equal(digest(fs.readFileSync(path.join(sub,hostedName))),spec.sha256);
 const files=[...assets,hostedName].map(name=>{const data=fs.readFileSync(path.join(sub,name));return {name,bytes:data.length,sha256:digest(data)};});
 console.log('RELEASE_CANDIDATE_BUILD',JSON.stringify({path:target,candidateRevision:revision,modelBytes:bundle.length,hostedModelPath:'semantic-v2/'+hostedName,hostedModelSHA256:spec.sha256,scriptBytes:files.filter(f=>f.name.endsWith('.js')).reduce((n,f)=>n+f.bytes,0),files}));
 return target;
}
if(require.main===module){
 if(process.argv[2]==='--check'){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'avenqir-v154-'));
  try{build(path.join(temp,'site'));}finally{fs.rmSync(temp,{recursive:true,force:true});}
 }else if(process.argv[2]&&path.isAbsolute(process.argv[2]))build(process.argv[2]);
 else throw Error('Pass --check or an absolute new staging path');
}
module.exports={build};
