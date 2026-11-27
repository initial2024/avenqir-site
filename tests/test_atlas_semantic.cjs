"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const search=require('../site/atlas-search.js'),runtime=require('../site/atlas-domain-embedding.js');
const bytes=fs.readFileSync(require.resolve('../site/atlas-semantic-model-v1.json'));
assert.equal(bytes.length,runtime.SPEC.bytes);
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),runtime.SPEC.sha256);
const engine=runtime.create(JSON.parse(bytes));
const rank=(q,fields)=>search.rank(search.prepare(q),fields);
assert.ok(rank('githbu',['GitHub','https://github.com/','开发','代码'])>0);
assert.ok(rank('github',['GitHub','https://github.com/','开发','代码'])>rank('githbu',['GitHub','https://github.com/','开发','代码']));
assert.ok(rank('照片',['Photopea','','创作','图片编辑'])>0);
assert.ok(rank('ip address',['IP.FS.KG','','网络','公网IP查询'])>0);
assert.equal(rank('zzq-no-directory-match-7293',['Python','','开发','编程文档']),-1);
assert.equal(rank('ip',['zip archive','','文件','压缩包']),-1);
const items=[{url:'https://images.example/',name:'Photo editor',category:'图片',description:'在线图片编辑 照片尺寸转换'},{url:'https://papers.example/',name:'Research portal',category:'学术',description:'论文检索 文献'},{url:'https://network.example/',name:'Network speed',category:'网络',description:'网速测试'}];
assert.equal([...engine.rank('resize photographs',items).keys()][0],items[0].url);
assert.equal([...engine.rank('find scholarly publications',items).keys()][0],items[1].url);
assert.equal(engine.rank('qzxvjqzxvjqzxv',items).size,0);
assert.throws(()=>runtime.create({schema:'invalid'}));
const sw=fs.readFileSync(require.resolve('../site/sw.js'),'utf8');
assert.ok(!sw.includes('atlas-semantic-model-v1.json'),'large optional payload must not be precached');
console.log('PASS fuzzy spelling, synonyms, model hash, held-out domain retrieval, unknown intent and opt-in boundary');

// Regression on the actual, full public catalog (not only synthetic documents).
const path=require('node:path'),site=path.resolve(__dirname,'../site');
for(const file of ['atlas-paths','atlas-expansion','atlas-specialist','atlas-depth-a','atlas-depth-b','atlas-depth-c','atlas-depth-d','atlas-ai','atlas-regional','atlas-everyday','atlas-regional-ext','atlas-everyday-ext','atlas-popular-links'])require(path.join(site,file+'.js'));
const catalog=require(path.join(site,'atlas-catalog-core.js')).catalog();
assert.ok(catalog.length>=1338);
const byURL=new Map(catalog.map(x=>[x.url,x]));
const cases=[
 ['把多个PDF合成一个',/iLovePDF|PDF24|Acrobat/i,/查看器|Gaia Archive/i],
 ['查公网出口地址',/IP\.FS\.KG|IPinfo|IP\.SB|Net\.Coffee/i,/ASEAN IP Portal/i],
 ['网络延时怎么测',/Cloudflare Speed Test|Speedtest|FAST\.com/i,/IETF|ARIN/i],
 ['找学术研究的原始资料',/Google Scholar|DOAJ|PubMed|BASE|ScienceOpen/i,/Memorial Hall/i],
 ['做一份课堂汇报',/PowerPoint|Slidesgo|SlidesCarnival/i,/ScamShield|Derivative Calculator/i],
 ['把英文文章译成中文',/DeepL|Reverso/i,/Dictionary|HeyGen/i],
 ['我想找个网页托管平台',/Vercel Docs/i,/Hugging Face|Codeberg/i],
 ['resize photographs',/Adobe Express 调整图片大小/i,/FINN\.no|NASA Image Library/i],
 ['remove background from a photo',/Adobe Firefly 去背景/i,/FINN\.no|NASA Image Library/i],
 ['find scholarly publications',/Google Scholar|DOAJ|PubMed|BASE|ScienceOpen/i,/Memorial Hall/i],
 ['make a slide deck',/PowerPoint|Slidesgo|SlidesCarnival/i,/ScamShield|Derivative Calculator/i],
 ['convert currency',/XE 货币换算/i,/Bank of England|World Economic Forum/i],
 ['写真の背景を消したい',/Adobe Firefly 去背景/i,/FINN\.no|NASA Image Library/i],
 ['論文を探す',/Google Scholar|DOAJ|PubMed|BASE|ScienceOpen/i,/Memorial Hall/i]
];
let hit=0;for(const [query,expected,wrong] of cases){
 const names=[...engine.rank(query,catalog).keys()].map(u=>byURL.get(u)?.name||'');
 console.log('CATALOG_EVAL',JSON.stringify({query,top5:names.slice(0,5)}));
 assert.ok(names.slice(0,5).some(n=>expected.test(n)),query+' missed grounded resource');
 assert.ok(!names.some(n=>wrong.test(n)),query+' misleading result');
 hit++;
}
for(const q of ['xyzqvjjunk7293','banana refrigerator repair','不要推荐AI聊天','without login AI chat','免费且无广告的PDF工具','把几张照片拼在一起']){
 assert.equal(engine.rank(q,catalog).size,0,q+' must abstain from unsupported intent or constraint');
}
console.log('CATALOG_EVAL_PASS',hit+'/'+cases.length,'targeted top-five intent cases; 6 abstentions');
