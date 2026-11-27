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
function classify(model,features,text){
 const f=features(text);return model.classes.map(([id,weights])=>{let score=0;for(const [k,w] of weights)score+=(f.get(k)||0)*w/4096;return {id,score};}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}

// Evidence rules are anchored to catalog metadata, not claims of current service availability.
const rules=[
 ['pdf-merge',/pdf.{0,24}(?:合并|拼接|合成|merge|join|combine)|(?:合并|拼接|合成|merge|join|combine).{0,25}pdf/i,/(?:合并|拼接|merge|combine).{0,12}pdf|pdf.{0,12}(?:合并|拼接|merge|combine)/i],
 ['pdf-compress',/pdf.{0,24}(?:压缩|变小|减小|compress|shrink)|(?:压缩|compress|shrink).{0,24}pdf/i,/(?:pdf.{0,15}(?:压缩|compress)|(?:压缩|compress).{0,12}pdf)/i],
 ['pdf-split',/pdf.{0,24}(?:拆分|拆成|分割|导出|split|extract)|(?:split|extract|拆分).{0,24}pdf/i,/(?:pdf.{0,15}(?:拆分|分割|split)|(?:拆分|分割|split).{0,12}pdf)/i],
 ['pdf-view',/pdf.{0,24}(?:阅读|打开|预览|view|read)|(?:阅读|打开|预览|view|read|preview).{0,24}pdf/i,/(?:pdf.{0,15}(?:查看|阅读|打开|viewer)|(?:查看|阅读|打开|view).{0,18}pdf)/i],
 ['image-resize',/(?:照片|图片|图像|image|photo|picture).{0,20}(?:尺寸|宽高|像素|resize|dimensions)|(?:调整|resize|dimensions).{0,20}(?:照片|图片|image|photo|picture)/i,/(?:调整图片大小|图片.{0,10}(?:尺寸|大小)|resize.{0,15}(?:image|photo))/i],
 ['image-background',/(?:抠图|去背景|背景.{0,10}(?:删除|去除|去掉)|(?:remove|erase).{0,20}background|background removal|透明底)/i,/(?:抠图|去背景|去除.{0,8}背景|background remover|remove.{0,12}background)/i],
 ['image-compress',/(?:照片|图片|图像|jpeg|png|image|photo|picture).{0,25}(?:压缩|减小|变小|compress|shrink)|(?:压缩|compress|shrink).{0,25}(?:照片|图片|jpeg|png|image|photo|picture)/i,/(?:图片.{0,16}压缩|图像.{0,16}压缩|image.{0,12}compress|compress.{0,12}image)/i],
 ['image-collage',/(?:照片|图片|图像|photo|picture|image).{0,20}(?:拼接|拼图|拼成|collage)|(?:collage|拼接).{0,20}(?:照片|图片|photo|picture)/i,/(?:图片.{0,12}(?:拼接|拼贴)|照片.{0,12}(?:拼接|拼贴)|photo collage|image collage)/i],
 ['dns-lookup',/(?:dns.{0,24}(?:record|lookup|查询|记录)|(?:域名|dns).{0,18}(?:mx|txt|记录)|(?:lookup|query).{0,12}dns)/i,/(?:dns.{0,12}(?:解析|lookup|查询|诊断)|nslookup\.io)/i],
 ['dns-propagation',/(?:dns.{0,30}(?:propagation|propagate|传播|生效)|域名.{0,24}(?:全球|生效|传播)|(?:propagation|propagated).{0,15}dns)/i,/(?:dns.{0,15}(?:传播|propagation)|dnschecker)/i],
 ['whois',/(?:whois|rdap|域名.{0,15}(?:注册商|注册信息|到期)|domain.{0,15}(?:registrar|registration|expiry))/i,/(?:域名注册数据.{0,10}(?:查询|rdap)|whois.{0,10}lookup|icann lookup)/i],
 ['tls-check',/(?:https|ssl|tls).{0,20}(?:证书|检测|certificate|test|check)|(?:check|inspect).{0,20}(?:tls|ssl|https)/i,/(?:网站 https 检测|ssl labs|tls.{0,10}检测)/i],
 ['url-risk',/(?:钓鱼|恶意链接|恶意网址|phishing|malicious.{0,15}(?:url|link)|(?:url|link).{0,15}malicious)/i,/(?:可疑公开 URL 分析|网站危险状态检查|恶意.{0,10}(?:网址|链接)|phishing.{0,10}(?:check|scan))/i],
 ['webrtc',/webrtc.{0,15}(?:漏|暴露|test|leak|check)|(?:test|check).{0,15}webrtc/i,/webrtc.{0,10}(?:检测|诊断|test)/i],
 ['fingerprint',/(?:浏览器.{0,10}指纹|browser.{0,15}fingerprint|ブラウザ.{0,12}指紋)/i,/(?:浏览器.{0,12}指纹|browser fingerprint|指纹.{0,8}检测)/i],
 ['ip-lookup',/(?:公网.{0,12}ip|出口.{0,12}ip|public ip|external ip|ip.{0,12}归属)/i,/(?:公网.{0,12}ip|ip.{0,12}归属|ipinfo|ip\.fs\.kg|ip\.sb)/i],
 ['network-speed',/(?:网速|网络.{0,10}速度|internet.{0,12}(?:speed|bandwidth)|speed test|测.{0,6}带宽)/i,/(?:网速|测速|网络速度测试|speedtest|speed test|fast\.com)/i],
 ['meeting-zone',/(?:跨时区|时差.{0,12}会议|会议.{0,12}时区|meeting.{0,35}time zones|time zones.{0,25}meeting)/i,/(?:会议时区|world time buddy)/i],
 ['timer',/(?:倒计时|倒数.{0,8}计时|countdown|stopwatch|timer)/i,/(?:计时器|stopwatch|countdown)/i],
 ['qr-create',/(?:二维码|qr code|qrcode|QRコード)/i,/(?:生成.{0,10}二维码|二维码.{0,10}生成|qr code generator|qrcode monkey)/i],
 ['regex-test',/(?:正则|regex|regular expression|正規表現)/i,/(?:正则表达式.{0,10}(?:测试|编辑器)|regex101|regExr)/i],
 ['json-edit',/json.{0,15}(?:编辑|格式|整理|缩进|tree|format|edit)|(?:格式化|编辑|format|edit|pretty print).{0,15}json/i,/(?:json editor|json.{0,12}(?:树形|编辑))/i],
 ['typing',/(?:盲打|打字.{0,10}(?:练习|速度)|typing.{0,12}(?:practice|speed|wpm)|touch typing)/i,/(?:盲打|打字速度|typingclub|monkeytype)/i],
 ['palette',/(?:配色|色板|colou?r.{0,10}(?:palette|scheme))/i,/(?:色轮|协调配色|色板|color palette|colour palette)/i],
 ['font-pair',/(?:字体.{0,10}(?:搭配|组合)|(?:搭配|组合).{0,10}字体|font.{0,12}pair|pair.{0,20}fonts)/i,/(?:试配.{0,15}字体|fontjoy|font pairing)/i],
 ['flowchart',/(?:流程图|flowchart|flow chart|process diagram)/i,/(?:流程图|flowchart|flow chart)/i],
 ['public-books',/(?:公版.{0,10}(?:书|电子书)|版权.{0,10}过期.{0,10}书|public domain.{0,12}(?:books|ebooks)|copyright.expired.{0,12}(?:books|novels))/i,/(?:公版电子书|public domain ebooks|public domain books)/i],
 ['citation',/(?:参考文献.{0,12}(?:格式|生成)|(?:生成|格式化).{0,12}参考文献|bibliography|citation generator)/i,/(?:参考文献生成|citation generator|bibliography generator)/i],
 ['doi-lookup',/(?:doi.{0,18}(?:查|检索|lookup|metadata)|(?:查|lookup|find|resolve).{0,20}doi)/i,/(?:doi.{0,10}检索|查找 doi|doi 检索|crossref metadata search)/i],
 ['html-validate',/(?:html.{0,18}(?:验证|语法|校验|validate|syntax)|(?:validate|检查).{0,15}html)/i,/(?:html validator|网页标记语法检查)/i],
 ['css-validate',/(?:css.{0,18}(?:验证|语法|校验|validate|syntax)|(?:validate|检查).{0,15}css)/i,/(?:css validator|css 样式表验证)/i],
 ['web-performance',/(?:网页.{0,12}(?:速度|性能|加载)|page.{0,12}(?:speed|loading|performance)|core web vitals)/i,/(?:网页性能|core web vitals|网页页面加载速度|webpage test|webpagetest)/i],
 ['static-host',/(?:静态.{0,12}(?:网站|网页|站点).{0,12}(?:托管|发布|部署|上线)|static.{0,15}(?:site|website).{0,12}(?:hosting|deploy)|host.{0,12}static)/i,/(?:静态.{0,12}(?:托管|部署)|static.{0,12}hosting)/i],
 ['currency',/(?:汇率|货币.{0,12}(?:换算|兑换)|currency converter|convert.{0,16}currenc|exchange rate)/i,/(?:货币换算|汇率换算|currency converter)/i],
 ['text-translate',/(?:翻译.{0,12}(?:文章|段落|句子|文本)|(?:文章|段落|句子|文本).{0,12}翻译|translate.{0,16}(?:text|paragraph|sentence))/i,/(?:在线翻译服务|文本翻译|text translation|deepl)/i],
 ['word-dictionary',/(?:词典|字典|单词.{0,12}(?:意思|释义)|word.{0,12}(?:meaning|definition)|dictionary)/i,/(?:词典|字典|词义|dictionary)/i]
];
const constraints=/(?:不要|排除|除了|无需|免登录|免注册|免费|无广告|离线|不上传|本地处理|绝对安全|永久免费|\bwithout\b|\bnot\b|\bno[- ](?:login|ads|registration|upload|account)\b|\bfree\b|\boffline\b|\blocal[- ]only\b|ログイン不要|無料|広告なし|登録不要|オフライン|sin (?:registro|publicidad|conexi[oó]n)|gratis|sans (?:inscription|publicit[eé]|connexion)|gratuit|ohne (?:anmeldung|werbung|internet)|kostenlos)/i;
function candidate(query,items,model,features,baseline){
 const q=String(query||'').normalize('NFKC').trim();
 if(q.length<3||q.length>512||constraints.test(q))return [];
 const matches=rules.filter(([,p])=>p.test(q));
 if(matches.length>1)return []; // unresolved conjunction: do not broaden to an OR.
 if(!matches.length)return [...baseline.rank(q,items).keys()];
 const [id,,guard]=matches[0];
 const scores=classify(model,features,q);
 const fine=scores.find(x=>x.id===id);
 if(!fine||fine.score<.06)return [];
 const weights=new Map(model.classes.find(x=>x[0]===id)[1]);
 const ranked=new Map();
 for(const item of items){
  if(!item?.url||!guard.test([item.name,item.description].join(' ')))continue;
  let score=0;for(const [k,v] of features([item.name,item.description].join(' ')))score+=v*(weights.get(k)||0)/4096;
  ranked.set(item.url,Math.max(score,ranked.get(item.url)||0));
 }
 return [...ranked].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(x=>x[0]);
}
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
for(const q of negative.filter(q=>constraints.test(q)))assert.equal(candidate(q,catalog,model,runtime.features,baseline).length,0,q);
assert.equal(candidate("create qr code",[],model,runtime.features,baseline).length,0);
