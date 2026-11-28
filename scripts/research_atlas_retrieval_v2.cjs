"use strict";
// Research-only retrieval; not referenced by any production page.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const site=path.resolve(__dirname,"../site");
for(const n of ["atlas-paths","atlas-expansion","atlas-specialist","atlas-depth-a","atlas-depth-b","atlas-depth-c","atlas-depth-d","atlas-ai","atlas-regional","atlas-everyday","atlas-regional-ext","atlas-everyday-ext","atlas-popular-links"])require(path.join(site,n+".js"));
const catalog=require(path.join(site,"atlas-catalog-core.js")).catalog();
const runtime=require(path.join(site,"atlas-domain-embedding.js"));
const base=JSON.parse(fs.readFileSync(path.join(site,runtime.SPEC.file),"utf8"));
const model=JSON.parse(fs.readFileSync(path.join(__dirname,"../research/atlas-model-v2.json"),"utf8"));
const baseline=runtime.create(base);
const {candidate}=require("../research/atlas-retrieval-runtime.js");
const positive=[
 ['PDF文件在哪里预览',/PDF\.js/i],
 ['想把照片压缩小一点',/Squoosh|Adobe Express.*压缩/i],
 ['查询域名的MX记录',/Nslookup\.io|Google Public DNS/i],
 ['DNS propagation worldwide check',/DNSChecker/i],
 ['查询域名注册商',/ICANN Lookup/i],
 ['检查HTTPS证书配置',/SSL Labs/i],
 ['检测恶意链接',/VirusTotal|Google Safe Browsing/i],
 ['检查WebRTC是否泄漏',/BrowserLeaks/i],
 ['查看公网IP地址',/IPinfo|IP\.SB|IP\.FS\.KG/i],
 ['测一下网速',/Speedtest|FAST\.com|Cloudflare Speed Test/i],
 ['跨时区安排一次会议',/World Time Buddy/i],
 ['网页倒计时工具',/Online Stopwatch/i],
 ['把链接变成二维码',/QRCode Monkey/i],
 ['调试正则表达式匹配',/regex101|RegExr/i],
 ['JSON树形编辑',/JSON Editor Online/i],
 ['练习盲打',/TypingClub|Monkeytype/i],
 ['挑选海报配色',/Adobe Color|Color Hunt/i],
 ['标题正文的字体组合',/Fontjoy/i],
 ['绘制业务流程图',/Excalidraw|Mermaid Live|diagrams\.net/i],
 ['找公版电子书',/Project Gutenberg|Standard Ebooks|Global Grey/i],
 ['生成参考文献格式',/ZoteroBib/i],
 ['根据DOI查文献',/Crossref Metadata Search|Crossref Simple Text Query/i],
 ['检查HTML语法',/W3C HTML Validator/i],
 ['CSS语法验证',/W3C CSS Validator/i],
 ['检查网页加载性能',/PageSpeed Insights|WebPageTest/i],
 ['进行货币换算',/XE 货币换算/i],
 ['翻译一段文本',/DeepL|Reverso/i],
 ['查询单词释义',/Cambridge Dictionary|Collins Dictionary|Dictionary\.com/i]
];
const negative=['qzxvjjunk7293','banana refrigerator repair','修理洗衣机轴承','自行车轮胎打气','make dinner with potatoes','火星天气预报','找免费且无广告的PDF工具','without login AI chat','offline pdf compressor no upload','二维码生成 免费','DNS检查且不要广告','create qr code no registration','QRコード 広告なし','公版电子书 不上传','图片压缩并制作二维码','网页倒计时和流程图','pdf merge and pdf split','check DNS propagation and generate QR code'];
function evaluateRetrieval(catalog,model,features,baseline){
 const byURL=new Map(catalog.map(x=>[x.url,x.name]));
 const report={catalog:catalog.length,positive:positive.length,negative:negative.length,baselineTop1:0,baselineTop5:0,candidateTop1:0,candidateTop5:0,baselineNegativeHits:0,candidateNegativeHits:0,misses:[],negativeLeaks:[],perQuery:[]};
 for(const [q,expected] of positive){
  if(!catalog.some(x=>expected.test(x.name)))throw Error('fixture missing '+q);
  const a=[...baseline.rank(q,catalog).keys()].map(u=>byURL.get(u)),b=candidate(q,catalog,model,features,baseline).map(u=>byURL.get(u));
  report.baselineTop1+=Number(expected.test(a[0]||''));report.baselineTop5+=Number(a.slice(0,5).some(n=>expected.test(n)));report.candidateTop1+=Number(expected.test(b[0]||''));report.candidateTop5+=Number(b.slice(0,5).some(n=>expected.test(n)));
  if(!b.slice(0,5).some(n=>expected.test(n)))report.misses.push({q,baseline:a.slice(0,5),candidate:b.slice(0,5)});
  report.perQuery.push({q,baseline:a.slice(0,5),candidate:b.slice(0,5)});
 }
 for(const q of negative){const a=baseline.rank(q,catalog),b=candidate(q,catalog,model,features,baseline);report.baselineNegativeHits+=Number(a.size>0);report.candidateNegativeHits+=Number(b.length>0);if(b.length)report.negativeLeaks.push({q,results:b.map(u=>byURL.get(u))});}
 return report;
}

