"use strict";
/* Public, hand-curated URLs and task-first discovery trails. No remote script or tracking. */
(function(root){
 const links=[
 {
  "id": "a95",
  "name": "Jupyter 在线体验",
  "url": "https://jupyter.org/try",
  "category": "教育",
  "description": "无需本机安装即可体验 Jupyter；演示环境不适合存放敏感数据"
 },
 {
  "id": "a96",
  "name": "Zenodo",
  "url": "https://zenodo.org/",
  "category": "科研",
  "description": "由 CERN 承载的通用科研成果与数据存储平台"
 },
 {
  "id": "a97",
  "name": "OpenAIRE Explore",
  "url": "https://explore.openaire.eu/",
  "category": "学术",
  "description": "跨机构检索开放科研成果、项目与数据"
 },
 {
  "id": "a98",
  "name": "Squoosh",
  "url": "https://squoosh.app/",
  "category": "创作",
  "description": "浏览器内图片格式转换和压缩，仍需核对网页来源"
 },
 {
  "id": "a99",
  "name": "ICANN Lookup",
  "url": "https://lookup.icann.org/",
  "category": "网络",
  "description": "域名注册数据 RDAP 查询，部分联系人信息不公开"
 },
 {
  "id": "a100",
  "name": "Google Public DNS",
  "url": "https://dns.google/",
  "category": "网络",
  "description": "Google 公共 DNS 解析信息与诊断入口"
 },
 {
  "id": "a101",
  "name": "Cloudflare Speed Test",
  "url": "https://speed.cloudflare.com/",
  "category": "网络",
  "description": "测试当前网络连接的延迟、吞吐与质量"
 },
 {
  "id": "a102",
  "name": "IANA",
  "url": "https://www.iana.org/",
  "category": "网络",
  "description": "域名、IP 地址与协议参数协调机构"
 },
 {
  "id": "a103",
  "name": "RFC Editor",
  "url": "https://www.rfc-editor.org/",
  "category": "开发",
  "description": "互联网协议 RFC 文档官方发布与检索"
 },
 {
  "id": "a104",
  "name": "W3C",
  "url": "https://www.w3.org/",
  "category": "开发",
  "description": "万维网开放标准与技术规范"
 },
 {
  "id": "a105",
  "name": "Hugging Face Models",
  "url": "https://huggingface.co/models",
  "category": "AI",
  "description": "检索公开机器学习模型，下载前核对许可和文件来源"
 },
 {
  "id": "a106",
  "name": "Ollama",
  "url": "https://ollama.com/",
  "category": "AI",
  "description": "在兼容设备上运行本地大语言模型的软件与文档"
 },
 {
  "id": "a107",
  "name": "LM Studio",
  "url": "https://lmstudio.ai/",
  "category": "AI",
  "description": "桌面端本地模型运行工具，具体硬件要求需查阅文档"
 },
 {
  "id": "a108",
  "name": "OpenML",
  "url": "https://www.openml.org/",
  "category": "数据",
  "description": "公开机器学习数据集、任务与实验结果"
 },
 {
  "id": "a109",
  "name": "LibreOffice",
  "url": "https://www.libreoffice.org/",
  "category": "实用",
  "description": "免费开源办公软件，支持离线文档编辑"
 },
 {
  "id": "a110",
  "name": "OBS Studio",
  "url": "https://obsproject.com/",
  "category": "创作",
  "description": "开源录屏和直播制作工具"
 },
 {
  "id": "a111",
  "name": "Audacity",
  "url": "https://www.audacityteam.org/",
  "category": "创作",
  "description": "开源音频录制及编辑软件"
 },
 {
  "id": "a112",
  "name": "FreeCAD",
  "url": "https://www.freecad.org/",
  "category": "创作",
  "description": "开源参数化三维 CAD 设计"
 },
 {
  "id": "a113",
  "name": "Standard Ebooks",
  "url": "https://standardebooks.org/",
  "category": "阅读",
  "description": "精校整理的公版电子书，注意地区版权差异"
 },
 {
  "id": "a114",
  "name": "Library of Congress",
  "url": "https://www.loc.gov/",
  "category": "阅读",
  "description": "美国国会图书馆数字馆藏与公开资料"
 },
 {
  "id": "a115",
  "name": "CommonMark",
  "url": "https://commonmark.org/",
  "category": "开发",
  "description": "Markdown 语法规范与示例"
 },
 {
  "id": "a116",
  "name": "Chrome Lighthouse",
  "url": "https://developer.chrome.com/docs/lighthouse/",
  "category": "开发",
  "description": "网站质量、性能与可访问性审计工具"
 },
 {
  "id": "a117",
  "name": "Typst",
  "url": "https://typst.app/",
  "category": "创作",
  "description": "文档排版语言与在线编辑平台，部分功能需要账户"
 },
 {
  "id": "a118",
  "name": "OWASP",
  "url": "https://owasp.org/",
  "category": "安全",
  "description": "应用安全社区、方法与项目资源"
 },
 {
  "id": "a119",
  "name": "Tor Project",
  "url": "https://www.torproject.org/",
  "category": "安全",
  "description": "Tor 浏览器与隐私网络项目；访问可用性因地区而异"
 },
 {
  "id": "a120",
  "name": "OpenStreetMap Wiki",
  "url": "https://wiki.openstreetmap.org/",
  "category": "地图",
  "description": "OpenStreetMap 编辑、标注和数据规范"
 },
 {
  "id": "a121",
  "name": "GitHub Docs",
  "url": "https://docs.github.com/",
  "category": "开发",
  "description": "GitHub 官方操作、API 与 Actions 文档"
 },
 {
  "id": "a122",
  "name": "Krita",
  "url": "https://krita.org/",
  "category": "创作",
  "description": "开源数字绘画与插画软件"
 },
 {
  "id": "a123",
  "name": "Creative Commons",
  "url": "https://creativecommons.org/",
  "category": "创作",
  "description": "开放版权许可的条款和使用解释"
 },
 {
  "id": "a124",
  "name": "DeepL",
  "url": "https://www.deepl.com/translator",
  "category": "实用",
  "description": "在线翻译服务；敏感材料不要直接上传"
 },
 {
  "id": "a125",
  "name": "No More Ransom",
  "url": "https://www.nomoreransom.org/",
  "category": "安全",
  "description": "勒索软件防护与部分解密工具的公共项目"
 },
 {
  "id": "a126",
  "name": "GitHub Security Advisories",
  "url": "https://github.com/advisories",
  "category": "安全",
  "description": "开源软件安全漏洞公告与版本影响信息"
 }
];
 const flows=[
 {
  "id": "research",
  "icon": "📚",
  "title": "查论文与证据",
  "subtitle": "从元数据到原文与开放数据",
  "note": "先核 DOI/作者，再查开放版本；预印本不等于同行评审。",
  "urls": [
   "https://search.crossref.org/",
   "https://openalex.org/",
   "https://www.semanticscholar.org/",
   "https://zenodo.org/"
  ]
 },
 {
  "id": "materials",
  "icon": "🧪",
  "title": "材料科学研究",
  "subtitle": "结构、性能、计算多来源交叉查证",
  "note": "材料牌号、测量条件和数据库计算假设必须核对。",
  "urls": [
   "https://materialsproject.org/",
   "https://www.crystallography.net/cod/",
   "https://jarvis.nist.gov/",
   "https://webbook.nist.gov/chemistry/"
  ]
 },
 {
  "id": "website",
  "icon": "🛠️",
  "title": "网站上线排错",
  "subtitle": "域名注册 → DNS → TLS → 性能",
  "note": "DNS 传播结果与安全评分是不同问题；不要提交后台口令。",
  "urls": [
   "https://lookup.icann.org/",
   "https://dns.google/",
   "https://internet.nl/",
   "https://pagespeed.web.dev/",
   "https://wave.webaim.org/"
  ]
 },
 {
  "id": "privacy",
  "icon": "🛡️",
  "title": "隐私与安全自查",
  "subtitle": "浏览器暴露项与公开风险知识",
  "note": "公开扫描可能泄露网址；没有安全网站可被百分百保证。",
  "urls": [
   "https://browserleaks.com/",
   "https://www.eff.org/",
   "https://safebrowsing.google.com/",
   "https://haveibeenpwned.com/"
  ]
 },
 {
  "id": "create",
  "icon": "🎨",
  "title": "图片与内容创作",
  "subtitle": "找素材 → 核许可 → 编辑 → 压缩",
  "note": "编辑工具可能上传文件；授权范围应以素材详情页为准。",
  "urls": [
   "https://openverse.org/",
   "https://creativecommons.org/",
   "https://www.photopea.com/",
   "https://squoosh.app/"
  ]
 },
 {
  "id": "localai",
  "icon": "🧠",
  "title": "本地 AI 起步",
  "subtitle": "选模型 → 核许可 → 本地运行",
  "note": "下载模型文件须核实发布者；本地运行不自动意味着内容完全可信。",
  "urls": [
   "https://huggingface.co/models",
   "https://ollama.com/",
   "https://lmstudio.ai/",
   "https://github.com/"
  ]
 },
 {
  "id": "learn",
  "icon": "🌱",
  "title": "免费学习与阅读",
  "subtitle": "开放课程、交互模拟和公版阅读",
  "note": "部分服务存在订阅、区域授权或在线演示时间限制。",
  "urls": [
   "https://ocw.mit.edu/",
   "https://phet.colorado.edu/",
   "https://jupyter.org/try",
   "https://standardebooks.org/"
  ]
 },
 {
  "id": "mathvisual",
  "icon": "📐",
  "title": "数学绘图与验算",
  "subtitle": "交互绘图 → 代数 → 计算结果复核",
  "note": "计算器结果不能替代证明，注意定义域、参数与步骤条件。",
  "urls": [
   "https://www.desmos.com/calculator",
   "https://www.geogebra.org/graphing",
   "https://www.symbolab.com/",
   "https://www.mathway.com/"
  ]
 },
 {
  "id": "ipdiagnose",
  "icon": "🌐",
  "title": "网络出口诊断",
  "subtitle": "公网 IP → 分流 → DNS → IPv6",
  "note": "各网站可能观察到不同出口；网络检测会向第三方暴露本次连接信息。",
  "urls": [
   "https://ip.net.coffee/",
   "https://ip.sb/",
   "https://www.dnsleaktest.com/",
   "https://test-ipv6.com/",
   "https://egress.1ms.dog/"
  ]
 },
 {
  "id": "aicheck",
  "icon": "🔎",
  "title": "AI 文本检测对照",
  "subtitle": "多工具参考而非作者身份认证",
  "note": "AI 检测可能误报、漏报，绝不可单凭分数判定作弊；勿上传未公开文本。",
  "urls": [
   "https://cn.aifoxs.com/ai-detect",
   "https://gptzero.me/",
   "https://sapling.ai/ai-content-detector",
   "https://www.zerogpt.com/"
  ]
 },
 {
  "id": "englishread",
  "icon": "📖",
  "title": "英语阅读与查词",
  "subtitle": "阅读原文 → 查词义 → 听语境 → 拓展素材",
  "note": "公开阅读站由用户提供、未成功自动核验；词典和视频素材仍需核对上下文。",
  "urls": [
   "https://read.claua.de/",
   "https://www.oxfordlearnersdictionaries.com/",
   "https://youglish.com/",
   "https://www.bbc.co.uk/learningenglish",
   "https://dictionary.cambridge.org/"
  ]
 }
];
 function itemsForFlow(id,items){const f=flows.find(x=>x.id===id);if(!f||!Array.isArray(items))return [];
   const byUrl=new Map(items.map(x=>[x.url,x]));return f.urls.map(url=>byUrl.get(url)).filter(Boolean);}
 const api=Object.freeze({links:Object.freeze(links),flows:Object.freeze(flows),itemsForFlow});
 root.AVENQIR_ATLAS_PATHS=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
