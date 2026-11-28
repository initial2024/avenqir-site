"use strict";
const assert=require("node:assert/strict");
const fine=require("../research/atlas-multilingual-intents.js"),topics=require("../research/atlas-multilingual-topics.js"),uni=require("../research/atlas-unicode-runtime.js"),codec=require("../research/atlas-model-codec.js"),bundle=require("../research/atlas-semantic-bundle-v2.json");
const domain=codec.deserialize(JSON.stringify(bundle.domain)),u=uni.create(codec.deserialize(JSON.stringify(bundle.unicode)),domain.classes.map(x=>x[0]));

function create(fine,topics,unicode,u){
 const references=[];for(let i=0;i<fine.rows.length;i++)for(const [pack,row] of [[fine,fine.rows[i]],[topics,topics.rows[i]]])for(let j=0;j<pack.tasks.length;j++)references.push({id:pack.tasks[j],locale:row[0],v:unicode.unicodeFeatures(row[j+1])});
 function rank(q,locale){
  const f=unicode.unicodeFeatures(q),scores=new Map(),local=new Map();for(const r of references){let v=0;for(const [k,w] of f)v+=w*(r.v.get(k)||0);scores.set(r.id,Math.max(v,scores.get(r.id)||0));if(r.locale===locale)local.set(r.id,Math.max(v,local.get(r.id)||0));}
  const p=new Map(u.classify(q).map(x=>[x.id,x.score]));return [...scores].map(([id,global])=>({id,global,local:local.get(id)||0,prototype:p.get(id)||0})).map(x=>({...x,score:.55*x.local+.35*x.global+.10*x.prototype})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 }
 return {rank};
}

const challenge=[
  [
    "en",
    "What is the definition of this unfamiliar word?",
    "word-dictionary"
  ],
  [
    "zh-Hans",
    "我想测试一下这段正则表达式能不能匹配",
    "regex-test"
  ],
  [
    "zh-Hant",
    "想知道一個網址是不是釣魚網站",
    "url-risk"
  ],
  [
    "ja",
    "画像を軽くしてファイル容量を減らしたい",
    "image-compress"
  ],
  [
    "ko",
    "두 나라의 시간을 비교해서 회의 시간을 정하고 싶어요",
    "meeting-zone"
  ],
  [
    "fr",
    "Créer un code QR pour partager mon site",
    "qr-create"
  ],
  [
    "de",
    "Ein JSON-Dokument bearbeiten und formatieren",
    "json-edit"
  ],
  [
    "es",
    "Cambiar las dimensiones de una fotografía",
    "image-resize"
  ],
  [
    "pt",
    "Quero verificar o certificado SSL de um site",
    "tls-check"
  ],
  [
    "it",
    "Cerco un programma per costruire un diagramma di flusso",
    "flowchart"
  ],
  [
    "nl",
    "Ik wil de achtergrond van een foto weghalen",
    "image-background"
  ],
  [
    "sv",
    "Jag behöver en nedräkning för mina studier",
    "timer"
  ],
  [
    "no",
    "Jeg vil øve på å skrive raskt på tastaturet",
    "typing"
  ],
  [
    "da",
    "Jeg vil finde en god kombination af farver til mit design",
    "palette"
  ],
  [
    "fi",
    "Haluan tarkistaa verkkotunnuksen omistajan WHOIS-palvelulla",
    "whois"
  ],
  [
    "pl",
    "Chcę sprawdzić mój adres IP",
    "ip-lookup"
  ],
  [
    "cs",
    "Potřebuji zjistit rychlost svého internetového připojení",
    "network-speed"
  ],
  [
    "sk",
    "Chcem overiť správnosť kódu HTML",
    "html-validate"
  ],
  [
    "hu",
    "Ellenőrizni szeretném a CSS kódomat",
    "css-validate"
  ],
  [
    "ro",
    "Am nevoie de o referință bibliografică pentru un articol",
    "citation"
  ],
  [
    "bg",
    "Искам да намеря статия по нейния DOI",
    "doi-lookup"
  ],
  [
    "hr",
    "Želim prevesti ovaj odlomak na drugi jezik",
    "text-translate"
  ],
  [
    "sr",
    "Tražim elektronske knjige u javnom domenu",
    "public-books"
  ],
  [
    "sl",
    "Želim preveriti prstni odtis svojega brskalnika",
    "fingerprint"
  ],
  [
    "el",
    "Θέλω να δημοσιεύσω μια στατική ιστοσελίδα",
    "static-host"
  ],
  [
    "ru",
    "Нужно уменьшить размер файла PDF",
    "pdf-compress"
  ],
  [
    "uk",
    "Потрібно розділити документ PDF на кілька частин",
    "pdf-split"
  ],
  [
    "tr",
    "PDF dosyasını açıp önizlemek istiyorum",
    "pdf-view"
  ],
  [
    "ar",
    "أريد تحويل مبلغ من عملة إلى عملة أخرى",
    "currency"
  ],
  [
    "he",
    "אני רוצה לחבר כמה תמונות לקולאז׳",
    "image-collage"
  ],
  [
    "fa",
    "می خواهم ببینم تغییرات DNS در سراسر جهان منتشر شده اند یا نه",
    "dns-propagation"
  ],
  [
    "hi",
    "देखना है कि ब्राउज़र से WebRTC के जरिए IP लीक हो रहा है या नहीं",
    "webrtc"
  ],
  [
    "bn",
    "শিরোনাম আর মূল লেখার জন্য মানানসই ফন্ট খুঁজছি",
    "font-pair"
  ],
  [
    "ur",
    "ڈومین کا DNS ریکارڈ معلوم کرنا ہے",
    "dns-lookup"
  ],
  [
    "th",
    "อยากอ่านบทความวิจัยทางวิทยาศาสตร์",
    "papers"
  ],
  [
    "vi",
    "Tìm các khóa học trực tuyến để tự học",
    "courses"
  ],
  [
    "id",
    "Saya mencari kumpulan data terbuka untuk penelitian",
    "data"
  ],
  [
    "ms",
    "Saya mencari peta untuk melihat lokasi bandar",
    "maps"
  ],
  [
    "fil",
    "Naghahanap ako ng mga template para sa presentasyon",
    "slides"
  ],
  [
    "af",
    "Ek soek aanlyn speletjies om te speel",
    "play"
  ]
];
const dev=[
  [
    "en",
    "I need a way to join several PDF documents into one",
    "pdf-merge",
    "Find a tool that checks whether my browser leaks WebRTC addresses",
    "webrtc"
  ],
  [
    "zh-Hans",
    "几张照片想排在一张图里",
    "image-collage",
    "看看域名解析是否已经在各地生效",
    "dns-propagation"
  ],
  [
    "zh-Hant",
    "想把好幾份PDF合成一份",
    "pdf-merge",
    "找工具檢查網站載入效能",
    "web-performance"
  ],
  [
    "ja",
    "複数のPDFをひとつにまとめたい",
    "pdf-merge",
    "文字の書体を組み合わせたい",
    "font-pair"
  ],
  [
    "ko",
    "여러 PDF 문서를 하나로 합치고 싶어요",
    "pdf-merge",
    "웹페이지의 로딩 속도를 확인하고 싶어요",
    "web-performance"
  ],
  [
    "fr",
    "Je voudrais réunir plusieurs documents PDF en un seul",
    "pdf-merge",
    "Un outil pour connaître le sens d'un mot",
    "word-dictionary"
  ],
  [
    "de",
    "Mehrere PDF-Dokumente zu einer Datei verbinden",
    "pdf-merge",
    "Die Ladezeit meiner Webseite messen",
    "web-performance"
  ],
  [
    "es",
    "Quiero unir varios documentos PDF en uno",
    "pdf-merge",
    "Necesito saber si el enlace es peligroso",
    "url-risk"
  ],
  [
    "pt",
    "Quero juntar vários documentos PDF num só",
    "pdf-merge",
    "Medir quanto tempo uma página demora a carregar",
    "web-performance"
  ],
  [
    "it",
    "Vorrei riunire più documenti PDF in uno",
    "pdf-merge",
    "Trovare il significato di una parola",
    "word-dictionary"
  ],
  [
    "nl",
    "Ik wil verschillende PDF-documenten tot één bestand samenvoegen",
    "pdf-merge",
    "Nagaan hoe snel mijn webpagina laadt",
    "web-performance"
  ],
  [
    "sv",
    "Jag vill slå ihop flera PDF-dokument till ett",
    "pdf-merge",
    "Mäta hur snabbt min webbsida laddar",
    "web-performance"
  ],
  [
    "no",
    "Jeg vil slå sammen flere PDF-dokumenter til ett",
    "pdf-merge",
    "Finne ut hvor raskt nettsiden lastes",
    "web-performance"
  ],
  [
    "da",
    "Jeg vil samle flere PDF-dokumenter i ét",
    "pdf-merge",
    "Find ud af hvor hurtigt min hjemmeside indlæses",
    "web-performance"
  ],
  [
    "fi",
    "Haluan yhdistää useita PDF-dokumentteja yhdeksi",
    "pdf-merge",
    "Selvitä kuinka nopeasti verkkosivu latautuu",
    "web-performance"
  ],
  [
    "pl",
    "Chcę scalić kilka dokumentów PDF w jeden",
    "pdf-merge",
    "Sprawdzić jak szybko ładuje się strona",
    "web-performance"
  ],
  [
    "cs",
    "Chci spojit několik PDF dokumentů do jednoho",
    "pdf-merge",
    "Zjistit jak rychle se načítá webová stránka",
    "web-performance"
  ],
  [
    "sk",
    "Chcem spojiť niekoľko dokumentov PDF do jedného",
    "pdf-merge",
    "Zistiť ako rýchlo sa načíta webová stránka",
    "web-performance"
  ],
  [
    "hu",
    "Több PDF-dokumentumot szeretnék egyetlen fájlba egyesíteni",
    "pdf-merge",
    "Mérni szeretném a weboldalam betöltési idejét",
    "web-performance"
  ],
  [
    "ro",
    "Vreau să unesc mai multe documente PDF într-unul singur",
    "pdf-merge",
    "Află cât durează încărcarea paginii mele web",
    "web-performance"
  ],
  [
    "bg",
    "Искам да събера няколко PDF документа в един",
    "pdf-merge",
    "Измери колко бързо се зарежда страницата ми",
    "web-performance"
  ],
  [
    "hr",
    "Želim spojiti nekoliko PDF dokumenata u jedan",
    "pdf-merge",
    "Izmjeriti koliko se brzo učitava web stranica",
    "web-performance"
  ],
  [
    "sr",
    "Želim da spojim nekoliko PDF dokumenata u jedan",
    "pdf-merge",
    "Izmeriti koliko brzo se učitava veb stranica",
    "web-performance"
  ],
  [
    "sl",
    "Rad bi združil več dokumentov PDF v enega",
    "pdf-merge",
    "Izmeriti kako hitro se naloži spletna stran",
    "web-performance"
  ],
  [
    "el",
    "Θέλω να ενώσω πολλά έγγραφα PDF σε ένα",
    "pdf-merge",
    "Να μάθω πόσο γρήγορα φορτώνει η ιστοσελίδα μου",
    "web-performance"
  ],
  [
    "ru",
    "Хочу собрать несколько документов PDF в один",
    "pdf-merge",
    "Измерить время загрузки моего сайта",
    "web-performance"
  ],
  [
    "uk",
    "Хочу об'єднати кілька документів PDF в один",
    "pdf-merge",
    "Виміряти час завантаження мого сайту",
    "web-performance"
  ],
  [
    "tr",
    "Birden fazla PDF belgesini tek dosyada toplamak istiyorum",
    "pdf-merge",
    "Web sayfamın ne kadar hızlı yüklendiğini ölçmek istiyorum",
    "web-performance"
  ],
  [
    "ar",
    "أريد جمع عدة مستندات PDF في ملف واحد",
    "pdf-merge",
    "أريد معرفة سرعة تحميل موقعي",
    "web-performance"
  ],
  [
    "he",
    "אני רוצה לאחד כמה מסמכי PDF לקובץ אחד",
    "pdf-merge",
    "למדוד כמה זמן לוקח לאתר שלי להיטען",
    "web-performance"
  ],
  [
    "fa",
    "می خواهم چند سند PDF را در یک فایل جمع کنم",
    "pdf-merge",
    "اندازه گیری زمان بارگیری وب سایتم",
    "web-performance"
  ],
  [
    "hi",
    "कई PDF दस्तावेज़ों को एक फ़ाइल में जोड़ना है",
    "pdf-merge",
    "मेरी वेबसाइट कितनी जल्दी खुलती है यह जांचना है",
    "web-performance"
  ],
  [
    "bn",
    "কয়েকটি PDF নথি একটি ফাইলে একত্র করতে চাই",
    "pdf-merge",
    "আমার ওয়েবসাইট লোড হতে কত সময় লাগে",
    "web-performance"
  ],
  [
    "ur",
    "کئی PDF دستاویزات کو ایک فائل میں ملانا ہے",
    "pdf-merge",
    "میری ویب سائٹ کتنی جلد کھلتی ہے یہ جانچنا ہے",
    "web-performance"
  ],
  [
    "th",
    "อยากรวมเอกสาร PDF หลายฉบับเป็นไฟล์เดียว",
    "pdf-merge",
    "อยากวัดว่าหน้าเว็บไซต์โหลดเร็วแค่ไหน",
    "web-performance"
  ],
  [
    "vi",
    "Tôi muốn nối nhiều tài liệu PDF thành một tệp",
    "pdf-merge",
    "Đo xem trang web của tôi tải nhanh đến mức nào",
    "web-performance"
  ],
  [
    "id",
    "Saya ingin menggabungkan beberapa dokumen PDF menjadi satu",
    "pdf-merge",
    "Ukur berapa lama halaman web saya dimuat",
    "web-performance"
  ],
  [
    "ms",
    "Saya mahu menyatukan beberapa dokumen PDF menjadi satu fail",
    "pdf-merge",
    "Ukur masa laman web saya dimuatkan",
    "web-performance"
  ],
  [
    "fil",
    "Gusto kong pagsamahin ang ilang PDF document sa isang file",
    "pdf-merge",
    "Sukatin kung gaano kabilis mag-load ang website ko",
    "web-performance"
  ],
  [
    "af",
    "Ek wil verskeie PDF-dokumente in een lêer saamvoeg",
    "pdf-merge",
    "Meet hoe vinnig my webblad laai",
    "web-performance"
  ]
];
const engine=create(fine,topics,uni,u);
const evaluate=rows=>{let total=0,top1=0,top5=0,bins=[.35,.45,.55,.65].map(t=>({t,n:0,correct:0}));for(const [loc,...cases] of rows)for(let i=0;i<cases.length;i+=2){const [q,id]=cases.slice(i,i+2),r=engine.rank(q,loc);total++;top1+=+(r[0]?.id===id);top5+=+r.slice(0,5).some(x=>x.id===id);for(const b of bins)if(r[0]?.score>=b.t&&r[0].score-(r[1]?.score||0)>=.08){b.n++;b.correct+=+(r[0].id===id)}}return {total,top1,top5,bins};};
const exact=new Set(fine.rows.concat(topics.rows).flatMap(r=>r.slice(1)).map(fine.normalize));
assert.equal(challenge.length,40);assert.deepEqual(challenge.map(x=>x[0]),fine.locales);for(const [locale,q,id] of challenge){assert.ok(!exact.has(fine.normalize(q)));assert.ok(domain.classes.some(x=>x[0]===id));}
console.log("LOCALE_FUSION_EXPERIMENT",JSON.stringify({dev:evaluate(dev),challenge:evaluate(challenge)}));


function assess(engine,fine,dev,challenge){
 const groups={correctLocale:[],wrongLocale:[],unknownLocale:[],mixed:[],negative:[]};
 for(const row of dev.concat(challenge)){const [loc,...cases]=row;for(let i=0;i<cases.length;i+=2){const q=cases[i],id=cases[i+1];groups.correctLocale.push([q,loc,id]);groups.wrongLocale.push([q,loc==='en'?'ja':'en',id]);groups.unknownLocale.push([q,null,id]);}}
 for(let i=0;i<fine.rows.length;i++){const [loc,...p]=fine.rows[i],j=(i*7)%fine.tasks.length;groups.mixed.push([p[j]+' '+fine.rows[0][j+1],loc,fine.tasks[j]]);const [_,prefix,suffix,join]=fine.negativeFrames[i];groups.negative.push([prefix+p[j]+suffix,loc,null],[p[j]+' '+fine.localeConstraints[i][1],loc,null],[p[j]+join+p[(j+1)%fine.tasks.length],loc,null]);}
 groups.negative.push(...['PDF printer driver installation','why does my browser crash','how do I fix my broken keyboard','does my doctor need a referral','buy a replacement bicycle chain','PDF password removal tutorial','my account has been stolen','QR code scanner not generator','DNS record format documentation','photo collage without upload','where can I buy a new phone','weather next week','my computer is infected','random gibberish zqxyq','PDF 合并不要推荐','translate this sentence without sending data'].map(q=>[q,'en',null]));
 const report={};for(const [key,rows] of Object.entries(groups)){let top1=0,top5=0,accepted=0,correct=0;for(const [q,loc,id] of rows){const r=engine.rank(q,loc);if(id){top1+=+(r[0]?.id===id);top5+=+r.slice(0,5).some(x=>x.id===id);}if(r[0]?.score>=.35&&r[0].score-(r[1]?.score||0)>=.08){accepted++;correct+=+(r[0].id===id);}}report[key]={n:rows.length,top1,top5,accepted,correct};}return report;
}

const robustness=assess(engine,fine,dev,challenge);assert.equal(robustness.correctLocale.n,120);assert.equal(robustness.negative.n,136);console.log('LOCALE_ROBUSTNESS_REPORT',JSON.stringify(robustness));

const augmentation=require('../research/atlas-paraphrase-augmentation.cjs');
const evalPhrases=new Set(dev.concat(challenge).flatMap(r=>r.slice(1).filter((_,i)=>i%2===0)).map(fine.normalize));
let addedCount=0;
for(const [locale,...qs] of augmentation.rows)for(const q of qs)if(q){assert.ok(!exact.has(fine.normalize(q)));assert.ok(!evalPhrases.has(fine.normalize(q)));addedCount++;}
const expanded={...fine,tasks:fine.tasks.concat(augmentation.tasks),rows:fine.rows.map((r,i)=>{assert.equal(r[0],augmentation.rows[i][0]);return r.concat(augmentation.rows[i].slice(1));})};
const augmented=assess(create(expanded,topics,uni,u),fine,dev,challenge);
console.log('AUGMENTED_REFERENCE_REPORT',JSON.stringify({addedCount,...augmented}));


// Shadow-only selective classification. Calibrate on dev positives and generated
// dev negatives, freeze the threshold, then report held-out positives and novel
// multilingual out-of-scope probes. Never make these scores a release decision.
const shadowEngine=create(expanded,topics,uni,u);
const shadowDev=dev.flatMap(([locale,...cases])=>cases.flatMap((q,i)=>i%2?[]:[{q,locale,expected:cases[i+1]}]));
const devNegatives=fine.rows.flatMap(([locale,...phrases],i)=>{
 const q=phrases[(i*11)%fine.tasks.length],next=phrases[(i*11+1)%fine.tasks.length];
 const [,prefix,suffix,join]=fine.negativeFrames[i];
 return [{q:prefix+q+suffix,locale,expected:null},{q:q+' '+fine.localeConstraints[i][2],locale,expected:null},{q:q+join+next,locale,expected:null}];
});
const novelNegatives=[
 ["en","My screen cracked; where can I get it repaired?"],
 ["zh-Hans","怎么给自行车换刹车片"],
 ["zh-Hant","電鍋一直跳起來該怎麼辦"],
 ["ja","自転車のパンクを修理したい"],
 ["ko","오늘 저녁에 먹을 반찬을 추천해 주세요"],
 ["fr","Comment changer une roue de voiture crevée ?"],
 ["de","Wo kann ich meinen defekten Wasserkocher reparieren lassen?"],
 ["es","¿Cómo limpio una mancha de café de mi camisa?"],
 ["pt","Como trocar a corrente de uma bicicleta?"],
 ["it","Come riparare un rubinetto che perde?"],
 ["nl","Hoe verwijder ik een vlek uit mijn jas?"],
 ["sv","Hur lagar jag ett trasigt cykeldäck?"],
 ["no","Hvordan bytter jeg en ødelagt lyspære?"],
 ["da","Hvordan reparerer jeg en utæt vandhane?"],
 ["fi","Miten vaihdan polkupyörän renkaan?"],
 ["pl","Jak naprawić cieknący kran?"],
 ["cs","Jak opravit prasklou podrážku boty?"],
 ["sk","Ako vymeniť pokazenú žiarovku?"],
 ["hu","Hogyan javítsam meg a csöpögő csapot?"],
 ["ro","Cum repar o ușă care scârțâie?"],
 ["bg","Как да поправя спукана гума на велосипед?"],
 ["hr","Kako popraviti slavinu koja curi?"],
 ["sr","Kako da zamenim pokvarenu sijalicu?"],
 ["sl","Kako popravim pipo, ki pušča?"],
 ["el","Πώς να επισκευάσω ένα ποδήλατο με σκασμένο λάστιχο;"],
 ["ru","Как починить протекающий кран на кухне?"],
 ["uk","Як відремонтувати зламану блискавку на куртці?"],
 ["tr","Damlayan musluğu nasıl tamir ederim?"],
 ["ar","كيف أصلح إطار دراجة مثقوبا؟"],
 ["he","איך מתקנים ברז מטפטף במטבח?"],
 ["fa","چگونه شیر آب چکه کننده را تعمیر کنم؟"],
 ["hi","साइकिल के पंक्चर टायर को कैसे ठीक करूं?"],
 ["bn","সাইকেলের চাকা ফুটো হলে কীভাবে সারাব?"],
 ["ur","ٹپکتے ہوئے نل کو کیسے ٹھیک کروں؟"],
 ["th","ซ่อมก๊อกน้ำที่รั่วอย่างไร"],
 ["vi","Làm sao sửa vòi nước bị rò rỉ?"],
 ["id","Bagaimana memperbaiki keran air yang bocor?"],
 ["ms","Bagaimana membaiki tayar basikal yang pancit?"],
 ["fil","Paano ayusin ang tumutulong gripo?"],
 ["af","Hoe herstel ek 'n lekkende kraan?"]
].map(([locale,q])=>({locale,q,expected:null}));
assert.equal(novelNegatives.length,40);
assert.deepEqual(novelNegatives.map(x=>x.locale),fine.locales);

// Hard negatives deliberately share words with supported tool intents but ask
// for a different operation or an unverified property. They are not training data.
const nearDomainNegatives=[
 ["en","Extract the hidden password from an encrypted PDF document"],
 ["zh-Hans","把照片里的二维码识别出来并读取内容"],
 ["zh-Hant","找一款完全不需網路且不上傳圖片的去背程式"],
 ["ja","QRコードの画像を読み取って中のURLを調べたい"],
 ["ko","암호를 잊어버린 PDF 파일의 잠금을 해제하고 싶어요"],
 ["fr","Je veux lire le contenu d’un code QR déjà imprimé"],
 ["de","Wie funktioniert das DNS-Protokoll auf Paketebene?"],
 ["es","Busco una herramienta para comprimir PDF que nunca suba datos"],
 ["pt","Quero recuperar a senha esquecida de um documento PDF"],
 ["it","Leggere un codice QR già stampato su un foglio"],
 ["nl","Een PDF verkleinen zonder het bestand te uploaden"],
 ["sv","Jag vill läsa av en befintlig QR-kod med kameran"],
 ["no","Komprimere PDF uten at filen sendes til en server"],
 ["da","Hvordan virker DNS-protokollen teknisk?"],
 ["fi","Haluan lukea jo tulostetun QR-koodin sisällön"],
 ["pl","Chcę odczytać kod QR z wydrukowanej kartki"],
 ["cs","Chci obnovit zapomenuté heslo souboru PDF"],
 ["sk","Ako funguje protokol DNS na úrovni paketov?"],
 ["hu","Egy már kinyomtatott QR-kód tartalmát szeretném beolvasni"],
 ["ro","Vreau să recuperez parola uitată a unui PDF"],
 ["bg","Искам да прочета вече отпечатан QR код"],
 ["hr","Želim vratiti zaboravljenu lozinku PDF dokumenta"],
 ["sr","Kako DNS protokol radi na nivou paketa?"],
 ["sl","Želim prebrati vsebino že natisnjene kode QR"],
 ["el","Θέλω να διαβάσω έναν ήδη τυπωμένο κωδικό QR"],
 ["ru","Хочу восстановить забытый пароль от документа PDF"],
 ["uk","Хочу зчитати вже надрукований QR-код"],
 ["tr","Şifresini unuttuğum PDF dosyasının parolasını kurtarmak istiyorum"],
 ["ar","أريد قراءة محتوى رمز QR مطبوع على الورق"],
 ["he","אני רוצה לשחזר סיסמה שנשכחה לקובץ PDF"],
 ["fa","می خواهم محتوای یک کد QR چاپ شده را بخوانم"],
 ["hi","पहले से छपे हुए QR कोड को स्कैन करके पढ़ना है"],
 ["bn","পিডিএফ ফাইলের ভুলে যাওয়া পাসওয়ার্ড উদ্ধার করতে চাই"],
 ["ur","پہلے سے چھپے ہوئے QR کوڈ کا مواد پڑھنا ہے"],
 ["th","อยากกู้รหัสผ่านไฟล์ PDF ที่ลืมไปแล้ว"],
 ["vi","Tôi muốn đọc nội dung mã QR đã in trên giấy"],
 ["id","Saya ingin memulihkan kata sandi PDF yang terlupa"],
 ["ms","Saya mahu membaca kandungan kod QR yang sudah dicetak"],
 ["fil","Gusto kong basahin ang laman ng QR code na naka-print na"],
 ["af","Ek wil die vergete wagwoord van 'n PDF herstel"]
].map(([locale,q])=>({locale,q,expected:null}));
assert.deepEqual(nearDomainNegatives.map(x=>x.locale),fine.locales);

const shadowTest=challenge.map(([locale,q,expected])=>({locale,q,expected})).concat(novelNegatives,nearDomainNegatives);
const devKeys=new Set(shadowDev.concat(devNegatives).map(x=>fine.normalize(x.q)));
for(const x of shadowTest)assert.ok(!devKeys.has(fine.normalize(x.q))&&!exact.has(fine.normalize(x.q)),x.q);
// Deterministic guard applied BEFORE scores, independently of the UI locale.
// Exact multilingual constraint/negation checks are shared with retrieval.
// Split only on reviewed conjunctions and require two distinct known intents;
// do not treat every occurrence of a conjunction as a compound request.
function shadowBlock(raw){
 const q=fine.normalize(raw);
 if(!q||q.length>512||fine.hasConstraint(q)||fine.negated(q)||fine.resolve(q).blocked)return true;
 for(const [,prefix,suffix] of fine.negativeFrames){
  const p=prefix?fine.normalize(prefix):'',s=suffix?fine.normalize(suffix):'';
  if(p&&q.startsWith(p)||s&&q.endsWith(s))return true;
 }
 for(const [,,,join] of fine.negativeFrames){
  const sep=join.normalize('NFKC').toLowerCase();let at=q.indexOf(sep);
  while(at>0){
   const a=q.slice(0,at).trim(),b=q.slice(at+sep.length).trim();
   const left=fine.resolve(a).id||topics.resolve(a),right=fine.resolve(b).id||topics.resolve(b);
   if(left&&right)return true;
   at=q.indexOf(sep,at+sep.length);
  }
 }
 return false;
}
function precompute(cases,localeMode='correct',scoring='legacy'){
 return cases.map(x=>{const rank=shadowEngine.rank(x.q,localeMode==='correct'?x.locale:localeMode==='unknown'?null:x.locale==='en'?'ja':'en');
 if(scoring!=='legacy'){for(const r of rank)r.score=scoring==='global'?.90*r.global+.10*r.prototype:.70*r.global+.20*Math.max(r.local,r.global*.65)+.10*r.prototype;rank.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));}
 const first=rank[0],second=rank[1],global=rank.slice().sort((a,b)=>b.global-a.global||a.id.localeCompare(b.id))[0];
 return {...x,blocked:shadowBlock(x.q),id:first?.id,score:first?.score||0,margin:(first?.score||0)-(second?.score||0),agreement:first?.id===global?.id};});
}
function selective(rows,policy){
 let positives=0,negatives=0,accepted=0,correct=0,wrongPositive=0,falseAccept=0;const errors=[],byLocale={};
 for(const r of rows){const b=byLocale[r.locale]??={positives:0,negatives:0,correct:0,falseAccept:0,wrongPositive:0};if(r.expected){positives++;b.positives++;}else{negatives++;b.negatives++;}
  if(r.blocked||!(r.score>=policy.score&&r.margin>=policy.margin&&(!policy.agreement||r.agreement)))continue;
  accepted++;if(r.expected&&r.id===r.expected){correct++;b.correct++;}else{if(r.expected){wrongPositive++;b.wrongPositive++;}else{falseAccept++;b.falseAccept++;}errors.push({locale:r.locale,q:r.q,expected:r.expected,predicted:r.id,score:r.score,margin:r.margin});}
 }
 return {positives,negatives,accepted,correct,wrongPositive,falseAccept,precision:accepted?correct/accepted:null,positiveCoverage:positives?correct/positives:0,errors,byLocale};
}
const devScored=precompute(shadowDev.concat(devNegatives)),policies=[];
for(const score of [.25,.35,.45,.55,.65,.75])for(const margin of [.04,.08,.12,.16])for(const agreement of [false,true]){
 const policy={score,margin,agreement},m=selective(devScored,policy);
 if(m.accepted>=8&&m.falseAccept===0&&m.precision>=.95)policies.push({policy,m});
}
policies.sort((a,b)=>b.m.correct-a.m.correct||a.m.wrongPositive-b.m.wrongPositive||b.policy.score-a.policy.score||b.policy.margin-a.policy.margin||Number(b.policy.agreement)-Number(a.policy.agreement));
const chosen=policies[0]?.policy||{score:Infinity,margin:Infinity,agreement:true};
const holdout=selective(precompute(shadowTest),chosen),unknown=selective(precompute(shadowTest,'unknown'),chosen),wrong=selective(precompute(shadowTest,'wrong'),chosen);
// Record deterministic guard coverage separately from threshold selection.
const guardAudit={devBlocked:devScored.filter(x=>x.blocked).length,devNegativesBlocked:devScored.filter(x=>x.blocked&&!x.expected).length,devPositivesBlocked:devScored.filter(x=>x.blocked&&x.expected).length};
console.log('SHADOW_GUARD_AUDIT',JSON.stringify(guardAudit));
const researchGate=!!policies.length&&holdout.accepted>=16&&holdout.falseAccept===0&&holdout.precision>=.95&&holdout.positiveCoverage>=.4&&unknown.falseAccept===0&&wrong.falseAccept===0;
console.log('SELECTIVE_SHADOW_REPORT',JSON.stringify({policy:policies[0]?.policy||null,dev:policies[0]?.m||null,holdout,unknown,wrong,researchGate,releaseEligible:false,reason:'Author-written tests; not independent production or device validation'}));