assert.ok(catalog.length>=1338);
const report=evaluateRetrieval(catalog,model,runtime.features,baseline);
console.log(JSON.stringify(report,null,2));
// No release gate yet: record misses instead of hiding them. Hard constraints remain mandatory.
for(const q of negative.filter(q=>/(?:不要|排除|免费|無廣告|免費|无广告|离线|不上传|免注册|without|offline|no ads|no registration|広告なし|sin registro|sans connexion|ohne Anmeldung|local-only)/i.test(q)))assert.equal(candidate(q,catalog,model,runtime.features,baseline).length,0,q);
assert.equal(candidate("create qr code",[],model,runtime.features,baseline).length,0);

const multilingualStress=[
  [
    "PDF をオンラインで閲覧する",
    "PDF\\.js",
    "i"
  ],
  [
    "preview a PDF before printing",
    "PDF\\.js",
    "i"
  ],
  [
    "compress a JPEG image",
    "Squoosh|Adobe Express.*压缩",
    "i"
  ],
  [
    "画像ファイルを圧縮したい",
    "Squoosh|Adobe Express.*压缩",
    "i"
  ],
  [
    "lookup DNS TXT records",
    "Nslookup\\.io|Google Public DNS",
    "i"
  ],
  [
    "DNSレコードを確認したい",
    "Nslookup\\.io|Google Public DNS",
    "i"
  ],
  [
    "check DNS propagation globally",
    "DNSChecker",
    "i"
  ],
  [
    "DNS伝播の状況を確認",
    "DNSChecker",
    "i"
  ],
  [
    "find a domain registrar",
    "ICANN Lookup",
    "i"
  ],
  [
    "ドメインの登録者を調べる",
    "ICANN Lookup",
    "i"
  ],
  [
    "inspect a TLS certificate",
    "SSL Labs",
    "i"
  ],
  [
    "SSL証明書を検査",
    "SSL Labs",
    "i"
  ],
  [
    "check if a URL is malicious",
    "VirusTotal|Google Safe Browsing",
    "i"
  ],
  [
    "フィッシングサイトを調べる",
    "VirusTotal|Google Safe Browsing",
    "i"
  ],
  [
    "test WebRTC leaks",
    "BrowserLeaks",
    "i"
  ],
  [
    "WebRTCの漏洩を検査",
    "BrowserLeaks",
    "i"
  ],
  [
    "find my public IP",
    "IPinfo|IP\\.SB|IP\\.FS\\.KG",
    "i"
  ],
  [
    "グローバルIPアドレスを確認",
    "IPinfo|IP\\.SB|IP\\.FS\\.KG",
    "i"
  ],
  [
    "test my internet speed",
    "Speedtest|FAST\\.com|Cloudflare Speed Test",
    "i"
  ],
  [
    "ネット回線速度を測定",
    "Speedtest|FAST\\.com|Cloudflare Speed Test",
    "i"
  ],
  [
    "find overlapping meeting time zones",
    "World Time Buddy",
    "i"
  ],
  [
    "時差のある国で会議を調整",
    "World Time Buddy",
    "i"
  ],
  [
    "start a countdown timer",
    "Online Stopwatch",
    "i"
  ],
  [
    "カウントダウンタイマーを使う",
    "Online Stopwatch",
    "i"
  ],
  [
    "turn a public link into a QR code",
    "QRCode Monkey",
    "i"
  ],
  [
    "URLをQRコードに変換",
    "QRCode Monkey",
    "i"
  ],
  [
    "test a regular expression",
    "regex101|RegExr",
    "i"
  ],
  [
    "正規表現をテスト",
    "regex101|RegExr",
    "i"
  ],
  [
    "edit a nested JSON tree",
    "JSON Editor Online",
    "i"
  ],
  [
    "JSONをツリー形式で編集",
    "JSON Editor Online",
    "i"
  ],
  [
    "practice touch typing",
    "TypingClub|Monkeytype",
    "i"
  ],
  [
    "タイピングの練習をする",
    "TypingClub|Monkeytype",
    "i"
  ],
  [
    "choose a colour palette",
    "Adobe Color|Color Hunt",
    "i"
  ],
  [
    "ポスターの配色を決める",
    "Adobe Color|Color Hunt",
    "i"
  ],
  [
    "pair heading and body fonts",
    "Fontjoy",
    "i"
  ],
  [
    "見出しと本文のフォントを組み合わせる",
    "Fontjoy",
    "i"
  ],
  [
    "create a flow chart",
    "Excalidraw|Mermaid Live|diagrams\\.net",
    "i"
  ],
  [
    "フローチャートを作る",
    "Excalidraw|Mermaid Live|diagrams\\.net",
    "i"
  ],
  [
    "read public domain ebooks",
    "Project Gutenberg|Standard Ebooks|Global Grey",
    "i"
  ],
  [
    "著作権切れの本を読む",
    "Project Gutenberg|Standard Ebooks|Global Grey",
    "i"
  ],
  [
    "generate a bibliography",
    "ZoteroBib",
    "i"
  ],
  [
    "参考文献の書式を作成",
    "ZoteroBib",
    "i"
  ],
  [
    "find a paper by DOI",
    "Crossref Metadata Search|Crossref Simple Text Query",
    "i"
  ],
  [
    "DOIから論文を検索",
    "Crossref Metadata Search|Crossref Simple Text Query",
    "i"
  ],
  [
    "validate HTML markup",
    "W3C HTML Validator",
    "i"
  ],
  [
    "HTMLの構文を検証",
    "W3C HTML Validator",
    "i"
  ],
  [
    "validate CSS syntax",
    "W3C CSS Validator",
    "i"
  ],
  [
    "CSSの構文を検証",
    "W3C CSS Validator",
    "i"
  ],
  [
    "measure page loading performance",
    "PageSpeed Insights|WebPageTest",
    "i"
  ],
  [
    "ページの読み込み性能を測定",
    "PageSpeed Insights|WebPageTest",
    "i"
  ],
  [
    "convert between currencies",
    "XE 货币换算",
    "i"
  ],
  [
    "通貨を換算する",
    "XE 货币换算",
    "i"
  ],
  [
    "translate a paragraph",
    "DeepL|Reverso",
    "i"
  ],
  [
    "文章を翻訳したい",
    "DeepL|Reverso",
    "i"
  ],
  [
    "look up word meaning",
    "Cambridge Dictionary|Collins Dictionary|Dictionary\\.com",
    "i"
  ],
  [
    "辞書で単語の意味を調べる",
    "Cambridge Dictionary|Collins Dictionary|Dictionary\\.com",
    "i"
  ]
].map(([q,src,flags])=>[q,new RegExp(src,flags)]);
const difficultNegatives=[
  "QR code scanner",
  "decode QR code from photo",
  "二维码识别",
  "扫描二维码",
  "how does QR code work",
  "正则表达式是什么",
  "regex tutorial",
  "how does DNS work",
  "DNS record format documentation",
  "PDF password recovery",
  "find PDF on a specific website",
  "buy a printer",
  "typing in Python",
  "Python typing annotations",
  "JSON schema specification",
  "HTML tutorial",
  "what is CSS",
  "CSS grid tutorial",
  "currency trading signals",
  "股票怎么买",
  "browser fingerprint definition",
  "WebRTC API documentation",
  "generate QR code and compress image",
  "countdown timer and regex tester",
  "看电影和查询域名",
  "二维码和流程图",
  "DNS lookup and QR code",
  "buy shoes online",
  "天气查询",
  "machine repair service",
  "今日体育比赛",
  "who won the football game",
  "修复电饭煲",
  "read restaurant reviews",
  "翻译软件且不要上传内容",
  "图像压缩永久免费",
  "font pairing without registration",
  "word dictionary no ads",
  "タイマー 無料",
  "DNS オフライン",
  "QR code sin publicidad",
  "regex sans inscription",
  "QR code ohne Anmeldung"
];
const constraintSuffixes=[
  " 免费",
  " 无广告",
  " 不上传",
  " 免注册",
  " 离线",
  " without login",
  " no ads",
  " offline",
  " 免費",
  " 広告なし",
  " sin registro",
  " sans connexion",
  " ohne Anmeldung",
  " local-only",
  " without upload"
];
const padded=positive.flatMap(([q,re])=>[[`请问${q}`,re],[`我想${q}，有什么工具`,re],[`  ${q}  `,re]]);
const generated=positive.flatMap(([q])=>constraintSuffixes.map(s=>q+s));
function evaluateStress(catalog,model,features,baseline){
 const by=new Map(catalog.map(x=>[x.url,x.name]));
 const positives=positive.concat(multilingualStress,padded);
 const negatives=[...new Set(negative.concat(difficultNegatives,generated))];
 const report={positive:positives.length,negative:negatives.length,generatedConstraint:generated.length,top1:0,top5:0,negativeHits:0,misses:[],negativeLeaks:[]};
 for(const [q,re] of positives){const n=candidate(q,catalog,model,features,baseline).map(u=>by.get(u));report.top1+=Number(re.test(n[0]||''));report.top5+=Number(n.slice(0,5).some(x=>re.test(x)));if(!n.slice(0,5).some(x=>re.test(x)))report.misses.push(q);}
 for(const q of negatives){const n=candidate(q,catalog,model,features,baseline);if(n.length){report.negativeHits++;report.negativeLeaks.push({q,results:n.slice(0,2).map(u=>by.get(u))});}}
 return report;
}
console.log('STRESS_REPORT',JSON.stringify(evaluateStress(catalog,model,runtime.features,baseline),null,2));



