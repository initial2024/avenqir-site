"use strict";
(function(root){
const multilingual=typeof module==='object'&&module.exports?require('./atlas-multilingual-intents.js'):root.AVENQIR_RESEARCH_MULTILINGUAL;
const topics=typeof module==='object'&&module.exports?require('./atlas-multilingual-topics.js'):root.AVENQIR_RESEARCH_TOPICS;
const evidence={
 pdf:/\bpdf\b/i,image:/图片|图像|照片|photo|image editor|写真/i,slides:/幻灯片模板|演示模板|演示文稿|powerpoint|slidesgo|slidescarnival/i,papers:/论文|文献|学术搜索|scholarly|academic search|pubmed/i,courses:/课程|公开课|教育|教学|course|lessons|tutorial/i,ai:/人工智能|大模型|AI交流|智能助手|chatbot|language model|AI官网/i,translate:/翻译|词典|字典|translate|dictionary|翻訳/i,code:/编程|代码|开发|developer|programming|documentation/i,deploy:/网站.{0,10}(?:部署|托管)|运维|容器|hosting|deployment|kubernetes/i,ip:/公网.{0,10}(?:ip|出口)|ip\s*(?:信息|查询|地址|归属|lookup|address)|(?:查询|查看)\s*ip|网络属性|ipinfo|ip\.sb|ip\.fs\.kg/i,speed:/测速|测网速|延迟|吞吐|speedtest|speed test|fast\.com/i,dns:/域名解析|dns|whois|域名登记/i,security:/风险检测|钓鱼|恶意|证书|phishing|malware|ssl/i,privacy:/隐私|指纹|webrtc|泄漏|privacy|fingerprint/i,maps:/地图|地理|卫星|街景|map|satellite/i,travel:/旅行|交通|航班|火车|旅游|travel|transit|flight/i,assets:/素材|插画|字体|图标|stock image|illustration|font|icon/i,music:/音乐|音频|播客|music|audio|podcast/i,video:/视频|电影|影片|video|film/i,play:/游戏|休闲|解压|game|puzzle/i,data:/数据集|统计|数据库|数据可视化|dataset|statistics|database/i,science:/科学|科研|材料|化学|物理|工程|science|engineering/i,time:/时间|时钟|时区|日期|日历|计时|timezone|clock|calendar|timer/i,finance:/金融|经济|汇率|货币|财经|finance|economics|currency/i,books:/图书|电子书|书籍|阅读|library|ebook|books/i,news:/新闻|时事|报道|news|journalism/i,files:/文件格式|文件转换|压缩包|解压|file converter|archive|json/i,health:/健康|医学|公共卫生|医疗|health|medical/i
};
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


// Explicit unsupported PDF properties and QR reading operations must not
// fall through to an unrelated tool class. This guard makes no assertion
// about the ordinary lexical search or the actual capabilities of external sites.
// Match literals in the same Unicode form as normalized queries. In particular
// Thai SARA AM (U+0E33) expands to U+0E4D U+0E32 under NFKC.
const normalizedPatterns=patterns=>patterns.map(p=>new RegExp(p.source.normalize('NFKC'),p.flags));
const pdfObject=/\bpdfs?\b|पीडीएफ|পিডিএফ/iu;
const pdfUnsupported=normalizedPatterns([
 /password|passcode|digital signature|watermark|encrypted|encryption|decryption|without (?:uploading|internet)|never upload/iu,
 /密码|密碼|口令|加密|解密|水印|浮水印|数字签名|數位簽章|不上傳|不上传|離線|离线/u,
 /パスワード|暗号化|電子署名|透かし|アップロード(?:しない|せず)|비밀번호|암호|전자 서명|업로드 없이/u,
 /mot de passe|signature numérique|hors ligne|sans (?:envoi|téléversement)|passwort|kennwort|digitale signatur|ohne (?:upload|hochladen)|contraseña|firma digital|sin subir|nunca (?:suba|subir|envíe)|no (?:suba|envíe) datos|senha|assinatura digital|sem enviar|firma digitale|senza caricare/iu,
 /wachtwoord|zonder upload|zonder.{0,45}te uploaden|lösenord|utan att ladda upp|passord|uten at.{0,40}sendes|uten opplasting|adgangskode|uden upload|salasana|ilman lataamista|hasło|bez przesyłania|heslo|bez nahrávání|jelszó|parol[ăa]|fără încărcare/iu,
 /парол|цифровая подпись|без загрузки|лозинк|lozink[auieom]|geslo|κωδικό πρόσβασης|χωρίς μεταφόρτωση|şifre|parola|yüklemeden/iu,
 /كلمة المرور|توقيع رقمي|دون رفع|بدون رفع|סיסמה|חתימה דיגיטלית|رمز عبور|بدون بارگذاری|पासवर्ड|डिजिटल हस्ताक्षर|बिना अपलोड|পাসওয়ার্ড|পাসওয়ার্ড|پاس ورڈ|پاسورڈ/u,
 /รหัสผ่าน|ลายเซ็นดิจิทัล|ไม่อัปโหลด|mật khẩu|không tải lên|kata sandi|kata laluan|tanpa memuat naik|wagwoord|sonder oplaai/iu,
 /\b(?:repair|repairing|corrupted|damaged|reparar|reparieren|beschädigt\w*|endommagé\w*|réparer)\b|修复|修復|損壊|破損|손상|поврежд|إصلاح|تالف/iu,
 /sin enviar datos|sem enviar dados|ne jamais envoyer|never send (?:my |the )?data/iu
]);
const qrObject=/\bqr(?:[\s-]*code)?\b|\bqrcode\b|二维码|二維碼|qrコード|คิวอาร์โค้ด|क्यूआर कोड/iu;
const qrRead=normalizedPatterns([
 /\b(?:scan|scanning|scanner|decode|decoding|decoder|read|reading|reader)\b/iu,
 /扫描|掃描|识别|識別|解码|解碼|读取|讀取|讀出|读出|読み取|読取|スキャン|デコード|스캔|읽기|읽어|해독/u,
 /lire|lecture|décoder|scanner|auslesen|scannen|dekodieren|leer|decodificar|escanear|ler|digitalizar|leggere|decodificare|odczytać|skanować|číst|přečíst|декодир|считыва|прочита|сканир|okumak|tarama/iu,
 /قراءة|فك ترميز|مسح|לקרוא|סריקה|خواندن|اسکن|पढ़ना|स्कैन|ডিকোড|পড়তে|پڑھنا|اسکین|อ่านข้อมูล|สแกน|đọc|quét|membaca|memindai|imbas/iu
]);
function unsupportedProperties(raw){
 const q=multilingual.normalize(raw);
 return (pdfObject.test(q)&&pdfUnsupported.some(p=>p.test(q)))||
        (qrObject.test(q)&&qrRead.some(p=>p.test(q)));
}


// Tool-finding and learning about a technical object are different intents.
// Apply only object-scoped abstention; ordinary lexical search is unchanged.
const technicalExplanation=normalizedPatterns([
 /\b(?:why|what is|what are|how does|how do|explain|definition|theory|source code|tutorial|documentation|compare|comparison)\b/iu,
 /为什么|為什麼|是什么|是什麼|原理|教程|比较|比較|仕組み|とは何|なぜ|원리|비교|설명/u,
 /\b(?:pourquoi|expliquer|vergleich|warum|erklären|funktionsweise|explicar|por qué|explicação|perché|spiegare|waarom|uitleg|varför|hvorfor|hvordan|proč|dlaczego)\b/iu,
 /почему|принцип|объясн|сравнен|чому|كيف يعمل|لماذا|ما هو|شرح|क्या है|क्यों|कैसे काम|ทำงานอย่างไร|อธิบาย/u
]);
const dnsObject=/\bdns\b/iu,jsonObject=/\bjson\b/iu;
// Distinguish diagnostics from protocol explanation and configuration changes.
const dnsExplanation=normalizedPatterns([
 /\b(?:explain|why|what (?:is|are)|how (?:does|do)|wie funktioniert|warum|hvordan (?:virker|fungerer)|ako funguje|kako.{0,35}radi|explicar|comment fonctionne|pourquoi)\b/iu,
 /原理|是什么|是什麼|为什么|為什麼|仕組み|説明|なぜ|원리|설명|почему|как работает|كيف يعمل|شرح|ทำงานอย่างไร|อธิบาย/u
]);
const dnsMutation=normalizedPatterns([
 /\b(?:change|modify|update|configure|set|replace)\s+(?:(?:my|the|a|your)\s+)?(?:nameserver|name server|dns server|dns settings|dns configuration)s?\b/iu,
 /(?:修改|更改|设置|設定|切换|切換)(?:.{0,12})(?:dns服务器|dns伺服器|名称服务器|名稱伺服器)|(?:ネームサーバー|dnsサーバー).{0,12}(?:変更|設定)/iu
]);
const jsonConversion=normalizedPatterns([
 /\b(?:convert|transform)\b.{0,35}\bjson\b.{0,30}\b(?:to|into)\b|\bjson\b.{0,25}\b(?:to|into)\s+(?:csv|xml|yaml|xlsx|excel|another file format)\b/iu,
 /json.{0,18}(?:转换|轉換|转成|轉成|变成|變成).{0,20}(?:格式|csv|xml|yaml|excel)|json.{0,20}(?:変換).{0,20}(?:形式|csv|xml|yaml)/iu
]);
function technicalAbstention(raw){
 const q=multilingual.normalize(raw);
 if(unsupportedProperties(q))return true;
 if(dnsObject.test(q)&&(dnsExplanation.some(re=>re.test(q))||dnsMutation.some(re=>re.test(q))))return true;
 if(jsonObject.test(q)&&jsonConversion.some(re=>re.test(q)))return true;
 if(!(pdfObject.test(q)||qrObject.test(q)))return false;
 return technicalExplanation.some(re=>re.test(q));
}


// Full-query compositional grammar, not unrestricted keyword matching.
// Only reviewed action/object/argument combinations are accepted. No trailing
// text, arbitrary filenames, URLs, or unsupported constraints are discarded.
const structuredPatterns=normalizedPatterns([
 /^(?:i (?:want|need) to )?(?:combine|merge|join) (?:my |these |the )?(?:(?:two|three|four|five|several|[2-9]) )?pdfs?(?: files| documents)? into (?:one|a single) (?:pdf|file|document)$/iu,
 /^(?:i (?:want|need) to )?(?:split|divide|separate) (?:my |this |the )?pdf(?: file| document| report)? into (?:separate|individual) (?:pages|files)$/iu,
 /^(?:i (?:want|need) to )?(?:(?:reduce|shrink) (?:the )?file size of |compress )(?:my |this |the )?(?:jpeg|png|photo|image|picture)(?: file)?(?: for (?:email|sharing))?$/iu,
 /^(?:i (?:want|need) to )?(?:make|set) (?:(?:the )?background of (?:my |this |the )?(?:photo|image|picture)|(?:my |this |the )?(?:photo|image|picture) background) transparent$/iu,
 /^(?:i (?:want|need) to )?(?:check|see|find out) whether (?:my |the )?dns (?:change|update) (?:has|have) (?:spread|propagated) (?:worldwide|globally|to other countries)$/iu,
 /^(?:i (?:want|need) to )?(?:look up|check|find) (?:the )?(?:mx|txt|aaaa|cname|a) records? (?:of|for) (?:my |a |this |the )?domain$/iu,
 /^(?:i (?:want|need) to )?(?:test|check|validate) (?:whether|if) (?:my|this|the) (?:regex|regular expression) (?:matches|can match) (?:a string|text|sample text)$/iu,
 /^(?:我想|帮我|请帮我)?把(?:这|那)?(?:两|三|四|五|几|[2-9])份pdf(?:文件|文档)?(?:合成|拼成|合併|合并成)(?:一份|一个)(?:文件|文档|pdf)$/iu,
 /^(?:我想|帮我|请帮我)?把(?:这份|这个|该)?pdf(?:文件|文档)?(?:按页|逐页)(?:拆分|拆成|分成)(?:多个|单独的)(?:文件|文档)$/iu,
 /^(?:我想|帮我|请帮我)?把(?:这张|我的|这幅)?(?:照片|图片|图像)(?:的)?(?:文件体积|文件大小|容量)(?:压小|减小|缩小)(?:一点|一些)?$/u,
 /^(?:我想|帮我|请帮我)?把(?:这张|我的)?(?:照片|图片)(?:的)?背景(?:变成|设为)透明(?:的)?$/u,
 /^(?:我想|帮我|请帮我)?(?:看看|检查|确认)(?:我的|这个)?dns(?:变更|修改|更新)(?:在全球|在各地|在不同国家)(?:是否|有没有)生效$/iu,
 /^(?:我想|帮我|请帮我)?(?:查询|查看|查找)(?:我的|这个)?域名的(?:mx|txt|aaaa|cname|a)记录$/iu,
 /^(?:我想|帮我|请帮我)?(?:检查|测试|验证)(?:这段|我的)?正则表达式(?:是否|能否)(?:匹配|匹配到)(?:字符串|文本|测试文本)$/u
]);
const structuredIds=['pdf-merge','pdf-split','image-compress','image-background','dns-propagation','dns-lookup','regex-test','pdf-merge','pdf-split','image-compress','image-background','dns-propagation','dns-lookup','regex-test'];

// Additional reviewed full-query grammars; the language need not match UI locale.
// Each rule owns its intent ID to avoid positional coupling to other patterns.
const extraStructuredRules=[
 ['json-edit',/^(?:i (?:want|need) to )?(?:format|indent|pretty print) (?:my |this |the )?json(?: document| data| file)?(?: with indentation)?$/iu],
 ['json-edit',/^(?:我想|帮我|请帮我)?把(?:这段|我的|这个)?json(?:数据|文件)?(?:格式化并缩进|整理成缩进格式|重新格式化)$/iu],
 ['image-resize',/^(?:i (?:want|need) to )?(?:change|adjust) (?:the )?(?:pixel dimensions|width and height) of (?:my |this |the )?(?:photo|image|picture)$/iu],
 ['image-resize',/^(?:我想|帮我|请帮我)?调整(?:这张|我的)?(?:照片|图片|图像)(?:的)?(?:像素尺寸|宽度和高度)$/u],
 ['pdf-merge',/^(?:複数の|二つの|三つの)?pdf(?:ファイル)?を(?:一つ|ひとつ)の(?:ファイル|文書)に(?:まとめたい|結合したい)$/iu],
 ['pdf-split',/^pdf(?:ファイル)?を(?:ページごと|ページ単位)に(?:分割したい|分けたい)$/iu],
 ['image-compress',/^(?:写真|画像)(?:ファイル)?の(?:容量|ファイルサイズ)を(?:減らしたい|小さくしたい)(?:です)?$/u],
 ['image-background',/^(?:写真|画像)の背景を透明に(?:したい|するツールを探す)$/u],
 ['dns-lookup',/^(?:ドメイン|自分のドメイン)の(?:mx|txt|aaaa|cname|a)レコードを(?:調べたい|確認したい)$/iu],
 ['json-edit',/^json(?:データ|ファイル)?を(?:整形|インデント)したい$/iu],
 ['pdf-merge',/^pdf (?:파일|문서) (?:여러 개|두 개|세 개)를 하나로 (?:합치고|만들고) 싶어요$/iu],
 ['image-compress',/^(?:사진|이미지)(?: 파일)?의 용량을 줄여서 (?:보내고|공유하고) 싶어요$/u],
 ['image-background',/^(?:사진|이미지)의 배경을 투명하게 (?:바꾸고|만들고) 싶어요$/u],
 ['dns-lookup',/^(?:내 |이 )?도메인의 (?:mx|txt|aaaa|cname|a) 레코드를 (?:확인하고|조회하고) 싶어요$/iu],
 ['json-edit',/^json (?:데이터|파일)를 (?:정렬하고|포맷하고) 싶어요$/iu],
 ['pdf-merge',/^(?:unir|combinar|juntar) (?:mis |estos |varios )?(?:dos |tres |cuatro )?pdfs?(?: archivos)? en (?:un único|un solo) (?:archivo|documento|pdf)$/iu],
 ['image-compress',/^(?:reducir|disminuir) el tamaño del archivo de (?:mi|esta|una) (?:foto|imagen|fotografía)$/iu],
 ['image-background',/^(?:hacer|dejar) (?:el fondo de (?:mi|esta|una) (?:foto|imagen|fotografía)) transparente$/iu],
 ['dns-lookup',/^(?:consultar|buscar|comprobar) los registros (?:mx|txt|aaaa|cname|a) de (?:mi|este|un) dominio$/iu],
 ['json-edit',/^(?:formatear|organizar) (?:mi|este|un) (?:archivo|documento) json$/iu],
 ['pdf-merge',/^(?:assembler|fusionner|combiner) (?:(?:mes|ces|plusieurs) )?(?:(?:deux|trois|quatre) )?(?:fichiers )?pdfs? en un seul (?:fichier|document|pdf)$/iu],
 ['image-compress',/^(?:réduire|diminuer) la taille du fichier de (?:ma|cette|une) (?:photo|image)$/iu],
 ['image-background',/^rendre le fond de (?:ma|cette|une) (?:photo|image) transparent$/iu],
 ['dns-lookup',/^(?:consulter|vérifier) les enregistrements (?:mx|txt|aaaa|cname|a) de (?:mon|ce|un) domaine$/iu],
 ['json-edit',/^(?:formater|indenter) (?:mon|ce|un) fichier json$/iu],
 ['pdf-merge',/^(?:zwei|drei|vier|mehrere) pdf(?: dateien|-dateien| dokumente) zu (?:einer datei|einem dokument) (?:zusammenfügen|verbinden)$/iu],
 ['image-compress',/^die dateigröße (?:meines|dieses) (?:fotos|bildes) (?:verkleinern|reduzieren)$/iu],
 ['image-background',/^den hintergrund (?:meines|dieses) (?:fotos|bildes) transparent machen$/iu],
 ['dns-lookup',/^die (?:mx|txt|aaaa|cname|a)(?:-| )einträge (?:meiner|dieser) domain (?:abfragen|prüfen)$/iu],
 ['json-edit',/^(?:meine|diese) json(?:-| )datei (?:formatieren|einrücken)$/iu],
 ['image-compress',/^ลดขนาดไฟล์(?:รูปภาพ|ภาพถ่าย)(?:เพื่อส่งอีเมล|เพื่อแชร์)?$/u],
 ['image-background',/^ทำให้พื้นหลัง(?:รูปภาพ|ภาพถ่าย)โปร่งใส$/u],
 ['dns-lookup',/^ตรวจสอบระเบียน (?:mx|txt|aaaa|cname|a) ของโดเมน(?:ของฉัน)?$/iu]
].map(([id,re])=>[id,new RegExp(re.source.normalize('NFKC'),re.flags)]);

function structuredIntent(raw){
 const q=multilingual.normalize(raw);
 if(!q||q.length>160||constraints.test(q)||incompatible.test(q)||technicalAbstention(q)||compound(q)||multilingual.negated(q)||multilingual.hasConstraint(q))return null;
 const ids=new Set([...structuredPatterns.flatMap((re,i)=>re.test(q)?[structuredIds[i]]:[]),...extraStructuredRules.flatMap(([id,re])=>re.test(q)?[id]:[])]);
 if(ids.size!==1)return null;
 const id=[...ids][0];
 return multilingual.structuredCompatible(q,id)?id:null;
}

// Catalog-grounded video operations. Reuse the existing video class weights,
// but isolate operation cache keys and restrict results to tools whose official
// product documentation confirms all three editing operations.
// No additional model download or external query service.
const videoOperationIds=['video-trim','video-split','video-merge'];
const videoOperationRows=[["en","trim a video","split a video","merge videos"],["zh-Hans","把长视频剪短","分割视频","合并视频"],["zh-Hant","把長影片剪短","分割影片","合併影片"],["ja","長い動画を短くする","動画を分割する","動画を結合する"],["ko","긴 동영상 자르기","동영상 분할","동영상 합치기"],["fr","raccourcir une vidéo","diviser une vidéo","fusionner des vidéos"],["de","ein Video kürzen","ein Video teilen","Videos zusammenfügen"],["es","recortar un vídeo","dividir un vídeo","unir vídeos"],["pt","encurtar um vídeo","dividir um vídeo","juntar vídeos"],["it","accorciare un video","dividere un video","unire video"],["nl","een video inkorten","een video splitsen","video's samenvoegen"],["sv","korta ner en video","dela upp en video","sammanfoga videor"],["no","forkorte en video","dele opp en video","slå sammen videoer"],["da","forkorte en video","opdele en video","flette videoer"],["fi","lyhentää videota","jakaa video osiin","yhdistää videoita"],["pl","skrócić film","podzielić film","połączyć filmy"],["cs","zkrátit video","rozdělit video","spojit videa"],["sk","skrátiť video","rozdeliť video","spojiť videá"],["hu","videó rövidítése","videó felosztása","videók egyesítése"],["ro","scurtarea unui videoclip","împărțirea unui videoclip","unirea videoclipurilor"],["bg","съкращаване на видео","разделяне на видео","обединяване на видеа"],["hr","skratiti video","podijeliti video","spojiti videozapise"],["sr","skratiti snimak","podeliti video","spojiti video snimke"],["sl","skrajšati videoposnetek","razdeliti videoposnetek","združiti videoposnetke"],["el","συντόμευση βίντεο","διαχωρισμός βίντεο","ένωση βίντεο"],["ru","укоротить видео","разделить видео","объединить видео"],["uk","скоротити відео","розділити відео","об'єднати відео"],["tr","videoyu kısaltmak","videoyu bölmek","videoları birleştirmek"],["ar","تقصير فيديو","تقسيم فيديو","دمج مقاطع فيديو"],["he","לקצר סרטון","לפצל סרטון","לחבר סרטונים"],["fa","کوتاه کردن ویدیو","تقسیم ویدیو","ادغام ویدیوها"],["hi","वीडियो छोटा करना","वीडियो को भागों में बाँटना","वीडियो जोड़ना"],["bn","ভিডিও ছোট করা","ভিডিও ভাগ করা","ভিডিও জোড়া লাগানো"],["ur","ویڈیو مختصر کرنا","ویڈیو کو حصوں میں تقسیم کرنا","ویڈیوز جوڑنا"],["th","ตัดวิดีโอให้สั้นลง","แบ่งวิดีโอ","รวมวิดีโอ"],["vi","cắt ngắn video","chia video thành nhiều đoạn","ghép video"],["id","memendekkan video","membagi video","menggabungkan video"],["ms","memendekkan video","membahagikan video","menggabungkan video"],["fil","paikliin ang video","hatiin ang video","pagsamahin ang mga video"],["af","verkort 'n video","verdeel 'n video","voeg video's saam"]];
const videoOperationExtra=[["video-trim",["剪短视频","视频剪短","长视频剪短","长视频剪成短视频","长视频变短视频","截取视频片段","截取视频的一段","剪掉视频开头","剪掉视频结尾","视频时长缩短","缩短视频时长","视频裁剪","视频剪辑","影片剪輯","剪短影片","縮短影片時長","截取影片片段","cut a long video short","shorten a video","trim video","video trimmer","cut a clip from a video","trim the beginning of a video","trim the end of a video","動画を短く切る","動画のトリミング","동영상 자르기","영상 길이 줄이기","동영상 길이 줄이기"]],["video-split",["视频分段","把视频分成几段","将视频拆分成多段","拆分视频","视频切成几段","影片分段","split a long video into clips","split video into parts","video splitter","動画を複数に分割","동영상을 여러 부분으로 나누기"]],["video-merge",["把几个视频拼在一起","将多个视频合成一个","多个视频合并","拼接视频","视频拼接","合併多段影片","join videos","combine video clips","video merger","動画をつなげる","여러 동영상 합치기"]]];
const videoOperationIndex=new Map();
function addVideoOperation(q,id){const k=multilingual.normalize(q),old=videoOperationIndex.get(k);if(old&&old!==id)throw Error('video operation collision');videoOperationIndex.set(k,id);}
for(const [, ...qs] of videoOperationRows)qs.forEach((q,i)=>addVideoOperation(q,videoOperationIds[i]));
for(const [id,qs] of videoOperationExtra)for(const q of qs)addVideoOperation(q,id);
// Whole-query grammar, deliberately restricted to duration and clip operations.
// Do not strip conditions such as no watermark, no upload, size or AI automation.
const videoOperationPatterns=[
 ['video-trim',/^(?:我)?(?:想要?|希望|需要|可以)?(?:请|請)?(?:帮我|幫我)?(?:把|将|將)(?:这段|這段|这个|這個|一段|一个|一個)?(?:很|比较|比較)?(?:长|長)?(?:视频|影片|視頻)(?:剪短(?:一点|一點|一些)?|剪成(?:一个|一個)?短(?:视频|影片|視頻)|剪得(?:短一点|短一點|更短)|缩短(?:时长|時間)?|縮短(?:時長|時間)?|变短|變短|截取一段)(?:吗|嗎|吧)?$/u],
 ['video-trim',/^(?:我)?(?:想要?|希望|需要)?(?:请|請)?(?:帮我|幫我)?(?:剪掉|去掉|删除|刪除)(?:这段|這段|这个|這個)?(?:视频|影片|視頻)(?:的)?(?:开头|開頭|结尾|結尾|片头|片頭|片尾|前面|后面|後面)(?:一段)?$/u],
 ['video-split',/^(?:我)?(?:想要?|希望|需要)?(?:请|請)?(?:帮我|幫我)?(?:把|将|將)(?:这段|這段|长|長)?(?:视频|影片|視頻)(?:分割|拆分|切分|分|切|剪)(?:成)?(?:几|幾|多|两|兩|三|四|[2-9])段$/u],
 ['video-merge',/^(?:我)?(?:想要?|希望|需要)?(?:请|請)?(?:帮我|幫我)?(?:把|将|將)(?:多个|多個|几段|幾段|两段|兩段|三段|几個|几个)(?:视频|影片|視頻)(?:合并|合併|拼接|拼|接)(?:成一个|成一個|在一起|起来|起來)?$/u],
 ['video-trim',/^(?:i (?:want|need) to |please |help me )?(?:trim|shorten|cut down) (?:a |the |my |this )?(?:long )?video(?: a little| into a short clip)?$/i]
];
function videoOperation(raw){const q=multilingual.normalize(raw);if(!q||q.length>128||constraints.test(q)||incompatible.test(q)||technicalAbstention(q)||compound(q)||multilingual.hasConstraint(q)||multilingual.negated(q))return null;
 const direct=videoOperationIndex.get(q);if(direct)return direct;
 const ids=new Set(videoOperationPatterns.filter(([,re])=>re.test(q)).map(([id])=>id));return ids.size===1?[...ids][0]:null;
}
const videoTools=new Map([['https://www.veed.io/',2],['https://www.kapwing.com/',2],['https://shotcut.org/',0]]);
function videoTask(raw,model){const id=videoOperation(raw);if(!id)return null;const row=model.classes.find(x=>x[0]==='video');return row?{id,weightId:'video',weights:row[1],guard:/(?:VEED|Kapwing|Shotcut)/i,accept:item=>videoTools.has(item.url),priority:item=>videoTools.get(item.url)||0}:null;}

// Reviewed practical requests across photo editing and study. These are
// capability-scoped retrieval rules layered on existing model classes, not new weights.
const practicalOperations=[{"id":"photo-crop","weight":"image","urls":["https://www.photopea.com/"],"phrases":["裁剪照片","裁剪图片","把照片裁小","把照片边缘裁掉","裁掉照片四周","把图片裁成正方形","裁切圖片","crop a photo","crop an image","写真を切り抜く","사진 자르기","recadrer une photo","ein Foto zuschneiden","recortar una foto","recortar uma foto","обрезать фотографию","قص صورة","memotong foto"]},{"id":"photo-rotate","weight":"image","urls":["https://www.photopea.com/"],"phrases":["旋转照片","把照片转正","把照片旋转90度","把图片旋转一下","照片倒了怎么转正","把照片翻轉","rotate a photo","straighten a photo","rotate an image","写真を回転する","사진 회전","faire pivoter une photo","ein Foto drehen","girar una foto","girar uma foto","повернуть фотографию","تدوير صورة","memutar foto"]},{"id":"photo-format","weight":"image","urls":["https://squoosh.app/"],"phrases":["图片格式转换","转换图片格式","照片换格式","把png转成jpg","png转jpg","jpg转png","把jpg转成png","把图片转成webp","圖片格式轉換","convert an image format","convert png to jpg","convert jpg to png","convert an image to webp","画像形式を変換する","이미지 형식 변환","convertir le format d'une image","Bildformat umwandeln","convertir el formato de una imagen","converter formato de imagem","конвертировать формат изображения","تحويل صيغة صورة","mengubah format gambar"]},{"id":"study-courses","weight":"courses","urls":["https://www.khanacademy.org/","https://ocw.mit.edu/","https://www.open.edu/openlearn/","https://www.edx.org/","https://www.coursera.org/"],"phrases":["找在线课程","想找课程自学","想自学新知识","找学习网站","有什么网站可以学习","找网课学习","想学习新知识","線上自學課程","find online courses","find courses for self study","learn something new online","オンライン講座を探す","온라인 강좌 찾기","trouver des cours en ligne","Onlinekurse finden","buscar cursos en línea","encontrar cursos online","найти онлайн курсы","البحث عن دورات عبر الإنترنت","mencari kursus online"]},{"id":"study-textbooks","weight":"courses","urls":["https://openstax.org/","https://open.umn.edu/opentextbooks","https://www.libretexts.org/"],"phrases":["找教材","找开放教材","找电子版教材","在哪找大学教材","找大学自学教材","找學習用的教材","find textbooks","find open textbooks","find university textbooks","教科書を探す","교재 찾기","trouver des manuels scolaires","Lehrbücher finden","buscar libros de texto","encontrar livros didáticos","найти учебники","البحث عن كتب دراسية","mencari buku pelajaran"]},{"id":"study-papers","weight":"papers","urls":["https://scholar.google.com/","https://www.semanticscholar.org/","https://www.base-search.net/"],"phrases":["找论文","查学术论文","查找学术文献","去哪里找论文","在哪里查文献","查找研究论文","找論文","find research papers","search scholarly literature","find academic articles","論文を探す","학술 논문 찾기","trouver des articles scientifiques","wissenschaftliche Artikel finden","buscar artículos científicos","encontrar artigos científicos","найти научные статьи","البحث عن أوراق بحثية","mencari artikel ilmiah"]},{"id":"study-graph","weight":"science","urls":["https://www.desmos.com/calculator","https://www.geogebra.org/graphing"],"phrases":["画函数图像","绘制函数图像","想画函数曲线","画数学函数图","看函数图像","畫函數圖像","plot a function","graph a function","draw a function graph","関数のグラフを描く","함수 그래프 그리기","tracer une fonction","eine Funktion zeichnen","graficar una función","traçar o gráfico de uma função","построить график функции","رسم منحنى دالة","menggambar grafik fungsi"]},{"id":"study-english","weight":"courses","urls":["https://learnenglish.britishcouncil.org/","https://www.bbc.co.uk/learningenglish"],"phrases":["学习英语","自学英语","练习英语阅读","想练英语听力","提高英语阅读能力","练习英语语法","學習英語","learn English","practice English reading","practice English listening","英語を勉強する","영어 공부","apprendre l'anglais","Englisch lernen","aprender inglés","aprender inglês","изучать английский","تعلم الإنجليزية","belajar bahasa Inggris"]}];
const practicalIndex=new Map(),practicalById=new Map();
for(const row of practicalOperations){practicalById.set(row.id,row);for(const phrase of row.phrases){const q=multilingual.normalize(phrase),old=practicalIndex.get(q);if(old&&old!==row.id)throw Error('practical operation collision');practicalIndex.set(q,row.id);}}
const practicalPatterns=[
 ['photo-crop',/^(?:我)?(?:想要?|希望|需要)?(?:请|請)?(?:帮我|幫我)?(?:把|将|將)(?:这张|這張|一张|一張|我的)?(?:照片|图片|圖片)(?:裁剪|裁切|裁小|裁掉边缘|裁掉邊緣|裁成正方形)(?:一下|一点|一點)?$/u],
 ['photo-rotate',/^(?:我)?(?:想要?|希望|需要)?(?:请|請)?(?:帮我|幫我)?(?:把|将|將)(?:这张|這張|一张|一張|我的)?(?:照片|图片|圖片)(?:转正|轉正|旋转|旋轉)(?:一下|90度|180度|270度)?$/u],
 ['photo-format',/^(?:我)?(?:想要?|希望|需要)?(?:请|請)?(?:帮我|幫我)?(?:把|将|將)(?:图片|圖片|照片|png|jpe?g|webp)(?:转成|轉成|转换成|轉換成)(?:png|jpe?g|webp)(?:格式)?$/iu],
 ['study-courses',/^(?:我)?(?:想要?|希望|需要)?(?:找|寻找|尋找)(?:一些|几个|幾個)?(?:在线|線上|网上|網上)(?:学习|學習|自学|自學)?课程$/u],
 ['study-papers',/^(?:我)?(?:想要?|希望|需要)?(?:找|查|查找|搜索|检索|檢索)(?:一些|几篇|幾篇)?(?:学术|學術|研究)?(?:论文|論文|文献|文獻)$/u],
 ['study-graph',/^(?:我)?(?:想要?|希望|需要)?(?:请|請)?(?:帮我|幫我)?(?:画|畫|绘制|繪製)(?:一下)?(?:数学|數學)?(?:函数|函數)(?:图像|圖像|曲线|曲線|图形|圖形)$/u]
];
function practicalOperation(raw){const q=multilingual.normalize(raw);if(!q||q.length>128||constraints.test(q)||incompatible.test(q)||technicalAbstention(q)||compound(q)||multilingual.hasConstraint(q)||multilingual.negated(q))return null;const direct=practicalIndex.get(q);if(direct)return direct;const ids=new Set(practicalPatterns.filter(([,re])=>re.test(q)).map(([id])=>id));return ids.size===1?[...ids][0]:null;}
function practicalTask(q,model){const id=practicalOperation(q),entry=practicalById.get(id);if(!entry)return null;const row=model.classes.find(x=>x[0]===entry.weight);if(!row)return null;return {id,weightId:entry.weight,weights:row[1],guard:/.+/,accept:item=>entry.urls.includes(item.url)};}

function intent(q,model){
 if(multilingual.clarify(q))return null;
 if(!q||q.length>512||constraints.test(q)||incompatible.test(q)||technicalAbstention(q)||compound(q)||multilingual.negated(q))return null;
 const media=videoTask(q,model)||practicalTask(q,model);if(media)return media;
 // Do not broaden a conjunction between independently recognizable tasks to OR.
 const normalized=multilingual.normalize(q);
 for(const [, , ,join] of multilingual.negativeFrames){const sep=join.normalize('NFKC').toLowerCase();const at=normalized.indexOf(sep);if(at<=0)continue;const left=normalized.slice(0,at).trim(),right=normalized.slice(at+sep.length).trim();const a=multilingual.resolve(left).id||topics.resolve(left),b=multilingual.resolve(right).id||topics.resolve(right);if(a&&b&&a!==b)return null;}
 const direct=multilingual.resolve(q).id||topics.resolve(q)||structuredIntent(q);
 // Recognize only a reviewed single request wrapper around a unique correction.
 // All constraints are checked on the original query, never just its body.
 const bodies=direct?[]:topics.unwrapCandidates(q).filter(b=>multilingual.resolve(b).id||topics.resolve(b)||multilingual.recoverSwap(b)||structuredIntent(b));
 const ids=new Set(bodies.map(b=>multilingual.resolve(b).id||topics.resolve(b)||multilingual.recoverSwap(b)?.id||structuredIntent(b)));
 if(ids.size>1)return null;
 const body=bodies[0]||q;
 const alias=multilingual.resolve(body),grammar=alias.id?null:structuredIntent(body);
 if((alias.blocked&&!grammar)||multilingual.hasConstraint(multilingual.normalize(q)))return null;
 if(body.length<3&&!alias.id&&!topics.resolve(body))return null;
 const broad=!alias.id&&topics.resolve(body);
 if(broad){const row=model.classes.find(x=>x[0]===broad);return row&&evidence[broad]?{id:broad,guard:evidence[broad],weights:row[1],broad:true}:null;}
 const swap=alias.id?null:multilingual.recoverSwap(body);
 const rawMatches=alias.id?[]:rules.filter(([,p])=>p.test(q));
 // A typo correction cannot override a conflicting recognized operation.
 if(swap&&rawMatches.some(([id])=>id!==swap.id))return null;
 const structured=!alias.id&&!swap?grammar:null;
 if(structured&&rawMatches.some(([id])=>id!==structured))return null;
 const matches=alias.id||swap||structured?rules.filter(([id])=>id===(alias.id||swap?.id||structured)):rawMatches;
 if(matches.length>1)return null;
 if(!matches.length)return {fallback:true};
 const [id,,guard]=matches[0];
 const row=model.classes.find(x=>x[0]===id);
 return row?{id,guard,weights:row[1]}:null;
}
function rankedCandidates(items,features,task,docFeatures,unicode=null,unicodeDoc=null){
 const weights=new Map(task.weights),ranked=new Map(),original=new Map();
 for(const item of items){
  if(!item?.url||!task.guard.test([item.name,item.description].join(' '))||(task.accept&&!task.accept(item)))continue;
  let score=0;for(const [k,v] of docFeatures(item))score+=v*(weights.get(k)||0)/4096;
  original.set(item.url,Math.max(score,original.get(item.url)||0));
  if(unicode&&unicodeDoc)score=.9*score+.1*unicode.score(task.weightId||task.id,unicodeDoc(item));
  if(task.priority)score+=task.priority(item);
  ranked.set(item.url,Math.max(score,ranked.get(item.url)||0));
 }
 const ordered=m=>[...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(x=>x[0]);
 const fused=ordered(ranked);
 if(unicode&&task.broad){const head=ordered(original).slice(0,5),seen=new Set(head);return head.concat(fused.filter(u=>!seen.has(u))).slice(0,12);}
 return fused.slice(0,12);
}
function candidate(query,items,model,features,baseline){
 const q=String(query||'').normalize('NFKC').trim(),task=intent(q,model);
 if(!task)return [];
 if(task.fallback)return [...baseline.rank(q,items).keys()];
 return rankedCandidates(items,features,task,item=>features([item.name,item.description].join(' ')));
}
// A worker owns an immutable snapshot. Exact task rankings depend only on the
// verified model and catalog, not on query spelling. Cache only those rankings.
function createSession(items,model,features,baseline,unicode=null){
 const snapshot=items.map(x=>Object.freeze({...x})),cache=new Map(),docCache=new WeakMap(),unicodeCache=new WeakMap();
 let computed=0,hits=0,featureCalls=0;
 function docFeatures(item){
  if(!docCache.has(item)){docCache.set(item,features([item.name,item.description].join(' ')));featureCalls++;}
  return docCache.get(item);
 }
 function unicodeDoc(item){if(!unicodeCache.has(item))unicodeCache.set(item,unicode.features([item.name,item.description].join(' ')));return unicodeCache.get(item);}
 function rank(query){
  const q=String(query||'').normalize('NFKC').trim(),task=intent(q,model);
  if(!task)return [];
  if(task.fallback)return [...baseline.rank(q,snapshot).keys()];
  if(cache.has(task.id)){hits++;return cache.get(task.id).slice();}
  const urls=rankedCandidates(snapshot,features,task,docFeatures,unicode,unicodeDoc);
  cache.set(task.id,Object.freeze(urls));computed++;return urls.slice();
 }
 // Suggestions are deliberately separate from rank(). The caller must obtain
 // explicit user selection; unresolved constraints and empty catalog evidence veto.
 function suggest(query){
  const q=String(query||'').normalize('NFKC').trim();
  const task=intent(q,model);
  if(!task?.fallback)return [];
  const repair=multilingual.suggestOperation(q);
  if(!repair||rank(q).length||!rank(repair.phrase).length)return [];
  return [{id:repair.id,phrase:repair.phrase}];
 }
 return Object.freeze({rank,suggest,stats(){return {computed,hits,featureCalls,cachedIntents:cache.size};}});
}

const api=Object.freeze({practicalOperation,practicalOperations:Object.freeze(practicalOperations.map(x=>Object.freeze({...x,urls:Object.freeze(x.urls),phrases:Object.freeze(x.phrases)}))),videoOperation,videoOperationRows:Object.freeze(videoOperationRows.map(Object.freeze)),candidate,classify,compound,unsupportedProperties,technicalAbstention,structuredIntent,createSession});
if(typeof module==="object"&&module.exports)module.exports=api;else root.AVENQIR_RESEARCH_RETRIEVAL=api;
})(typeof self!=="undefined"?self:globalThis);
