"use strict";
(function(root){
function features(raw){
 const text=String(raw||'').normalize('NFKC').toLowerCase().slice(0,512);
 const f=new Map();
 function add(s,w){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);const k=(h>>>0)%4096;f.set(k,Math.min(8,(f.get(k)||0)+w));}
 for(const word of text.match(/[a-z0-9]+/g)||[]){if(word.length<2||/^(the|and|for|with|from|can|how|what|where|this|that|have|want|find|help|you|my|your|into|online)$/.test(word))continue;add('w:'+word,2);if(word.length>=3)for(let i=0;i+3<=word.length;i++)add('g:'+word.slice(i,i+3),.45);}
 for(const chunk of text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu)||[]){for(let i=0;i<chunk.length;i++){add('c:'+chunk[i],.18);if(i+1<chunk.length)add('b:'+chunk.slice(i,i+2),1.2);if(i+2<chunk.length)add('t:'+chunk.slice(i,i+3),.7);}}
 const norm=Math.sqrt([...f.values()].reduce((n,w)=>n+w*w,0))||1;for(const [k,v] of f)f.set(k,v/norm);return f;
}
const SPEC=Object.freeze({"version":"1","file":"atlas-semantic-model-v1.json","bytes":34879,"sha256":"b502f1d6106471627b3adbabfa32c668c100a3a92064136930a770c9d5a126eb","dimensions":28});

