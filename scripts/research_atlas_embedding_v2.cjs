"use strict";
// Research-only: no browser code, no user queries, no deployment.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const runtime=require("../site/atlas-domain-embedding.js");
const base=JSON.parse(fs.readFileSync(require.resolve("../site/atlas-semantic-model-v1.json"),"utf8"));
const rows=[
  [
    "pdf-merge",
    "pdf",
    "合并PDF 拼接文档 PDF合成",
    "merge pdf documents combine pdf files",
    "PDF 結合 ページ",
    "combine several PDFs",
    "多个PDF拼成一个"
  ],
  [
    "pdf-compress",
    "pdf",
    "压缩PDF 减小文档体积",
    "compress pdf reduce pdf file size",
    "PDF 圧縮 軽量化",
    "shrink a PDF file",
    "PDF文件太大想压缩"
  ],
  [
    "pdf-split",
    "pdf",
    "拆分PDF 提取页面",
    "split pdf extract pages",
    "PDF 分割 ページ抽出",
    "separate PDF pages",
    "把PDF拆成几份"
  ],
  [
    "pdf-view",
    "pdf",
    "阅读PDF 打开文档 查看器",
    "pdf viewer read document open pdf",
    "PDF 閲覧 ビューア",
    "view a PDF online",
    "打开PDF阅读"
  ],
  [
    "image-resize",
    "image",
    "调整图片尺寸 照片缩放",
    "resize image change photo dimensions",
    "画像 リサイズ サイズ変更",
    "change picture dimensions",
    "把照片尺寸调小"
  ],
  [
    "image-background",
    "image",
    "图片抠图 去除背景",
    "remove background cut out subject image",
    "写真 背景 削除",
    "erase photo background",
    "照片背景去掉"
  ],
  [
    "image-compress",
    "image",
    "压缩图片 减少照片体积",
    "compress images reduce photo file size",
    "画像 圧縮 軽量化",
    "shrink image file size",
    "照片压缩减小文件"
  ],
  [
    "image-collage",
    "image",
    "照片拼图 图片拼接",
    "photo collage combine pictures",
    "写真 コラージュ 結合",
    "make a picture collage",
    "将多张照片拼在一起"
  ],
  [
    "dns-lookup",
    "dns",
    "域名解析 DNS记录 DNS查询",
    "dns lookup query dns records",
    "DNS レコード 検索",
    "check a DNS record",
    "查域名解析记录"
  ],
  [
    "dns-propagation",
    "dns",
    "DNS传播 域名解析生效 全球节点",
    "dns propagation worldwide nameserver check",
    "DNS 伝播 確認",
    "check global DNS propagation",
    "域名解析各地是否生效"
  ],
  [
    "whois",
    "dns",
    "域名注册信息 WHOIS RDAP",
    "whois lookup domain registration ownership",
    "ドメイン 登録情報 WHOIS",
    "look up WHOIS information",
    "查域名注册资料"
  ],
  [
    "tls-check",
    "security",
    "HTTPS证书 TLS配置 SSL检测",
    "ssl certificate tls configuration test",
    "SSL 証明書 検査",
    "check a site's TLS certificate",
    "检测HTTPS证书"
  ],
  [
    "url-risk",
    "security",
    "钓鱼网址 恶意链接 网站风险",
    "phishing link malicious url reputation",
    "フィッシング URL 安全性",
    "check suspicious phishing link",
    "检测链接是否恶意"
  ],
  [
    "webrtc",
    "privacy",
    "WebRTC泄漏 浏览器IP暴露",
    "webrtc leak browser ip exposure test",
    "WebRTC 漏洩 検査",
    "test WebRTC leaks",
    "检查浏览器WebRTC泄漏"
  ],
  [
    "fingerprint",
    "privacy",
    "浏览器指纹 设备特征 跟踪",
    "browser fingerprint canvas device tracking",
    "ブラウザ フィンガープリント",
    "check browser fingerprinting",
    "查询浏览器指纹"
  ],
  [
    "ip-lookup",
    "ip",
    "公网IP 出口地址 IP归属",
    "public ip lookup external address geolocation",
    "IP アドレス 確認",
    "find external IP address",
    "查看公网IP归属地"
  ],
  [
    "network-speed",
    "speed",
    "网速测试 带宽 测速",
    "internet speed test bandwidth throughput",
    "回線 速度 測定",
    "test internet bandwidth",
    "测试网络速度"
  ],
  [
    "meeting-zone",
    "time",
    "跨时区会议 时差安排",
    "meeting planner time zones overlap",
    "時差 会議 日程",
    "schedule a meeting across time zones",
    "跨时区安排会议"
  ],
  [
    "timer",
    "time",
    "倒计时 计时器 番茄钟",
    "countdown timer stopwatch focus",
    "タイマー カウントダウン",
    "start a countdown timer",
    "设置一个倒计时"
  ],
  [
    "qr-create",
    "code",
    "生成二维码 制作链接二维码",
    "generate qr code url qrcode",
    "QRコード 作成",
    "make a QR code for a link",
    "链接转成二维码"
  ],
  [
    "regex-test",
    "code",
    "正则表达式 调试 测试正则",
    "regex tester regular expression debug",
    "正規表現 テスト",
    "test regular expressions",
    "验证一条正则表达式"
  ],
  [
    "json-edit",
    "files",
    "JSON编辑 格式化 树形结构",
    "json editor format json tree",
    "JSON 整形 編集",
    "pretty print JSON",
    "把JSON整理成树形"
  ],
  [
    "typing",
    "courses",
    "盲打训练 打字速度 键盘练习",
    "typing practice touch typing keyboard speed",
    "タイピング 練習",
    "practice touch typing",
    "练习打字速度"
  ],
  [
    "palette",
    "assets",
    "配色方案 色轮 海报颜色",
    "color palette color wheel design",
    "配色 カラーパレット",
    "generate a colour palette",
    "设计海报选配色"
  ],
  [
    "font-pair",
    "assets",
    "字体搭配 标题正文 组合",
    "font pairing typography combination",
    "フォント 組み合わせ",
    "pair heading and body fonts",
    "标题与正文的字体组合"
  ],
  [
    "flowchart",
    "code",
    "绘制流程图 结构图 架构图",
    "draw flowchart diagram process mapping",
    "フローチャート 作成",
    "create a process flow chart",
    "制作流程图"
  ],
  [
    "public-books",
    "books",
    "公版电子书 公共领域书籍",
    "public domain books copyright expired ebooks",
    "著作権切れ 電子書籍",
    "read public domain ebooks",
    "找版权已过期的书"
  ],
  [
    "citation",
    "papers",
    "参考文献格式 引文生成 DOI引用",
    "citation generator bibliography reference formatting",
    "参考文献 引用 作成",
    "generate a bibliography",
    "生成论文参考文献格式"
  ],
  [
    "doi-lookup",
    "papers",
    "DOI检索 文献元数据 论文编号",
    "doi lookup article metadata identifier",
    "DOI 論文 検索",
    "find article by DOI",
    "根据DOI查论文"
  ],
  [
    "html-validate",
    "code",
    "HTML验证 网页标记语法检查",
    "html validator markup syntax check",
    "HTML 構文 検証",
    "validate website HTML markup",
    "检查HTML语法"
  ],
  [
    "css-validate",
    "code",
    "CSS验证 样式表语法检查",
    "css validator stylesheet syntax check",
    "CSS 構文 検証",
    "validate CSS stylesheets",
    "检查CSS样式语法"
  ],
  [
    "web-performance",
    "code",
    "网页速度 性能评估 核心指标",
    "website performance page speed core web vitals",
    "ウェブ ページ 速度 性能",
    "measure page loading performance",
    "检测网页加载速度"
  ],
  [
    "static-host",
    "deploy",
    "静态网站托管 网页部署 上线",
    "static website hosting deploy web pages",
    "静的サイト ホスティング",
    "host a static website",
    "部署静态网页"
  ],
  [
    "currency",
    "finance",
    "货币换算 汇率转换",
    "currency converter exchange rate conversion",
    "為替 通貨 換算",
    "convert between currencies",
    "换算两种货币"
  ],
  [
    "text-translate",
    "translate",
    "文章翻译 文本翻译 英文转中文",
    "translate text paragraph foreign language",
    "文章 翻訳",
    "translate a paragraph",
    "翻译英文段落"
  ],
  [
    "word-dictionary",
    "translate",
    "词典 单词释义 查词",
    "dictionary word definition vocabulary lookup",
    "辞書 単語 意味",
    "look up word meaning",
    "查单词的释义"
  ]
];
const negatives=[
  "banana refrigerator repair",
  "qzxvjjunk7293",
  "修理洗衣机的轴承",
  "make dinner with potatoes",
  "自行车轮胎打气",
  "offline pdf compressor no upload",
  "免费且无广告的二维码",
  "without login AI chat",
  "広告なし QRコード",
  "what is the capital of Peru",
  "sleeping bag for winter",
  "火星天气预报"
];