const multilingual=require('../research/atlas-multilingual-intents.js');
const expected=[/QRCode Monkey/i,/regex101|RegExr/i,/Excalidraw|Mermaid Live|diagrams\.net/i,/Online Stopwatch/i,/Squoosh|Adobe Express.*压缩/i,/Nslookup\.io|Google Public DNS/i,/SSL Labs/i,/ICANN Lookup/i,/IPinfo|IP\.SB|IP\.FS\.KG/i,/Speedtest|FAST\.com|Cloudflare Speed Test/i,/JSON Editor Online/i,/W3C HTML Validator/i,/W3C CSS Validator/i,/ZoteroBib/i,/Crossref Metadata Search|Crossref Simple Text Query/i,/DeepL|Reverso/i,/Cambridge Dictionary|Collins Dictionary|Dictionary\.com/i];
expected.push(/PDF\.js/i,/DNSChecker/i,/VirusTotal|Google Safe Browsing/i,/BrowserLeaks/i,/World Time Buddy/i,/TypingClub|Monkeytype/i,/Adobe Color|Color Hunt/i,/Fontjoy/i,/Project Gutenberg|Standard Ebooks|Global Grey/i,/PageSpeed Insights|WebPageTest/i,/XE 货币换算/i);
expected.push(/Adobe Acrobat PDF 合并/i,/Smallpdf/i,/Adobe Acrobat PDF 拆分/i,/Adobe Express 调整图片大小/i,/Adobe Firefly 去背景/i,/Adobe Express 照片拼贴/i,/EFF Cover Your Tracks/i,/GitHub Pages/i);
const byURL=new Map(catalog.map(x=>[x.url,x.name]));
let n=0,top1=0,top5=0,constraintReject=0,grounded=0,unsupported=0;
for(const [locale,...phrases] of multilingual.rows)for(const [i,q] of phrases.entries()){
 n++;const names=candidate(q,catalog,model,runtime.features,baseline).map(u=>byURL.get(u));
 if(expected[i]){grounded++;top1+=Number(expected[i].test(names[0]||''));top5+=Number(names.slice(0,5).some(x=>expected[i].test(x)));assert.ok(names.slice(0,5).some(x=>expected[i].test(x)),locale+' '+q);}
 else{unsupported++;assert.equal(names.length,0,locale+' ungrounded '+q);}
 for(const suffix of multilingual.localeConstraints.find(x=>x[0]===locale).slice(1)){
  const blocked=candidate(q+' '+suffix,catalog,model,runtime.features,baseline);
  assert.equal(blocked.length,0,locale+' '+q+' '+suffix);constraintReject+=Number(!blocked.length);
 }
}
assert.equal(multilingual.locales.length,40);assert.equal(n,1440);assert.equal(grounded,1440);assert.equal(unsupported,0);assert.equal(top5,grounded);assert.equal(constraintReject,7200);
console.log('MULTILINGUAL_REPORT',JSON.stringify({locales:multilingual.locales.length,n,grounded,unsupported,top1,top5,constraintReject}));

