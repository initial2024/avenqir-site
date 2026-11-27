"use strict";
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const corpus=[
  [
    "pdf",
    "PDF PDF文件 电子文档 合并PDF 拆分PDF 压缩PDF",
    "merge pdf documents combine pages split pdf reduce pdf file size",
    "pdf converter edit portable document scan pdf",
    "把几个文档合在一起 将论文变成PDF PDF转换",
    "PDF 編集 結合 圧縮"
  ],
  [
    "image",
    "图片 图像 照片 修图 抠图 图片压缩 图片编辑",
    "resize a photograph remove background crop photo compress image",
    "picture editor photo retouch image converter graphic design",
    "修改照片尺寸 把图片变小 在线处理照片",
    "画像 編集 写真 リサイズ"
  ],
  [
    "slides",
    "PPT 幻灯片 演示文稿 汇报 课件",
    "make a presentation slideshow powerpoint slide deck",
    "create slides for class pitch deck presentation templates",
    "做课堂汇报的演示页 制作幻灯片",
    "プレゼン スライド 資料"
  ],
  [
    "papers",
    "论文 学术 文献 检索 参考文献 期刊 DOI",
    "research papers scholarly articles academic journals citations",
    "find scientific publications literature search bibliography",
    "找研究文献 查论文引用 学术搜索",
    "論文 学術 文献 検索"
  ],
  [
    "courses",
    "教育 学习 课程 网课 教学 数学 化学 物理",
    "learn online lessons university courses tutorials education",
    "study mathematics physics chemistry practice exercises",
    "自学一门课 找公开课 学习知识",
    "学習 授業 教育 講座"
  ],
  [
    "ai",
    "人工智能 AI 大模型 聊天 语言模型 智能助手",
    "artificial intelligence language model chatbot assistant",
    "ask an AI question generative text machine learning",
    "找智能助手 帮我理解问题 AI对话",
    "人工知能 チャット AI"
  ],
  [
    "translate",
    "翻译 英语 语言 字典 词典 词义 外语",
    "translate text dictionary foreign language vocabulary pronunciation",
    "look up a word translation bilingual language learning",
    "查单词意思 把英文变成中文",
    "翻訳 辞書 言語"
  ],
  [
    "code",
    "开发 编程 代码 程序 软件 文档 JavaScript Python",
    "programming code developer documentation source repository coding",
    "debug a script javascript python web development reference",
    "写程序 查代码语法 开发网页",
    "プログラミング コード 開発"
  ],
  [
    "deploy",
    "部署 运维 主机 容器 云服务 服务器 CI CDN",
    "deploy website hosting server cloud container infrastructure",
    "web hosting continuous integration kubernetes docker observability",
    "把网站发布上线 管理服务器",
    "サーバー ホスティング デプロイ"
  ],
  [
    "ip",
    "网络 IP 地址 ASN 归属地 公网 运营商 代理",
    "check public ip address internet provider asn ip geolocation",
    "find my network address proxy connection location ip lookup",
    "查看当前出口地址 网络归属 查询IP",
    "IP アドレス ネットワーク"
  ],
  [
    "speed",
    "网速 测速 延迟 网络速度 带宽 ping",
    "internet speed test bandwidth latency connection performance",
    "measure download upload throughput ping connection",
    "检查网络有多快 测试网络延迟",
    "速度 測定 インターネット"
  ],
  [
    "dns",
    "DNS 域名 解析 DNS记录 whois 域名查询",
    "dns lookup domain name records whois propagation",
    "check nameserver mx txt a record domain registration",
    "查域名解析是否生效 域名登记",
    "DNS ドメイン 検索"
  ],
  [
    "security",
    "安全 风险 钓鱼 恶意 网址检测 HTTPS 证书",
    "check suspicious link phishing malware url reputation ssl certificate",
    "scan public website risk verify https security",
    "判断链接是否可疑 检查网站证书",
    "セキュリティ フィッシング"
  ],
  [
    "privacy",
    "隐私 浏览器 指纹 WebRTC 泄漏 时区 浏览器检测",
    "browser privacy fingerprint webRTC leak browser information",
    "inspect browser timezone fingerprint tracking privacy check",
    "看看浏览器暴露了什么 信息泄漏检测",
    "プライバシー ブラウザ"
  ],
  [
    "maps",
    "地图 地理 卫星 街景 世界 地形",
    "map geography satellite imagery street view explore world",
    "find places geographic data terrain map navigation",
    "看看世界地图 查地理位置 卫星照片",
    "地図 衛星 地理"
  ],
  [
    "travel",
    "出行 旅行 交通 航班 火车 酒店 路线",
    "travel transit flight train hotel trip journey route",
    "plan a journey public transportation travel information",
    "找出行路线 查询交通旅行信息",
    "旅行 交通 航空"
  ],
  [
    "assets",
    "素材 插画 图标 字体 图片素材 版权 授权",
    "design assets stock images illustrations icons fonts license",
    "find graphics for a project free media resource",
    "找设计素材 查字体图标与授权",
    "素材 イラスト フォント"
  ],
  [
    "music",
    "音频 音乐 播客 歌曲 音频编辑",
    "music audio podcast song sound recording audio editor",
    "listen to music discover podcasts edit sound",
    "找声音素材 收听播客 处理音频",
    "音楽 音声 ポッドキャスト"
  ],
  [
    "video",
    "视频 影音 影片 视频编辑 电影",
    "video movie film streaming video editing clips",
    "watch educational videos cut a video find films",
    "处理短片 看公开视频 查影片",
    "動画 映画 ビデオ"
  ],
  [
    "play",
    "游戏 休闲 解压 娱乐 小游戏 摸鱼",
    "play casual games relax puzzles entertainment",
    "take a break browser game puzzle fun",
    "休息几分钟 找在线小游戏",
    "ゲーム 休憩 パズル"
  ],
  [
    "data",
    "数据 统计 数据集 数据库 数据可视化 图表",
    "data statistics dataset charts database visualization",
    "find public statistics explore data graphs table",
    "查公开统计 数据可视化 数据集下载",
    "データ 統計 グラフ"
  ],
  [
    "science",
    "科学 科研 材料 化学 物理 工程 技术",
    "science engineering chemistry materials physics research",
    "scientific reference material properties chemical database",
    "查科学资料 材料物性 工程参考",
    "科学 化学 工学"
  ],
  [
    "time",
    "时间 时钟 时区 日期 日历 计时器",
    "time clock timezone date calendar timer countdown",
    "check current time convert timezone set timer",
    "查现在几点 计时 日期计算",
    "時間 時計 タイマー"
  ],
  [
    "finance",
    "金融 经济 汇率 货币 财经 市场 股票",
    "finance economics exchange rate currency market stocks",
    "convert currency find economic data financial information",
    "查汇率 财经市场 数据参考",
    "金融 為替 経済"
  ],
  [
    "books",
    "阅读 图书 电子书 书籍 文学 档案",
    "books reading ebooks library literature archive",
    "find a book public domain reading online",
    "找书看 阅读电子书 图书馆",
    "読書 書籍 図書館"
  ],
  [
    "news",
    "新闻 资讯 报道 时事 新闻媒体",
    "news current affairs reports journalism headlines",
    "read world news media reports public affairs",
    "看新闻 获取时事报道",
    "ニュース 報道"
  ],
  [
    "files",
    "文件 文件格式 转换 压缩 解压 文本 JSON",
    "file format converter archive zip compress text json",
    "convert a file inspect structured data file tools",
    "转换文件格式 压缩包 文本格式化",
    "ファイル 変換 圧縮"
  ],
  [
    "health",
    "健康 医疗 医学 公共卫生 疾病 指南",
    "health medical medicine public health disease guidance",
    "find public health information medical references",
    "查健康科普 医学资料 公共卫生",
    "健康 医療 医学"
  ]
];
function features(raw){
 const text=String(raw||'').normalize('NFKC').toLowerCase().slice(0,512);
 const f=new Map();
 function add(s,w){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);const k=(h>>>0)%4096;f.set(k,Math.min(8,(f.get(k)||0)+w));}
 for(const word of text.match(/[a-z0-9]+/g)||[]){if(word.length<2||/^(the|and|for|with|from|can|how|what|where|this|that|have|want|find|help|you|my|your|into|online)$/.test(word))continue;add('w:'+word,2);if(word.length>=3)for(let i=0;i+3<=word.length;i++)add('g:'+word.slice(i,i+3),.45);}
 for(const chunk of text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu)||[]){for(let i=0;i<chunk.length;i++){add('c:'+chunk[i],.18);if(i+1<chunk.length)add('b:'+chunk.slice(i,i+2),1.2);if(i+2<chunk.length)add('t:'+chunk.slice(i,i+3),.7);}}
 const norm=Math.sqrt([...f.values()].reduce((n,w)=>n+w*w,0))||1;for(const [k,v] of f)f.set(k,v/norm);return f;
}
function train(corpus,features){
 const accum=corpus.map(([id,...examples])=>{const m=new Map();for(const e of examples)for(const [k,v] of features(e))m.set(k,(m.get(k)||0)+v/examples.length);return [id,m];});
 const df=new Map();for(const [,m] of accum)for(const k of m.keys())df.set(k,(df.get(k)||0)+1);
 return {schema:"aq-domain-embedding-1",bins:4096,classes:accum.map(([id,m])=>{const v=[...m].map(([k,w])=>[k,w*(1+Math.log((accum.length+1)/(1+df.get(k))))]);const norm=Math.sqrt(v.reduce((s,x)=>s+x[1]*x[1],0))||1;return [id,v.map(([k,w])=>[k,Math.round(w/norm*4096)]).filter(x=>x[1]>0).sort((a,b)=>a[0]-b[0])];})};
}
const result=JSON.stringify(train(corpus,features))+'\n';
const site=path.resolve(__dirname,'../site');
const spec=require(path.join(site,'atlas-domain-embedding.js')).SPEC;
if(Buffer.byteLength(result)!==spec.bytes||crypto.createHash('sha256').update(result).digest('hex')!==spec.sha256)throw Error('Model manifest mismatch; explicitly update pinned size/hash for a new version');
const file=path.join(site,spec.file);
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==result)throw Error('Training reproduction mismatch');}else fs.writeFileSync(file,result);
console.log('DOMAIN_MODEL_REPRODUCED',spec.dimensions,'dimensions',spec.bytes,'bytes',spec.sha256);