// New calibration probes must be disjoint from both the reference corpus and
// frozen challenge set. These are operation/property mismatches, not just nonsense.
const calibrationHard=[
 ['en','Remove a watermark from a PDF without uploading it'],
 ['en','Inspect the source code of a QR decoding library'],
 ['zh-Hans','如何恢复损坏的PDF文档而不是压缩它'],
 ['zh-Hans','手机摄像头如何读取印在纸上的条码'],
 ['ja','PDFの電子署名が正しいか検証する方法'],
 ['ko','QR 코드에 담긴 문자를 카메라로 읽기'],
 ['fr','Vérifier la signature numérique d’un fichier PDF'],
 ['de','Einen beschädigten PDF-Datensatz wiederherstellen'],
 ['es','Leer los datos de un código QR con la cámara'],
 ['ru','Проверить цифровую подпись в документе PDF'],
 ['ar','التحقق من التوقيع الرقمي داخل مستند PDF'],
 ['hi','पीडीएफ में डिजिटल हस्ताक्षर की पुष्टि करनी है']
].map(([locale,q])=>({locale,q,expected:null}));
const frozenKeys=new Set(shadowTest.map(x=>fine.normalize(x.q)));
for(const x of calibrationHard){const k=fine.normalize(x.q);assert.ok(!frozenKeys.has(k)&&!exact.has(k)&&!devKeys.has(k),x.q);}
const calibrationCases=shadowDev.concat(devNegatives,calibrationHard);
function compact(m){const {byLocale,errors,...rest}=m;return {...rest,errors:errors.slice(0,8)};}
function calibrate(rows){
 const candidates=[];
 for(const score of [.25,.35,.45,.55,.65,.75])for(const margin of [.04,.08,.12,.16])for(const agreement of [false,true]){
  const policy={score,margin,agreement},m=selective(rows,policy);
  if(m.accepted>=8&&m.falseAccept===0&&m.precision>=.95)candidates.push({policy,m});
 }
 candidates.sort((a,b)=>b.m.correct-a.m.correct||a.m.wrongPositive-b.m.wrongPositive||b.policy.score-a.policy.score||b.policy.margin-a.policy.margin||Number(b.policy.agreement)-Number(a.policy.agreement));
 return candidates[0]||null;
}
const localeModes=['correct','unknown','wrong'],scoringModes=['legacy','global','adaptive'];
const calibrated=scoringModes.map(scoring=>{
 const byMode=localeModes.map(mode=>precompute(calibrationCases,mode,scoring));
 // Tune using all three UI-locale conditions, never on the frozen challenge.
 const rows=byMode.flat(),selected=calibrate(rows),ablation=calibrate(rows.map(x=>({...x,blocked:false})));
 return {scoring,selected,ablation};
});
calibrated.sort((a,b)=>(b.selected?.m.correct||0)-(a.selected?.m.correct||0));
const winner=calibrated[0],frozenPolicy=winner.selected?.policy||{score:Infinity,margin:Infinity,agreement:true};
const frozenResults=Object.fromEntries(localeModes.map(mode=>[mode,compact(selective(precompute(shadowTest,mode,winner.scoring),frozenPolicy))]));
console.log('ROBUST_SHADOW_REPORT',JSON.stringify({calibrationHard:calibrationHard.length,variants:calibrated.map(x=>({scoring:x.scoring,guarded:x.selected?{policy:x.selected.policy,metrics:compact(x.selected.m)}:null,unguarded:x.ablation?{policy:x.ablation.policy,metrics:compact(x.ablation.m)}:null})),chosen:winner.scoring,policy:winner.selected?.policy||null,frozenResults,releaseEligible:false}));