const {createSession}=require('../research/atlas-retrieval-runtime.js');
const session=createSession(catalog,model,runtime.features,runtime.create(base));
const t0=performance.now();
let comparisons=0;
for(const row of multilingual.rows)for(const q of row.slice(1)){
 assert.deepEqual(session.rank(q),candidate(q,catalog,model,runtime.features,baseline),q);
 comparisons++;
}
const initial=session.stats();
assert.equal(initial.cachedIntents,36);
assert.equal(initial.computed,36);
assert.equal(initial.hits,1404);
for(const q of negative)assert.deepEqual(session.rank(q),candidate(q,catalog,model,runtime.features,baseline),q);
const warm=performance.now();
for(const row of multilingual.rows)for(const q of row.slice(1))session.rank(q);
const elapsed=performance.now()-warm;
const end=session.stats();
assert.equal(end.featureCalls,initial.featureCalls);
assert.equal(end.computed,36);
console.log('SESSION_CACHE_REPORT',JSON.stringify({comparisons,initial,end,comparisonMs:warm-t0,warmMs:elapsed}));

const topics=require('../research/atlas-multilingual-topics.js');
const broadSession=createSession(catalog,model,runtime.features,runtime.create(base));
let broadCount=0,broadAnswered=0,broadRefused=0;
for(const [locale,...phrases] of topics.rows)for(const q of phrases){
 const hits=broadSession.rank(q);
 assert.deepEqual(hits,candidate(q,catalog,model,runtime.features,baseline),locale+' '+q);
 broadCount++;if(hits.length)broadAnswered++;
 for(const c of multilingual.localeConstraints.find(x=>x[0]===locale).slice(1)){
  assert.equal(broadSession.rank(q+' '+c).length,0,locale+' '+q+' '+c);broadRefused++;
 }
}
assert.equal(broadCount,1120);assert.equal(broadRefused,5600);
console.log('BROAD_TOPIC_REPORT',JSON.stringify({broadCount,broadAnswered,broadRefused}));