function trainV2(base,rows,features,cap=120){
 const classes=base.classes.map(([id,weights])=>[id,weights.slice()]);
 const raw=rows.map(([id,parent,...examples])=>{const acc=new Map();for(const example of examples.slice(0,3))for(const [k,w] of features(example))acc.set(k,(acc.get(k)||0)+w/3);return [id,parent,acc]});
 const df=new Map();for(const [, ,m] of raw)for(const k of m.keys())df.set(k,(df.get(k)||0)+1);
 for(const [id,parent,m] of raw){const a=[...m].map(([k,v])=>[k,v*(1+Math.log((raw.length+1)/(1+df.get(k))))]).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,cap);const norm=Math.hypot(...a.map(x=>x[1]))||1;classes.push([id,a.map(([k,v])=>[k,Math.round(v/norm*4096)]).filter(x=>x[1]>0).sort((a,b)=>a[0]-b[0])]);}
 return {schema:'aq-domain-embedding-research-2',bins:base.bins,classes,parents:Object.fromEntries(rows.map(([id,p])=>[id,p]))};
}
function classify(model,features,text){
 const f=features(text);return model.classes.map(([id,weights])=>{let score=0;for(const [k,w] of weights)score+=(f.get(k)||0)*w/4096;return {id,score};}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
function evaluate(base,candidate,rows,negatives,features){
 let n=0,baseCoarse=0,newCoarse=0,fine=0,fine5=0;const misses=[];
 for(const [id,parent,...examples] of rows){for(const q of examples.slice(3)){n++;const a=classify(base,features,q),b=classify(candidate,features,q);if(a[0].id===parent)baseCoarse++;if((candidate.parents[b[0].id]||b[0].id)===parent)newCoarse++;if(b[0].id===id)fine++;else misses.push({q,expected:id,actual:b[0].id});if(b.slice(0,5).some(x=>x.id===id))fine5++;}}
 return {n,baseCoarse,newCoarse,fine,fine5,misses,negativeScores:negatives.map(q=>({q,baseline:classify(base,features,q)[0],candidate:classify(candidate,features,q)[0]}))};
}


const extra=[
  [
    "pdf-merge",
    "join PDF pages into one document 拼合PDF 合为一个文件",
    "PDF ファイル 結合 一つにまとめる",
    "join two PDF attachments"
  ],
  [
    "pdf-compress",
    "make PDF smaller shrink megabytes PDF文档减肥",
    "PDF 容量 削減",
    "PDF容量を小さくする"
  ],
  [
    "pdf-split",
    "divide PDF into separate files PDF分割 单页导出",
    "PDF ページ 分離 抽出",
    "从PDF中单独导出一页"
  ],
  [
    "pdf-view",
    "open and inspect PDF pages PDF预览 阅读器",
    "PDF ファイル 表示 読む",
    "preview a PDF document"
  ],
  [
    "image-resize",
    "change image width height pixels 图片宽高 像素调整",
    "画像 ピクセル サイズ変更",
    "调整照片宽高像素"
  ],
  [
    "image-background",
    "erase picture background transparent cutout 照片背景删除 透明底",
    "画像 背景 透過 除去",
    "make a transparent photo background"
  ],
  [
    "image-compress",
    "reduce JPEG PNG bytes photo compression 照片减肥 图片文件体积",
    "JPEG 画像 容量 削減",
    "JPEG文件太大怎么缩小"
  ],
  [
    "image-collage",
    "join multiple photographs into a grid 多图合成 拼贴",
    "写真 複数枚 コラージュ",
    "combine pictures into a grid"
  ],
  [
    "dns-lookup",
    "look up A MX TXT DNS records 域名记录 查询解析值",
    "DNS レコード A MX TXT 確認",
    "查看域名的MX记录"
  ],
  [
    "dns-propagation",
    "check DNS changes from different locations 域名解析全球同步 生效状态",
    "DNS 変更 世界 伝播 状況",
    "has my DNS change propagated worldwide"
  ],
  [
    "whois",
    "find registrar domain expiry ownership 域名注册商 到期时间",
    "ドメイン 登録者 有効期限 WHOIS",
    "查询域名到期日期和注册商"
  ],
  [
    "tls-check",
    "inspect HTTPS SSL expiry certificate chain 证书到期 HTTPS链",
    "HTTPS 証明書 有効期限",
    "SSL証明書の期限を確認"
  ],
  [
    "url-risk",
    "check URL scam malicious site 链接诈骗 恶意网址安全检查",
    "詐欺 サイト URL 危険",
    "is this web link malicious"
  ],
  [
    "webrtc",
    "test WebRTC exposing network address RTC IP泄漏测试",
    "WebRTC IP 漏洩 確認",
    "WebRTCでIPが漏れていないか"
  ],
  [
    "fingerprint",
    "browser canvas fingerprint entropy 浏览器指纹识别 canvas",
    "ブラウザ 指紋 トラッキング",
    "浏览器canvas指纹查看"
  ],
  [
    "ip-lookup",
    "what is my public IP ISP ASN 出口IP 运营商",
    "グローバル IP アドレス プロバイダ",
    "what is my external internet address"
  ],
  [
    "network-speed",
    "measure download upload latency bandwidth 测下载上传网速 延迟",
    "インターネット 回線 速度 測定",
    "測定したいネット回線速度"
  ],
  [
    "meeting-zone",
    "find overlapping work hours across countries 不同国家开会 时间重叠",
    "会議 時差 時間 調整",
    "find a meeting time in Tokyo and London time zones"
  ],
  [
    "timer",
    "set countdown alarm stopwatch 倒数 计时 闹钟",
    "カウントダウン タイマー 設定",
    "倒数十分钟计时"
  ],
  [
    "qr-create",
    "turn website URL into QR code 二维码生成 网址转换",
    "URL QRコード 生成",
    "URLをQRコードにする"
  ],
  [
    "regex-test",
    "check pattern matches regex 正则匹配 调试表达式",
    "正規表現 マッチ 確認",
    "debug a regex pattern"
  ],
  [
    "json-edit",
    "beautify JSON indentation nested data JSON美化 缩进",
    "JSON 整形 ツリー",
    "JSON数据缩进格式化"
  ],
  [
    "typing",
    "learn keyboard touch typing words per minute 键盘打字 WPM",
    "タイピング 速度 練習",
    "measure my typing WPM"
  ],
  [
    "palette",
    "pick harmonious colours colour scheme 色彩组合 色板",
    "色 組み合わせ パレット",
    "select a color scheme for a poster"
  ],
  [
    "font-pair",
    "choose matching typefaces heading body text 字体组合 正文标题",
    "見出し 本文 フォント 組み合わせ",
    "見出しと本文のフォントを組み合わせる"
  ],
  [
    "flowchart",
    "map a workflow with boxes arrows 工作流程 方框箭头",
    "業務フロー 図 作成",
    "画带箭头的工作流程图"
  ],
  [
    "public-books",
    "read copyright expired classic books 公共领域经典著作",
    "著作権 期限 切れ 本",
    "find copyright-expired novels"
  ],
  [
    "citation",
    "format academic citations bibliography APA MLA 引用格式 参考文献",
    "文献 引用 参考文献 書式",
    "make APA references for a bibliography"
  ],
  [
    "doi-lookup",
    "resolve DOI to journal article metadata DOI编号 期刊元数据",
    "DOI 論文 書誌 情報",
    "通过DOI获取期刊文章信息"
  ],
  [
    "html-validate",
    "check HTML tags markup errors HTML标签校验",
    "HTML タグ 構文 チェック",
    "find errors in HTML tags"
  ],
  [
    "css-validate",
    "check CSS properties styles syntax CSS属性 校验",
    "CSS スタイル 構文 チェック",
    "CSSの構文エラーを調べる"
  ],
  [
    "web-performance",
    "analyze slow page loading LCP core web vitals 页面性能 加载慢",
    "ページ 読み込み パフォーマンス",
    "网页LCP加载性能检测"
  ],
  [
    "static-host",
    "publish HTML static files on hosting 静态HTML站点发布",
    "静的 HTML サイト 公開",
    "put a static HTML site online"
  ],
  [
    "currency",
    "exchange dollars euros yuan monetary conversion 货币兑换 美元汇率",
    "ドル 円 通貨 換算",
    "美元换算成日元"
  ],
  [
    "text-translate",
    "translate sentences between languages 句子段落 翻译",
    "文章 言語 翻訳",
    "translate these sentences into Japanese"
  ],
  [
    "word-dictionary",
    "look up definitions dictionary vocabulary meanings 字典 查词 词义",
    "辞書 単語 意味 調べる",
    "単語の意味を辞書で調べる"
  ]
];

function trainExpanded(base,rows,extra,features,cap=160){
 const classes=base.classes.map(([id,w])=>[id,w.slice()]);
 const raw=rows.map(([id,parent,...examples])=>{
  const more=extra.find(x=>x[0]===id);if(!more)throw Error('missing training data '+id);
  const texts=examples.slice(0,3).concat(more.slice(1,3));
  const acc=new Map();for(const text of texts)for(const [k,w] of features(text))acc.set(k,(acc.get(k)||0)+w/texts.length);
  return [id,parent,acc];
 });
 const df=new Map();for(const [,,m] of raw)for(const k of m.keys())df.set(k,(df.get(k)||0)+1);
 for(const [id,parent,m] of raw){
  const a=[...m].map(([k,w])=>[k,w*(1+Math.log((raw.length+1)/(1+df.get(k))))]).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,cap);
  const norm=Math.hypot(...a.map(x=>x[1]))||1;
  classes.push([id,a.map(([k,w])=>[k,Math.round(w/norm*4096)]).filter(x=>x[1]>0).sort((a,b)=>a[0]-b[0])]);
 }
 return {schema:'aq-domain-embedding-research-2',bins:base.bins,classes,parents:Object.fromEntries(rows.map(([id,p])=>[id,p]))};
}
const objectPatterns=[
 ['pdf',/\bpdfs?\b|ＰＤＦ/i],
 ['image',/\b(?:photos?|photographs?|images?|pictures?|jpeg|png)\b|照片|图片|图像|写真|画像/i],
 ['dns',/\b(?:dns|whois|rdap)\b|域名|ドメイン/i],
 ['privacy',/\bwebrtc\b|browser fingerprint|浏览器指纹|ブラウザ.{0,8}指紋/i],
 ['security',/\b(?:https|tls|ssl|phishing|malicious)\b|钓鱼|恶意|フィッシング|証明書/i],
 ['code',/\b(?:regex|html|css|qrcode|qr code|flowchart)\b|正则|二维码|正規表現|QRコード|流程图|業務フロー/i],
 ['files',/\bjson\b/i],
 ['finance',/\b(?:currenc(?:y|ies)|exchange rate)\b|汇率|货币|通貨|為替/i],
 ['papers',/\bdoi\b|bibliography|参考文献|文献引用/i],
 ['time',/\b(?:countdown|stopwatch|timer|time zones?)\b|倒计时|倒数|時差|タイマー|时区/i],
 ['courses',/\b(?:touch typing|typing speed|typing wpm)\b|盲打|打字|タイピング/i],
 ['assets',/\b(?:color scheme|colour scheme|color palette|colour palette|fonts?|typefaces?)\b|配色|字体|フォント/i]
];
function hierarchical(model,features,q){
 const all=classify(model,features,q);
 const hints=objectPatterns.filter(([,p])=>p.test(q)).map(([id])=>id);
 const hint=hints.length===1?hints[0]:null;
 const parent=x=>model.parents[x.id]||x.id;
 const groups=new Map();
 for(const x of all){const p=parent(x),g=groups.get(p)||{coarse:0,fine:0};if(model.parents[x.id])g.fine=Math.max(g.fine,x.score);else g.coarse=x.score;groups.set(p,g);}
 const ranked=[...groups].map(([id,g])=>({id,score:Math.max(g.coarse,g.fine)+.15*Math.min(g.coarse,g.fine)+(hint===id?.18:0)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const p=ranked[0].id;
 const fine=all.filter(x=>model.parents[x.id]===p);
 // Research ranking only; ambiguous/unsupported intents must be gated before production retrieval.
 return fine.length&&fine[0].score>=.08?fine[0].id:p;
}
function compareSets(prior,expanded,rows,extra,features){
 const evaluateSet=cases=>{
  const out={n:cases.length,priorFine:0,expandedFlatFine:0,expandedHierFine:0,expandedHierCoarse:0,misses:[]};
  for(const [id,p,q] of cases){const before=classify(prior,features,q)[0].id,flat=classify(expanded,features,q)[0].id,after=hierarchical(expanded,features,q);
   out.priorFine+=Number(before===id);out.expandedFlatFine+=Number(flat===id);out.expandedHierFine+=Number(after===id);out.expandedHierCoarse+=Number((expanded.parents[after]||after)===p);if(after!==id)out.misses.push({q,expected:id,actual:after});}
  return out;
 };
 return {development:evaluateSet(rows.flatMap(([id,p,...qs])=>qs.slice(3).map(q=>[id,p,q]))),newAuthorWritten:evaluateSet(rows.map(([id,p])=>[id,p,extra.find(x=>x[0]===id)[3]]))};
}

const prior=trainV2(base,rows,runtime.features);
const model=trainExpanded(base,rows,extra,runtime.features);
const payload=JSON.stringify(model)+"\n";
assert.equal(model.classes.length,64);
assert.equal(new Set(model.classes.map(x=>x[0])).size,64);
assert.ok(Buffer.byteLength(payload)<=100*1024);
assert.equal(JSON.stringify(model.classes.slice(0,28)),JSON.stringify(base.classes));
const report=compareSets(prior,model,rows,extra,runtime.features);
const sha256=crypto.createHash("sha256").update(payload).digest("hex");
console.log(JSON.stringify({bytes:Buffer.byteLength(payload),sha256,...report},null,2));
if(process.argv.includes("--write"))fs.writeFileSync(path.join(__dirname,"../research/atlas-model-v2.json"),payload);
if(process.argv.includes("--check"))assert.equal(fs.readFileSync(path.join(__dirname,"../research/atlas-model-v2.json"),"utf8"),payload);