// Research: distinguish an operation from the shared technical object. This
// lexically grounded channel uses exact strings, not hashed feature collisions.
// The existing calibration and frozen sets are never added to the references.
const anchorGroups=[
 [/\bpdfs?\b/giu,['pdf','pdf-merge','pdf-split','pdf-compress','pdf-view']],
 [/\bqr(?:\s*code)?\b|\bqrcode\b|二维码|二維碼|qrコード/giu,['qr-create']],
 [/\bdns\b/giu,['dns','dns-lookup','dns-propagation']],
 [/\bjson\b/giu,['json-edit','files','code']],
 [/\bhtml\b/giu,['html-validate','code']],
 [/\bcss\b/giu,['css-validate','code']],
 [/\bwebrtc\b/giu,['webrtc','privacy']],
 [/\b(?:ssl|tls)\b/giu,['tls-check','security']],
 [/\bdoi\b/giu,['doi-lookup','papers']]
];
function anchorInfo(raw){
 let q=fine.normalize(raw);const groups=[];
 for(const [pattern,ids] of anchorGroups){
  pattern.lastIndex=0;if(pattern.test(q)){groups.push(ids);pattern.lastIndex=0;q=q.replace(pattern,' ');}
 }
 return {q:q.trim(),groups};
}
function residualFeatures(raw){
 const {q}=anchorInfo(raw),set=new Set();
 for(const token of q.match(/[\p{L}\p{M}\p{N}]+/gu)||[]){
  const chars=Array.from(token),unspaced=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(token);
  if(!unspaced&&chars.length>=3)set.add('w:'+token);
  const n=unspaced?2:3;
  for(let i=0;i<=chars.length-n;i++)set.add('g:'+chars.slice(i,i+n).join(''));
 }
 return set;
}
const referenceRows=[];
for(let i=0;i<expanded.rows.length;i++)for(const [pack,row] of [[expanded,expanded.rows[i]],[topics,topics.rows[i]]])for(let j=0;j<pack.tasks.length;j++){
 if(row[j+1])referenceRows.push({id:pack.tasks[j],features:residualFeatures(row[j+1])});
}
const featureClasses=new Map();
for(const r of referenceRows)for(const key of r.features){
 if(!featureClasses.has(key))featureClasses.set(key,new Set());
 featureClasses.get(key).add(r.id);
}
const featureWeight=new Map([...featureClasses].map(([k,ids])=>[k,Math.pow(Math.log(65/(1+ids.size)),2)]));
// Unseen query features count in the norm, so unrelated extra text is not free.
const totalWeight=set=>[...set].reduce((n,k)=>n+(featureWeight.get(k)??1),0);
for(const r of referenceRows)r.weight=totalWeight(r.features);
const residualCache=new Map();
function residualRank(q){
 if(residualCache.has(q))return residualCache.get(q);
 const info=anchorInfo(q),f=residualFeatures(q),weight=totalWeight(f),scores=new Map();
 for(const r of referenceRows){
  if(info.groups.length&&!info.groups.every(ids=>ids.includes(r.id)))continue;
  let overlap=0;
  for(const k of f)if(r.features.has(k))overlap+=featureWeight.get(k)||0;
  const score=weight&&r.weight?overlap/Math.sqrt(weight*r.weight):0;
  scores.set(r.id,Math.max(score,scores.get(r.id)||0));
 }
 const result={info,scores,rank:[...scores].map(([id,score])=>({id,score})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))};
 residualCache.set(q,result);return result;
}
assert.equal(anchorInfo('PDF and QR code').groups.length,2);
assert.ok(!residualFeatures('PDF QR DNS').size);
assert.ok(residualFeatures('combine documents').size>0);
const residualInputs=precompute(calibrationCases,'unknown','global');
function evidenceRows(rows,minimum,margin){
 return rows.map(r=>{
  const {info,scores,rank}=residualRank(r.q),top=rank[0],second=rank[1];
  const objectConflict=info.groups.length>0&&!info.groups.every(ids=>ids.includes(r.id));
  const noEvidence=!(top?.id===r.id&&top.score>=minimum&&top.score-(second?.score||0)>=margin);
  return {...r,blocked:r.blocked||objectConflict||noEvidence,objectConflict,noEvidence,evidenceScore:scores.get(r.id)||0};
 });
}
const evidencePolicies=[];
for(const minimum of [.10,.20,.30,.40,.50])for(const margin of [.02,.05,.10]){
 const rows=evidenceRows(residualInputs,minimum,margin);
 const selected=calibrate(rows);
 if(selected)evidencePolicies.push({minimum,margin,...selected});
}
evidencePolicies.sort((a,b)=>b.m.correct-a.m.correct||a.m.wrongPositive-b.m.wrongPositive||b.minimum-a.minimum||b.margin-a.margin);
const evidenceWinner=evidencePolicies[0];
const evidencePolicy=evidenceWinner?.policy||{score:Infinity,margin:Infinity,agreement:true};
const evidenceReport=Object.fromEntries(localeModes.map(mode=>[mode,compact(selective(evidenceRows(precompute(shadowTest,mode,'global'),evidenceWinner?.minimum??Infinity,evidenceWinner?.margin??Infinity),evidencePolicy))]));
const evidenceRelease=false;
console.log('OPERATION_EVIDENCE_SHADOW_REPORT',JSON.stringify({referenceCount:referenceRows.length,features:featureWeight.size,chosen:evidenceWinner?{minimum:evidenceWinner.minimum,margin:evidenceWinner.margin,policy:evidenceWinner.policy,metrics:compact(evidenceWinner.m)}:null,holdout:evidenceReport,releaseEligible:evidenceRelease}));