const wrappedSession=createSession(catalog,model,runtime.features,runtime.create(base));
let wrappedCount=0,wrappedConstraints=0;
for(let i=0;i<topics.frames.length;i++){
 const [locale,prefix,suffix]=topics.frames[i];
 assert.equal(locale,multilingual.rows[i][0]);
 for(const q of topics.rows[i].slice(1).concat(multilingual.rows[i].slice(1))){
  const wrapped=prefix+q+suffix;
  assert.deepEqual(wrappedSession.rank(wrapped),wrappedSession.rank(q),locale+' '+wrapped);
  wrappedCount++;
  const c=multilingual.localeConstraints[i][1];
  assert.equal(wrappedSession.rank(prefix+q+' '+c+suffix).length,0,locale+' constraint '+wrapped);
  wrappedConstraints++;
 }
}
assert.equal(wrappedCount,2560);assert.equal(wrappedConstraints,2560);
console.log('POLITE_FRAME_REPORT',JSON.stringify({wrappedCount,wrappedConstraints}));

const codec=require('../research/atlas-model-codec.js'),unicodeRuntime=require('../research/atlas-unicode-runtime.js');
const fullBundle=require('../research/atlas-semantic-bundle-v2.json');
assert.deepEqual(codec.deserialize(JSON.stringify(fullBundle.domain)),model);
const unicode=unicodeRuntime.create(codec.deserialize(JSON.stringify(fullBundle.unicode)),model.classes.map(x=>x[0]));
const fused=createSession(catalog,model,runtime.features,runtime.create(base),unicode);
let fusedGrounded=0,fusedTop1=0,fusedTop5=0,fusedRefused=0,broadPreserved=0;
for(let i=0;i<multilingual.rows.length;i++){
 const [locale,...phrases]=multilingual.rows[i];
 for(let j=0;j<phrases.length;j++){
  const q=phrases[j],hits=fused.rank(q),names=hits.map(u=>byURL.get(u));
  if(expected[j]){fusedGrounded++;fusedTop1+=Number(expected[j].test(names[0]||''));fusedTop5+=Number(names.slice(0,5).some(x=>expected[j].test(x)));}else assert.equal(hits.length,0,q);
  for(const c of multilingual.localeConstraints[i].slice(1)){assert.equal(fused.rank(q+' '+c).length,0,q+' '+c);fusedRefused++;}
 }
 for(const q of topics.rows[i].slice(1)){
  assert.deepEqual(fused.rank(q).slice(0,5),broadSession.rank(q).slice(0,5),locale+' '+q);broadPreserved++;
  for(const c of multilingual.localeConstraints[i].slice(1)){assert.equal(fused.rank(q+' '+c).length,0,q+' '+c);fusedRefused++;}
 }
}
for(const [q,re] of positive.concat(multilingualStress,padded))assert.ok(fused.rank(q).slice(0,5).some(u=>re.test(byURL.get(u))),q);
for(const q of [...new Set(negative.concat(difficultNegatives,generated))])assert.equal(fused.rank(q).length,0,q);
assert.equal(fusedGrounded,1440);assert.ok(fusedTop1>=1400);assert.equal(fusedTop5,1440);assert.equal(broadPreserved,1120);assert.equal(fusedRefused,12800);
console.log('FUSED_RETRIEVAL_REPORT',JSON.stringify({fusedGrounded,fusedTop1,fusedTop5,broadPreserved,fusedRefused}));

