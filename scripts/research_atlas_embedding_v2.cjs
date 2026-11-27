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

const model=trainV2(base,rows,runtime.features);
const payload=JSON.stringify(model)+"\n";
assert.equal(model.classes.length,64);
assert.equal(new Set(model.classes.map(x=>x[0])).size,64);
assert.ok(Buffer.byteLength(payload)<=100*1024);
assert.equal(JSON.stringify(model.classes.slice(0,28)),JSON.stringify(base.classes));
const report=evaluate(base,model,rows,negatives,runtime.features);
const sha256=crypto.createHash("sha256").update(payload).digest("hex");
console.log(JSON.stringify({bytes:Buffer.byteLength(payload),sha256,...report},null,2));
if(process.argv.includes("--write"))fs.writeFileSync(path.join(__dirname,"../research/atlas-model-v2.json"),payload);
if(process.argv.includes("--check"))assert.equal(fs.readFileSync(path.join(__dirname,"../research/atlas-model-v2.json"),"utf8"),payload);