// Fresh authored challenge, not used for fitting or architecture selection.
// The old holdout was inspected to diagnose failure modes, so do not call it blind.
const freshCases=[
 ['en','Shrink several scanned PDF pages so I can email the file','pdf-compress'],
 ['en','Show me how to repair a PDF with a broken cross-reference table',null],
 ['zh-Hans','把两个合同文档拼成一个PDF','pdf-merge'],
 ['zh-Hans','想把打印出来的二维码读进手机',null],
 ['zh-Hant','量一下網站打開所花的時間','web-performance'],
 ['zh-Hant','PDF檔案的數位簽章是不是有效',null],
 ['ja','ウェブサイトの読み込み時間を計測したい','web-performance'],
 ['ja','PDFの破損したページを修復したい',null],
 ['ko','사진 파일의 용량을 줄이는 도구를 찾아요','image-compress'],
 ['ko','종이에 인쇄된 QR 코드의 내용을 확인하고 싶어요',null],
 ['fr','Réduire le poids de mon fichier PDF','pdf-compress'],
 ['fr','Comprendre la structure interne des paquets DNS',null],
 ['de','Die Ladezeit einer Internetseite bestimmen','web-performance'],
 ['de','Den Inhalt eines ausgedruckten QR-Codes auslesen',null],
 ['es','Unir tres archivos PDF en un único documento','pdf-merge'],
 ['es','Verificar la firma electrónica de un PDF',null],
 ['ru','Измерить время загрузки интернет-страницы','web-performance'],
 ['ru','Восстановить повреждённый документ PDF',null],
 ['ar','تقليل حجم ملف PDF كبير','pdf-compress'],
 ['ar','التحقق من توقيع إلكتروني داخل ملف PDF',null],
 ['hi','कई तस्वीरों को एक कोलाज में जोड़ना चाहता हूं','image-collage'],
 ['hi','कागज पर छपे QR कोड का मतलब पढ़ना है',null],
 ['th','อยากลดขนาดไฟล์ภาพถ่าย','image-compress'],
 ['th','อยากอ่านข้อมูลในคิวอาร์โค้ดที่พิมพ์อยู่บนกระดาษ',null]
].map(([locale,q,expected])=>({locale,q,expected}));
const allKnown=new Set([...exact,...evalPhrases,...devKeys,...frozenKeys,...calibrationHard.map(x=>fine.normalize(x.q)),...augmentation.rows.flatMap(r=>r.slice(1)).map(fine.normalize)]);
for(const x of freshCases)assert.ok(!allKnown.has(fine.normalize(x.q)),x.q);
assert.equal(freshCases.filter(x=>x.expected).length,12);
const freshScored=precompute(freshCases,'unknown','global');
const freshMetrics=compact(selective(evidenceRows(freshScored,evidenceWinner?.minimum??Infinity,evidenceWinner?.margin??Infinity),evidencePolicy));
console.log('FRESH_OPERATION_CHALLENGE_REPORT',JSON.stringify({n:freshCases.length,metrics:freshMetrics,releaseEligible:false,oldHoldoutInspected:true}));