let nativeNegations=0,nativeCompound=0;
for(let i=0;i<multilingual.negativeFrames.length;i++){
 const [locale,prefix,suffix,join]=multilingual.negativeFrames[i],phrases=topics.rows[i].slice(1).concat(multilingual.rows[i].slice(1));
 for(const q of phrases){assert.equal(fused.rank(prefix+q+suffix).length,0,locale+' negative '+q);nativeNegations++;}
 for(let j=0;j<multilingual.tasks.length;j++){
  const q=multilingual.rows[i][j+1]+join+multilingual.rows[i][(j+1)%multilingual.tasks.length+1];
  assert.equal(fused.rank(q).length,0,locale+' compound '+q);nativeCompound++;
 }
}
assert.equal(nativeNegations,2560);assert.equal(nativeCompound,1440);
console.log('NATIVE_NEGATION_COMPOUND_REPORT',JSON.stringify({nativeNegations,nativeCompound}));

const augmentation=require('../research/atlas-paraphrase-augmentation.cjs');
assert.deepEqual(multilingual.variantRows,augmentation.rows);
assert.deepEqual(multilingual.variantTasks,augmentation.tasks);
let variantHits=0,variantRefusals=0,variantWrapped=0,variantCompounds=0;
for(let i=0;i<augmentation.rows.length;i++){
 const [locale,...phrases]=augmentation.rows[i], [,prefix,suffix,join]=multilingual.negativeFrames[i], [,please,after]=topics.frames[i];
 for(let j=0;j<phrases.length;j++){
  const q=phrases[j],id=augmentation.tasks[j];if(!q)continue;
  assert.equal(multilingual.resolve(q).id,id);
  const canonical=multilingual.rows[i][multilingual.tasks.indexOf(id)+1],hits=fused.rank(q);
  assert.ok(hits.length,locale+' '+q);
  assert.deepEqual(hits,fused.rank(canonical),locale+' '+q);variantHits++;
  assert.deepEqual(fused.rank(please+q+after),hits);variantWrapped++;
  for(const c of multilingual.localeConstraints[i].slice(1)){assert.equal(fused.rank(q+' '+c).length,0,locale+' '+q+' '+c);variantRefusals++;}
  assert.equal(fused.rank(prefix+q+suffix).length,0);variantRefusals++;
  assert.equal(fused.rank(q+join+phrases[(j+1)%phrases.length]).length,0);variantCompounds++;
  assert.equal(fused.rank(q+' zq-unverified-extra').length,0);variantRefusals++;
 }
}
assert.equal(variantHits,120);assert.equal(variantRefusals,840);assert.equal(variantWrapped,120);assert.equal(variantCompounds,120);
console.log('REVIEWED_VARIANT_REPORT',JSON.stringify({variantHits,variantRefusals,variantWrapped,variantCompounds}));