// Explicit task evidence constrains the learned vector; no inferred price, account,
// execution environment, security guarantee or feature from broad topical similarity.
const tasks=[
 ['qr-create',/(?:二维码.{0,8}(?:生成|制作)|(?:生成|制作).{0,12}二维码|(?:generate|create|make).{0,16}(?:qr code|qrcode)|qr code generator|QRコード.{0,8}作)/i,/(?:生成.{0,8}二维码|二维码.{0,8}生成|qr code generator|qrcode monkey)/i],
 ['dns-check',/(?:域名.{0,12}(?:解析|生效)|dns.{0,12}(?:传播|propagation|lookup|查询|check)|(?:check|lookup).{0,16}dns)/i,/(?:dns.{0,12}(?:传播|解析查询|lookup|诊断)|dnschecker|nslookup\.io)/i],
 ['meeting-zone',/(?:跨时区.{0,12}(?:会议|开会)|(?:会议|开会).{0,12}时区|(?:meeting|schedule).{0,30}time zones|time zones.{0,20}meeting|時差.{0,10}会議)/i,/(?:会议时区|时区重叠|world time buddy)/i],
 ['regex-test',/(?:正则.{0,8}(?:测试|调试|验证)|(?:测试|调试).{0,8}正则|(?:test|debug).{0,15}(?:regex|regular expression)|regex tester|正規表現.{0,8}テスト)/i,/(?:正则表达式.{0,8}(?:测试|编辑器)|regex101|regExr)/i],
 ['typing-practice',/(?:打字.{0,10}(?:练习|速度|训练)|(?:练习|训练).{0,8}(?:打字|盲打)|(?:practice|improve|test).{0,18}typing|typing.{0,8}(?:practice|speed)|タイピング.{0,8}練習)/i,/(?:打字速度|练习.{0,8}盲打|typingclub|monkeytype)/i],
 ['palette',/(?:海报.{0,12}配色|(?:找|生成|搭配|选).{0,8}配色|(?:color|colour).{0,8}palette|配色.{0,8}(?:工具|方案))/i,/(?:色轮|协调配色|color palette|colour palette)/i],
 ['font-pair',/(?:字体.{0,10}(?:搭配|配对|组合)|(?:搭配|组合).{0,8}字体|font pairing|pair.{0,8}fonts)/i,/(?:试配.{0,12}字体|字体搭配|fontjoy|font pairing)/i],
 ['webrtc-test',/(?:webrtc.{0,12}(?:检测|泄漏|test|leak)|(?:检查|检测|test|check).{0,12}webrtc)/i,/(?:webrtc.{0,10}(?:检测|诊断|test)|browserleaks|IP Tools 诊断集合)/i],
 ['public-books',/(?:公版.{0,8}(?:书|电子书)|public domain.{0,8}(?:books|ebooks)|著作権切れ.{0,8}本)/i,/(?:公版.{0,8}(?:电子书|文献)|public domain.{0,8}(?:ebooks|books))/i],
 ['flowchart',/(?:画.{0,12}流程图|(?:制作|绘制).{0,12}流程图|(?:draw|create|make).{0,18}(?:flowchart|flow chart)|フローチャート.{0,8}作)/i,/(?:流程图|flowchart|flow chart)/i],
 ['json-editor',/(?:json.{0,12}(?:整理|编辑|格式化|format|edit)|(?:整理|编辑|format|edit).{0,12}json)/i,/(?:json editor|整理.{0,8}可公开的数据|json.{0,10}(?:编辑|树形结构))/i],
 ['pdf-merge',/(?:pdf.{0,16}(?:合并|合成|拼接|combine|merge)|(?:合并|合成|combine|merge).{0,20}pdf)/i,/(?:pdf.{0,14}(?:处理|工具|合并|merge|editor)|(?:合并|merge).{0,15}pdf|ilovepdf|pdf24|acrobat online)/i],
 ['pdf-read',/(?:pdf.{0,12}(?:阅读|查看|打开)|(?:read|view|open).{0,15}pdf)/i,/(?:pdf.{0,12}(?:查看|阅读|打开|viewer)|pdf\.js|(?:read|view).{0,12}pdf)/i],
 ['photo-background',/(?:抠图|去背景|去除.{0,8}背景|背景.{0,8}(?:消|去|删)|remove.{0,24}background|background removal)/i,/(?:抠图|去背景|去除.{0,8}(?:图片)?背景|remove.{0,12}background|background remover)/i],
 ['photo-size',/(?:resize.{0,20}(?:photo|image|picture)|(?:photo|image|picture).{0,20}resiz|调整.{0,8}(?:图片|照片).{0,8}大小|(?:图片|照片).{0,10}(?:尺寸|缩放|大小)|画像.{0,10}リサイズ)/i,/(?:调整图片大小|调整.{0,10}(?:尺寸|大小)|(?:照片|图片|图像).{0,10}尺寸|resize.{0,15}(?:image|photo)|image resizer)/i],
 ['photo-collage',/(?:照片|图片|图像).{0,16}(?:拼在|拼接|拼合|拼成|合在)|(?:photo|image|picture).{0,12}collage|写真.{0,8}結合/i,/(?:照片|图片|图像).{0,12}(?:拼接|拼合|拼贴)|photo collage|image collage/i],
 ['ip-lookup',/(?:公网.{0,8}(?:出口|地址|ip)|出口.{0,8}(?:地址|ip)|(?:public|internet|network).{0,12}(?:ip|address)|(?:ip|asn).{0,10}(?:查询|归属|lookup|address|geolocation)|(?:查询|查看).{0,8}ip)/i,/(?:公网.{0,10}(?:ip|出口)|ip\s*(?:信息查询|查询|归属|lookup|geolocation)|(?:查询|查看|检测).{0,8}(?:ip|公网)|ipinfo|ip\.sb|ip\.fs\.kg)/i],
 ['speed-test',/(?:网速|测速|网络.{0,8}(?:延时|延迟|速度)|speed\s*test|(?:internet|network).{0,12}speed|bandwidth|latency test)/i,/(?:测速|测网速|测试.{0,10}(?:延迟|吞吐|网络连接)|speedtest|speed test|bandwidth test|fast\.com)/i],
 ['papers',/(?:学术.{0,8}(?:研究|资料|搜索)|(?:找|查|检索).{0,8}(?:论文|文献)|論文.{0,8}探|scholarly.{0,12}(?:publications|articles)|research papers|literature search)/i,/(?:学术搜索|论文检索|文献检索|学术机构开放资源检索|academic search|scholarly search|research papers|google scholar|pubmed|doaj)/i],
 ['slides',/(?:课堂.{0,8}汇报|演示文稿|幻灯片|slide deck|make.{0,15}presentation|powerpoint|ppt|プレゼン)/i,/(?:幻灯片模板|演示模板|演示文稿.{0,10}(?:制作|模板)|幻灯片.{0,8}制作|powerpoint|slidesgo|slidescarnival|presentation templates|slide deck)/i],
 ['translate-text',/(?:译成|翻译.{0,12}(?:文章|文字|文本|英文|中文)|(?:英文|中文).{0,12}翻译|translate.{0,12}(?:text|article|paragraph)|文章.{0,8}翻訳)/i,/(?:在线翻译服务|翻译.{0,8}(?:服务|语境例句|文本|文章)|deepl|reverso|text translation)/i],
 ['web-host-docs',/^(?=.*(?:文档|指南|教程|docs|documentation|guide))(?=.*(?:网站|网页|website|hosting|deploy)).*$/i,/(?:网站.{0,12}(?:托管|部署)|静态.{0,10}托管|web(?:site)? hosting|deploy.{0,12}website)/i],
 ['web-host',/^(?!.*(?:文档|指南|教程|docs|documentation|guide)).*(?:网页.{0,8}托管|网站.{0,8}(?:托管|部署|上线)|web(?:site)? hosting|host.{0,12}website|deploy.{0,12}website)/i,/^(?!.*(?:文档|指南|教程|\bdocs\b|\bdocumentation\b)).*(?:网站.{0,10}(?:托管|部署)|静态.{0,10}托管|web(?:site)? hosting|deploy.{0,12}website)/i],
 ['currency-convert',/(?:汇率.{0,8}(?:换算|转换)|货币.{0,8}(?:换算|转换)|convert currency|currency converter|exchange rate conversion|為替.{0,8}換算)/i,/(?:货币换算|币种估算|汇率换算|currency converter|currency conversion)/i]
];
// Broad domains still require a meaningful matching descriptor in the actual catalog.
const evidence={
 pdf:/\bpdf\b/i,image:/图片|图像|照片|photo|image editor|写真/i,slides:/幻灯片模板|演示模板|演示文稿|powerpoint|slidesgo|slidescarnival/i,papers:/论文|文献|学术搜索|scholarly|academic search|pubmed/i,courses:/课程|公开课|教育|教学|course|lessons|tutorial/i,ai:/人工智能|大模型|AI交流|智能助手|chatbot|language model|AI官网/i,translate:/翻译|词典|字典|translate|dictionary|翻訳/i,code:/编程|代码|开发|developer|programming|documentation/i,deploy:/网站.{0,10}(?:部署|托管)|运维|容器|hosting|deployment|kubernetes/i,ip:/公网.{0,10}(?:ip|出口)|ip\s*(?:信息|查询|地址|归属|lookup|address)|(?:查询|查看)\s*ip|网络属性|ipinfo|ip\.sb|ip\.fs\.kg/i,speed:/测速|测网速|延迟|吞吐|speedtest|speed test|fast\.com/i,dns:/域名解析|dns|whois|域名登记/i,security:/风险检测|钓鱼|恶意|证书|phishing|malware|ssl/i,privacy:/隐私|指纹|webrtc|泄漏|privacy|fingerprint/i,maps:/地图|地理|卫星|街景|map|satellite/i,travel:/旅行|交通|航班|火车|旅游|travel|transit|flight/i,assets:/素材|插画|字体|图标|stock image|illustration|font|icon/i,music:/音乐|音频|播客|music|audio|podcast/i,video:/视频|电影|影片|video|film/i,play:/游戏|休闲|解压|game|puzzle/i,data:/数据集|统计|数据库|数据可视化|dataset|statistics|database/i,science:/科学|科研|材料|化学|物理|工程|science|engineering/i,time:/时间|时钟|时区|日期|日历|计时|timezone|clock|calendar|timer/i,finance:/金融|经济|汇率|货币|财经|finance|economics|currency/i,books:/图书|电子书|书籍|阅读|library|ebook|books/i,news:/新闻|时事|报道|news|journalism/i,files:/文件格式|文件转换|压缩包|解压|file converter|archive|json/i,health:/健康|医学|公共卫生|医疗|health|medical/i
};
function unsupported(q){return /(?:不要|不想|不推荐|排除|除了|无需|不用|不需要|免登录|免注册|免费|无广告|本地处理|绝对安全|永久免费|not\s+|without\s+|exclude\s+|avoid\s+|no[- ]login|no[- ]ads|free\s+|offline\s+|ログイン不要|無料|使わない)/i.test(q);}