// QR creation is directional: generic similarity to the object does not
// establish that the user wants to generate a code. Explicit positive action
// anchors are intentionally conservative; absence means abstain in this study.
// This does not replace existing reviewed aliases or affect production search.
const qrCreationActions=Object.freeze([
 /\b(?:creat(?:e|ing)|generat(?:e|ing)|mak(?:e|ing))\b/iu,
 /生成|制作|製作|创建|建立|作成|作る|作り|生成する/u,
 /생성|만들/u,
 /\b(?:créer|création|générer|génération|erstellen|erzeugen|generieren|crear|generar|criar|gerar|creare|generare|aanmaken|genereren|maken)\b/iu,
 /\b(?:skapa|generera|opprette|generere|oprette|generere|luoda|luonti|generoida|utworzyć|wygenerować|tworzyć|vytvořit|vygenerovat|vytvoriť|vygenerovať|létrehoz|generál|crea|genera)\w*/iu,
 /създа|генерира|izrad|naprav|generira|kreira|ustvar|δημιουργ|созда|сгенер|створи|згенер|oluştur|üret/iu,
 /إنشاء|توليد|انشاء|יצירת|ליצור|สร้าง|تولید|ایجاد|बनाना|बनाएं|बनाने|जनरेट|তৈরি|বানাতে|بنانا|بنائیں|تیار/u,
 /tạo|buat|hasilkan|mencipta|gumawa|lumikha|skep|genereer/iu
]);
function qrAction(raw){
 const q=fine.normalize(raw);
 return qrCreationActions.some(re=>re.test(q));
}
assert.ok(qrAction('generate a QR code'));
assert.ok(qrAction('生成二维码'));
assert.ok(qrAction('QRコードを作る'));
assert.equal(qrAction('read an existing QR code'),false);
assert.equal(qrAction('扫描已有二维码'),false);
function directionGuard(rows){
 return rows.map(r=>({...r,blocked:r.blocked||(r.id==='qr-create'&&!qrAction(r.q))}));
}
// Freeze the previous calibration result, measure the additional guard's
// impact without retuning on any evaluation set.
const directionReports=Object.fromEntries(localeModes.map(mode=>[mode,compact(selective(directionGuard(evidenceRows(precompute(shadowTest,mode,'global'),evidenceWinner?.minimum??Infinity,evidenceWinner?.margin??Infinity)),evidencePolicy))]));
const directionFresh=compact(selective(directionGuard(evidenceRows(freshScored,evidenceWinner?.minimum??Infinity,evidenceWinner?.margin??Infinity)),evidencePolicy));
const directionDev=compact(selective(directionGuard(evidenceRows(residualInputs,evidenceWinner?.minimum??Infinity,evidenceWinner?.margin??Infinity)),evidencePolicy));
console.log('DIRECTIONAL_QR_SHADOW_REPORT',JSON.stringify({calibration:directionDev,previouslyInspected:directionReports,previouslyInspectedFresh:directionFresh,releaseEligible:false}));


