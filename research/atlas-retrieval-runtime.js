"use strict";
(function(root){
const multilingual=typeof module==='object'&&module.exports?require('./atlas-multilingual-intents.js'):root.AVENQIR_RESEARCH_MULTILINGUAL;
function classify(model,features,text){
 const f=features(text);return model.classes.map(([id,weights])=>{let score=0;for(const [k,w] of weights)score+=(f.get(k)||0)*w/4096;return {id,score};}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}

// Evidence rules are anchored to catalog metadata, not claims of current service availability.
const rules=[
 ['pdf-merge',/pdf.{0,24}(?:合并|拼接|合成|merge|join|combine)|(?:合并|拼接|合成|merge|join|combine).{0,25}pdf/i,/(?:合并|拼接|merge|combine).{0,12}pdf|pdf.{0,12}(?:合并|拼接|merge|combine)/i],
 ['pdf-compress',/pdf.{0,24}(?:压缩|变小|减小|compress|shrink)|(?:压缩|compress|shrink).{0,24}pdf/i,/(?:pdf.{0,15}(?:压缩|compress)|(?:压缩|compress).{0,12}pdf)/i],
 ['pdf-split',/pdf.{0,24}(?:拆分|拆成|分割|导出|split|extract)|(?:split|extract|拆分).{0,24}pdf/i,/(?:pdf.{0,15}(?:拆分|分割|split)|(?:拆分|分割|split).{0,12}pdf)/i],
 ['pdf-view',/(?:pdf.{0,24}(?:阅读|打开|预览|view|read|閲覧|表示)|(?:阅读|打开|预览|view|read|preview).{0,24}pdf)/i,/(?:pdf.{0,15}(?:查看|阅读|打开|viewer)|(?:查看|阅读|打开|view).{0,18}pdf)/i],
 ['image-resize',/(?:照片|图片|图像|image|photo|picture).{0,20}(?:尺寸|宽高|像素|resize|dimensions)|(?:调整|resize|dimensions).{0,20}(?:照片|图片|image|photo|picture)/i,/(?:调整图片大小|图片.{0,10}(?:尺寸|大小)|resize.{0,15}(?:image|photo))/i],
 ['image-background',/(?:抠图|去背景|背景.{0,10}(?:删除|去除|去掉)|(?:remove|erase).{0,20}background|background removal|透明底)/i,/(?:抠图|去背景|去除.{0,8}背景|background remover|remove.{0,12}background)/i],
 ['image-compress',/(?:照片|图片|图像|画像|写真|jpeg|png|image|photo|picture).{0,25}(?:压缩|圧縮|减小|变小|compress|shrink|容量削減)|(?:压缩|圧縮|compress|shrink).{0,25}(?:照片|图片|画像|写真|jpeg|png|image|photo|picture)/i,/(?:图片.{0,16}压缩|图像.{0,16}压缩|image.{0,12}compress|compress.{0,12}image)/i],
 ['image-collage',/(?:照片|图片|图像|photo|picture|image).{0,20}(?:拼接|拼图|拼成|collage)|(?:collage|拼接).{0,20}(?:照片|图片|photo|picture)/i,/(?:图片.{0,12}(?:拼接|拼贴)|照片.{0,12}(?:拼接|拼贴)|photo collage|image collage)/i],
 ['dns-lookup',/(?:dns.{0,24}(?:record|lookup|查询|记录)|(?:域名|dns).{0,18}(?:mx|txt|记录)|(?:lookup|query).{0,12}dns)/i,/(?:dns.{0,12}(?:解析|lookup|查询|诊断)|nslookup\.io)/i],
 ['dns-propagation',/(?:dns.{0,30}(?:propagation|propagate|传播|生效)|域名.{0,24}(?:全球|生效|传播)|(?:propagation|propagated).{0,15}dns)/i,/(?:dns.{0,15}(?:传播|propagation)|dnschecker)/i],
 ['whois',/(?:whois|rdap|域名.{0,15}(?:注册商|注册信息|到期)|domain.{0,15}(?:registrar|registration|expiry)|ドメイン.{0,18}(?:登録者|登録情報|有効期限))/i,/(?:域名注册数据.{0,10}(?:查询|rdap)|whois.{0,10}lookup|icann lookup)/i],
 ['tls-check',/(?:https|ssl|tls).{0,20}(?:证书|証明書|检测|certificate|test|check)|(?:check|inspect).{0,20}(?:tls|ssl|https)/i,/(?:网站 https 检测|ssl labs|tls.{0,10}检测)/i],
 ['url-risk',/(?:钓鱼|恶意链接|恶意网址|phishing|フィッシング|malicious.{0,15}(?:url|link)|(?:url|link).{0,15}malicious)/i,/(?:可疑公开 URL 分析|网站危险状态检查|恶意.{0,10}(?:网址|链接)|phishing.{0,10}(?:check|scan))/i],
 ['webrtc',/webrtc.{0,15}(?:漏|暴露|test|leak|check)|(?:test|check).{0,15}webrtc/i,/webrtc.{0,10}(?:检测|诊断|test)/i],
 ['fingerprint',/(?:浏览器.{0,10}指纹|browser.{0,15}fingerprint|ブラウザ.{0,12}指紋)/i,/(?:浏览器.{0,12}指纹|browser fingerprint|指纹.{0,8}检测)/i],
 ['ip-lookup',/(?:公网.{0,12}ip|出口.{0,12}ip|public ip|external ip|ip.{0,12}归属)/i,/(?:公网.{0,12}ip|ip.{0,12}归属|ipinfo|ip\.fs\.kg|ip\.sb)/i],
 ['network-speed',/(?:网速|网络.{0,10}速度|internet.{0,12}(?:speed|bandwidth)|speed test|测.{0,6}带宽)/i,/(?:网速|测速|网络速度测试|speedtest|speed test|fast\.com)/i],
 ['meeting-zone',/(?:跨时区|时差.{0,12}会议|会议.{0,12}时区|meeting.{0,35}time zones|time zones.{0,25}meeting)/i,/(?:会议时区|world time buddy)/i],
 ['timer',/(?:倒计时|倒数.{0,8}计时|countdown|stopwatch|timer|カウントダウン|タイマー)/i,/(?:计时器|stopwatch|countdown)/i],
 ['qr-create',/(?:(?:生成|制作|美化|变成|转成|转换|create|make|generate|turn|作成|生成).{0,45}(?:二维码|qr code|qrcode|QRコード)|(?:二维码|qr code|qrcode|QRコード).{0,18}(?:生成|制作|作成|generator|に変換))/i,/(?:生成.{0,10}二维码|二维码.{0,10}生成|qr code generator|qrcode monkey)/i],
 ['regex-test',/(?:(?:测试|调试|验证|test|debug|check).{0,20}(?:正则|regex|regular expression)|(?:正则|regex|regular expression|正規表現).{0,20}(?:测试|调试|验证|tester|test|debug|テスト|確認))/i,/(?:正则表达式.{0,10}(?:测试|编辑器)|regex101|regExr)/i],
 ['json-edit',/json.{0,15}(?:编辑|格式|整理|缩进|tree|format|edit|編集|整形|ツリー)|(?:格式化|编辑|format|edit|pretty print).{0,15}json/i,/(?:json editor|json.{0,12}(?:树形|编辑))/i],
 ['typing',/(?:盲打|打字.{0,10}(?:练习|速度)|typing.{0,12}(?:practice|speed|wpm)|touch typing)/i,/(?:盲打|打字速度|typingclub|monkeytype)/i],
 ['palette',/(?:配色|色板|colou?r.{0,10}(?:palette|scheme))/i,/(?:色轮|协调配色|色板|color palette|colour palette)/i],
 ['font-pair',/(?:字体.{0,10}(?:搭配|组合)|(?:搭配|组合).{0,10}字体|font.{0,12}pair|pair.{0,35}fonts|フォント.{0,16}(?:組み合|ペア))/i,/(?:试配.{0,15}字体|fontjoy|font pairing)/i],
 ['flowchart',/(?:流程图|flowchart|flow chart|process diagram|フローチャート)/i,/(?:流程图|flowchart|flow chart)/i],
 ['public-books',/(?:公版.{0,10}(?:书|电子书)|版权.{0,10}过期.{0,10}书|public domain.{0,12}(?:books|ebooks)|copyright.expired.{0,12}(?:books|novels)|著作権切れ.{0,8}本)/i,/(?:公版电子书|public domain ebooks|public domain books)/i],
 ['citation',/(?:参考文献.{0,12}(?:格式|生成|書式|作成)|(?:生成|格式化).{0,12}参考文献|bibliography|citation generator)/i,/(?:参考文献生成|citation generator|bibliography generator)/i],
 ['doi-lookup',/(?:doi.{0,18}(?:查|检索|lookup|metadata|検索)|(?:查|lookup|find|resolve).{0,20}doi)/i,/(?:doi.{0,10}检索|查找 doi|doi 检索|crossref metadata search)/i],
 ['html-validate',/(?:html.{0,18}(?:验证|语法|校验|validate|syntax|構文|検証)|(?:validate|检查).{0,15}html)/i,/(?:html validator|网页标记语法检查)/i],
 ['css-validate',/(?:css.{0,18}(?:验证|语法|校验|validate|syntax|構文|検証)|(?:validate|检查).{0,15}css)/i,/(?:css validator|css 样式表验证)/i],
 ['web-performance',/(?:网页.{0,12}(?:速度|性能|加载)|page.{0,12}(?:speed|loading|performance)|core web vitals|ページ.{0,18}(?:読み込み|性能))/i,/(?:网页性能|core web vitals|网页页面加载速度|webpage test|webpagetest)/i],
 ['static-host',/(?:静态.{0,12}(?:网站|网页|站点).{0,12}(?:托管|发布|部署|上线)|static.{0,15}(?:site|website).{0,12}(?:hosting|deploy)|host.{0,12}static)/i,/(?:静态.{0,12}(?:托管|部署)|static.{0,12}hosting)/i],
 ['currency',/(?:汇率|货币.{0,12}(?:换算|兑换)|currency converter|convert.{0,20}currenc|exchange rate|通貨.{0,12}換算)/i,/(?:货币换算|汇率换算|currency converter)/i],
 ['text-translate',/(?:翻译.{0,12}(?:文章|段落|句子|文本)|(?:文章|段落|句子|文本).{0,12}翻译|translate.{0,16}(?:text|paragraph|sentence)|文章.{0,12}翻訳)/i,/(?:在线翻译服务|文本翻译|text translation|deepl)/i],
 ['word-dictionary',/(?:词典|字典|单词.{0,12}(?:意思|释义)|word.{0,12}(?:meaning|definition)|dictionary|辞書|単語.{0,12}意味)/i,/(?:词典|字典|词义|dictionary)/i]
];
const constraints=/(?:免費|無廣告|免註冊|不需登入|不需登錄|離線|不需上傳|不要|排除|除了|无需|免登录|免注册|免费|无广告|离线|不上传|本地处理|绝对安全|永久免费|\bwithout\b|\bnot\b|\bno[- ](?:login|ads|registration|upload|account)\b|\bfree\b|\boffline\b|\blocal[- ]only\b|ログイン不要|無料|広告なし|登録不要|オフライン|sin (?:registro|publicidad|conexi[oó]n)|gratis|sans (?:inscription|publicit[eé]|connexion)|gratuit|ohne (?:anmeldung|werbung|internet)|kostenlos)/i;

// Reject unsupported operation/object combinations before generic category fallback.
// This is an abstention on the tool task, not a claim that the web contains no answer.
const incompatible=/(?:\bqr\s*code\s*(?:scanner|reader)\b|(?:decode|scan|read).{0,18}qr\s*code|二维码.{0,12}(?:扫描|识别|解码)|(?:扫描|识别|解码).{0,12}二维码|(?:how (?:does|do|is)|what is).{0,30}(?:qr code|dns|css|regex|fingerprint)|(?:正则表达式|二维码|DNS).{0,12}(?:是什么|原理)|\bregex\s*tutorial\b|dns.{0,20}(?:format|documentation)|pdf.{0,18}password|find pdf on|(?:python.{0,14}typing|typing.{0,14}python)|currency.{0,18}trading|fingerprint.{0,12}definition|webrtc.{0,12}api documentation)/i;

const topicFamilies=[
 /\bpdfs?\b/i,/(?:照片|图片|图像|画像|写真|\b(?:photos?|images?|pictures?|jpeg|png)\b)/i,
 /(?:二维码|QRコード|\bqr\s*code\b|\bqrcode\b)/i,/(?:流程图|フローチャート|\bflow\s*chart\b)/i,
 /(?:\bdns\b|域名|ドメイン|\bwhois\b)/i,/(?:正则|正規表現|\bregex\b|regular expression)/i,
 /(?:\bjson\b)/i,/(?:倒计时|タイマー|\b(?:timer|countdown|stopwatch)\b)/i,
 /(?:货币|汇率|通貨|\bcurrenc(?:y|ies)\b)/i,/(?:\bwebrtc\b)/i,
 /(?:字体|フォント|\bfonts?\b)/i,/(?:配色|\bcolou?r\s+palette\b)/i
];
function compound(q){
 if(!/(?:\band\b|\bor\b|以及|并且|同时|或是|和|及び|および)/i.test(q))return false;
 return topicFamilies.filter(p=>p.test(q)).length>1;
}

function candidate(query,items,model,features,baseline){
 const q=String(query||'').normalize('NFKC').trim();
 if(q.length<3||q.length>512||constraints.test(q)||incompatible.test(q)||compound(q))return [];
 const alias=multilingual.resolve(q);if(alias.blocked)return [];
 const matches=alias.id?rules.filter(([id])=>id===alias.id):rules.filter(([,p])=>p.test(q));
 if(matches.length>1)return []; // unresolved conjunction: do not broaden to an OR.
 if(!matches.length)return [...baseline.rank(q,items).keys()];
 const [id,,guard]=matches[0];
 const scores=classify(model,features,q);
 const fine=scores.find(x=>x.id===id);
 if(!fine)return []; // explicit task rule + document evidence may recover low model-score queries; model ranks grounded candidates.
 const weights=new Map(model.classes.find(x=>x[0]===id)[1]);
 const ranked=new Map();
 for(const item of items){
  if(!item?.url||!guard.test([item.name,item.description].join(' ')))continue;
  let score=0;for(const [k,v] of features([item.name,item.description].join(' ')))score+=v*(weights.get(k)||0)/4096;
  ranked.set(item.url,Math.max(score,ranked.get(item.url)||0));
 }
 return [...ranked].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(x=>x[0]);
}

const api=Object.freeze({candidate,classify,compound});
if(typeof module==="object"&&module.exports)module.exports=api;else root.AVENQIR_RESEARCH_RETRIEVAL=api;
})(typeof self!=="undefined"?self:globalThis);