function create(model){
 if(!model||model.schema!=='aq-domain-embedding-1'||model.bins!==4096||!Array.isArray(model.classes)||model.classes.length!==SPEC.dimensions)throw Error('model schema');
 const lookup=new Map(),ids=new Set();
 model.classes.forEach(([id,weights],i)=>{if(typeof id!=='string'||ids.has(id)||!Array.isArray(weights)||weights.length>4096)throw Error('model classes');ids.add(id);const seen=new Set();for(const [k,w] of weights){if(!Number.isInteger(k)||k<0||k>=4096||seen.has(k)||!Number.isInteger(w)||w<=0||w>4096)throw Error('model weight');seen.add(k);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push([i,w/4096]);}});
 const docCache=new WeakMap();
 function embed(text){const f=features(text),v=new Float32Array(model.classes.length);for(const [k,w] of f)for(const [i,c] of lookup.get(k)||[])v[i]+=w*c;let peak=0;for(const x of v)peak=Math.max(peak,x);for(let i=0;i<v.length;i++)v[i]=Math.max(0,v[i]-.045);const norm=Math.hypot(...v);if(norm)for(let i=0;i<v.length;i++)v[i]/=norm;return {v,peak};}
 function doc(item){let e=docCache.get(item);if(!e){e=embed([item.name,item.category,item.description].join(' '));docCache.set(item,e);}return e;}
 function rank(query,items){
  const raw=String(query||'').normalize('NFKC').trim();
  if(raw.length<3||unsupported(raw))return new Map();
  const q=embed(raw),selected=tasks.filter(([,pattern])=>pattern.test(raw));
  const peaks=Array.from(q.v,(value,i)=>({value,id:model.classes[i][0]})).sort((a,b)=>b.value-a.value);
  // Unknown intent and diffuse/ambiguous vectors should abstain. Explicit task
  // evidence may retrieve candidates even if the small model misses the phrase.
  if(!selected.length&&(q.peak<.19||!peaks[0]||peaks[0].value<.55||peaks[0].value-(peaks[1]?.value||0)<.12))return new Map();
  const out=[];
  for(const item of items.slice(0,2500)){
   const description=[item.name,item.description].join(' ');
   if(selected.length&&!selected.every(([, ,guard])=>guard.test(description)))continue;
   if(!selected.length&&!evidence[peaks[0].id]?.test(description))continue;
   const d=doc(item);let sim=0;for(let i=0;i<q.v.length;i++)sim+=q.v[i]*d.v[i];
   if(selected.length){out.push([item.url,1+sim]);}
   else if(d.peak>=.13&&sim>=.76)out.push([item.url,sim]);
  }
  out.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return new Map(out.slice(0,12).map(([url,sim])=>[url,1+sim]));
 }
 return Object.freeze({embed,rank});
}
const api=Object.freeze({SPEC,features,create});root.AVENQIR_DOMAIN_EMBEDDING=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