// A constraint is not an action. No promise of offline processing or password
// recovery may be inferred from a neighboring PDF operation's class.
const unsupportedPdfProperties=[
 /\b(?:password|passcode|encrypted|watermark|digital signature|offline|without (?:uploading|internet)|never upload)\b/iu,
 /密码|密碼|口令|加密|解密|水印|浮水印|数字签名|數位簽章|离线|離線|不上传|不上傳|不用联网|無需上傳/u,
 /パスワード|暗号化|電子署名|透かし|オフライン|アップロード(?:しない|せず)|비밀번호|암호|전자 서명|오프라인|업로드 없이/u,
 /mot de passe|signature numérique|hors ligne|sans (?:envoi|téléversement)|passwort|kennwort|digitale signatur|ohne (?:upload|hochladen)|contraseña|firma digital|sin subir|sem enviar|senha|assinatura digital|password|firma digitale|senza caricare/iu,
 /wachtwoord|zonder upload|lösenord|utan att ladda upp|passord|uten at|uten opplasting|adgangskode|uden upload|salasana|ilman lataamista|hasło|bez przesyłania|heslo|bez nahrávání|jelszó|parol[ăa]|fără încărcare/iu,
 /парол|цифровая подпись|без загрузки|лозинк|geslo|κωδικό πρόσβασης|χωρίς μεταφόρτωση|şifre|parola|yüklemeden/iu,
 /كلمة المرور|توقيع رقمي|دون رفع|بدون رفع|סיסמה|חתימה דיגיטלית|رمز عبور|بدون بارگذاری|पासवर्ड|डिजिटल हस्ताक्षर|बिना अपलोड|পাসওয়ার্ড|পাসওয়ার্ড|پاس ورڈ|پاسورڈ/u,
 /รหัสผ่าน|ลายเซ็นดิจิทัล|ไม่อัปโหลด|mật khẩu|không tải lên|kata sandi|kata laluan|tanpa memuat naik|wagwoord|sonder oplaai/iu
];
function propertyGuard(rows){
 return directionGuard(rows).map(r=>{
  const pdf=/\bpdf\b|पीडीएफ|পিডিএফ/iu.test(r.q);
  return {...r,blocked:r.blocked||(pdf&&unsupportedPdfProperties.some(re=>re.test(r.q)))};
 });
}
const propertyReports=Object.fromEntries(localeModes.map(mode=>[mode,compact(selective(propertyGuard(evidenceRows(precompute(shadowTest,mode,'global'),evidenceWinner?.minimum??Infinity,evidenceWinner?.margin??Infinity)),evidencePolicy))]));
const propertyFresh=compact(selective(propertyGuard(evidenceRows(freshScored,evidenceWinner?.minimum??Infinity,evidenceWinner?.margin??Infinity)),evidencePolicy));
// New contrast pairs: not used to adjust thresholds. As before, all authored
// examples are development diagnostics, not independent real search traffic.
const propertyPairs=[
 ['en','Combine my lecture PDFs into one document','pdf-merge','Combine my lecture PDFs without uploading them'],
 ['zh-Hans','把论文PDF体积压小一点','pdf-compress','把论文PDF体积压小一点但是不上传文件'],
 ['ja','複数のPDFをひとつに結合したい','pdf-merge','PDFをパスワードで保護したい'],
 ['ko','PDF 문서의 크기를 줄이고 싶어요','pdf-compress','PDF 문서의 암호를 복구하고 싶어요'],
 ['fr','Assembler plusieurs fichiers PDF en un seul','pdf-merge','Assembler plusieurs fichiers PDF hors ligne'],
 ['de','Mehrere PDF Dokumente zusammenfügen','pdf-merge','Ein PDF mit vergessenen Passwort öffnen'],
 ['es','Reducir el tamaño de un documento PDF','pdf-compress','Reducir el tamaño de un documento PDF sin subir archivos'],
 ['pt','Juntar vários arquivos PDF em um só','pdf-merge','Recuperar a senha de um arquivo PDF'],
 ['ru','Соединить несколько документов PDF','pdf-merge','Соединить несколько документов PDF без загрузки'],
 ['ar','دمج عدة ملفات PDF في ملف واحد','pdf-merge','دمج عدة ملفات PDF دون رفع الملفات'],
 ['hi','अलग अलग PDF दस्तावेजों को जोड़ना है','pdf-merge','PDF दस्तावेज का पासवर्ड हटाना है'],
 ['th','อยากรวมไฟล์ PDF หลายไฟล์เข้าด้วยกัน','pdf-merge','อยากรวมไฟล์ PDF โดยไม่อัปโหลดไฟล์']
].flatMap(([locale,q,expected,negative])=>[{locale,q,expected},{locale,q:negative,expected:null}]);
const priorKeys=new Set([...allKnown,...freshCases.map(x=>fine.normalize(x.q))]);
for(const x of propertyPairs)assert.ok(!priorKeys.has(fine.normalize(x.q)),x.q);
const propertyPairScored=precompute(propertyPairs,'unknown','global');
const propertyPairMetrics=compact(selective(propertyGuard(evidenceRows(propertyPairScored,evidenceWinner?.minimum??Infinity,evidenceWinner?.margin??Infinity)),evidencePolicy));
console.log('PDF_PROPERTY_SHADOW_REPORT',JSON.stringify({previouslyInspected:propertyReports,previouslyInspectedFresh:propertyFresh,newPairs:12,contrast:propertyPairMetrics,releaseEligible:false}));
