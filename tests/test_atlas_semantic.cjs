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
 ['查公网出口地址',/IP\.FS\.KG|IPinfo|IP\.SB|Net\.Coffee/i,/ASEAN IP Portal|^IANA$/i],
 ['网络延时怎么测',/Cloudflare Speed Test|Speedtest|FAST\.com/i,/IETF|ARIN/i],
 ['找学术研究的原始资料',/Google Scholar|DOAJ|PubMed|BASE|ScienceOpen/i,/Memorial Hall/i],
 ['做一份课堂汇报',/PowerPoint|Slidesgo|SlidesCarnival/i,/ScamShield|Derivative Calculator/i],
 ['把英文文章译成中文',/DeepL|Reverso/i,/Dictionary|HeyGen/i],
 ['查网站部署文档',/Vercel Docs/i,/Hugging Face|Codeberg/i],
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
for(const q of ['xyzqvjjunk7293','banana refrigerator repair','不要推荐AI聊天','without login AI chat','免费且无广告的PDF工具','把几张照片拼在一起','我想找个网页托管平台']){
 assert.equal(engine.rank(q,catalog).size,0,q+' must abstain from unsupported intent or constraint');
}
console.log('CATALOG_EVAL_PASS',hit+'/'+cases.length,'targeted top-five intent cases; 7 abstentions');

assert.deepEqual(search.prepare('online color palette').terms,['online','color palette']);
assert.equal(search.analyze(search.prepare('githbu'),['GitHub','https://github.com/','','']).kind,'fuzzy');
assert.equal(search.analyze(search.prepare('photo'),['图片编辑','','','']).kind,'synonym');
assert.equal(search.analyze(search.prepare('github'),['GitHub','','','']).kind,'exact');
const extended=[
 ['制作一个链接二维码',/QRCode Monkey/i],
 ['检查域名解析有没有生效',/DNSChecker|Nslookup\.io/i],
 ['安排跨时区的会议',/World Time Buddy/i],
 ['test a regular expression',/regex101|RegExr/i],
 ['练习盲打提高打字速度',/TypingClub|Monkeytype/i],
 ['给海报找配色方案',/Adobe Color/i],
 ['搭配标题和正文的字体',/Fontjoy/i],
 ['检查WebRTC泄漏',/BrowserLeaks|IP Tools/i],
 ['public domain books',/Project Gutenberg|Standard Ebooks|ManyBooks|Global Grey/i],
 ['draw a flowchart',/Excalidraw|Mermaid Live|diagrams\.net/i],
 ['编辑JSON树形数据',/JSON Editor Online/i]
];
for(const [q,expected] of extended){
 const names=[...engine.rank(q,catalog).keys()].map(u=>byURL.get(u)?.name||'');
 console.log('EXTENDED_EVAL',JSON.stringify({q,names}));
 assert.ok(names.slice(0,5).some(n=>expected.test(n)),q+' missed grounded resource');
}
assert.ok(![...engine.rank('练习盲打提高打字速度',catalog).keys()].some(u=>/Python Typing/.test(byURL.get(u)?.name||'')));
assert.equal(engine.rank('公版电子书且免费无广告',catalog).size,0);
console.log('EXTENDED_EVAL_PASS',extended.length+'/'+extended.length);


// Order-independent retrieval and unsupported-constraint regression.
const qrFixture={url:'https://qr.example/',name:'QRCode Monkey',description:'qr code generator',category:'tools'};
const noiseFixtures=Array.from({length:2600},(_,i)=>({url:'https://noise'+i+'.example/',name:'Unrelated',description:'unrelated',category:'other'}));
const tailRank=engine.rank('create qr code',[...noiseFixtures,qrFixture]);
assert.ok(tailRank.has(qrFixture.url),'catalog entries beyond old scan limit must be searchable');
assert.deepEqual([...tailRank],[...engine.rank('create qr code',[qrFixture,...noiseFixtures])]);
assert.equal(engine.rank('create qr code',Array(16).fill(qrFixture)).size,1);
for(const q of ['制作二维码且离线','create qr code offline','create qr code no upload','QRコードを作る 広告なし','create qr code sin registro','create qr code sans publicité','create qr code ohne Anmeldung','create qr code '+'x'.repeat(513)])assert.equal(engine.rank(q,[qrFixture]).size,0,q);
const mutableFixture={...qrFixture};
engine.rank('create qr code',[mutableFixture]);
mutableFixture.description='qr code generator public health medical medicine';
mutableFixture.category='health';
assert.deepEqual([...engine.rank('create qr code',[mutableFixture])],[...engine.rank('create qr code',[{...mutableFixture}])]);
console.log('RETRIEVAL_HARDENING_PASS');