let requestMatches=0,requestRefusals=0;
for(let i=0;i<topics.requestFrames.length;i++){
 const [locale,prefix,suffix]=topics.requestFrames[i];
 assert.equal(locale,multilingual.locales[i]);
 for(const q of [...topics.rows[i].slice(1),...multilingual.rows[i].slice(1),...multilingual.variantRows[i].slice(1)]){
  const wrapped=prefix+q+suffix;
  assert.deepEqual(fused.rank(wrapped),fused.rank(q),locale+' '+wrapped);requestMatches++;
  for(const c of multilingual.localeConstraints[i].slice(1)){assert.equal(fused.rank(prefix+q+' '+c+suffix).length,0,locale+' constrained '+wrapped);requestRefusals++;}
 }
}
assert.equal(requestMatches,2680);assert.equal(requestRefusals,13400);
console.log('REQUEST_FRAME_REPORT',JSON.stringify({requestMatches,requestRefusals}));

let mixedHits=0,mixedRefused=0,mixedWrapped=0;
for(const [id,phrases] of multilingual.mixedAliases){
 const canonical=multilingual.rows[0][multilingual.tasks.indexOf(id)+1],expected=fused.rank(canonical);
 assert.ok(expected.length,id);
 for(const q of phrases){
  assert.equal(multilingual.resolve(q).id,id,q);
  assert.deepEqual(fused.rank(q),expected,q);mixedHits++;
  assert.deepEqual(fused.rank('please '+q),expected,q);mixedWrapped++;
  for(const bad of [q+' without upload',q+' 不上传',q+' 무료', 'do not recommend '+q,q+' and '+multilingual.rows[0][multilingual.tasks.indexOf(id==='timer'?'qr-create':'timer')+1],q+' zq-unverified-extra']){
   assert.equal(fused.rank(bad).length,0,bad);mixedRefused++;
  }
 }
}
assert.equal(mixedHits,48);assert.equal(mixedWrapped,48);assert.equal(mixedRefused,288);
console.log('REVIEWED_MIXED_ALIAS_REPORT',JSON.stringify({mixedHits,mixedWrapped,mixedRefused,releaseScope:'exact reviewed expressions only'}));
