"use strict";
const assert=require("node:assert/strict");
const fine=require("../research/atlas-multilingual-intents.js"),topics=require("../research/atlas-multilingual-topics.js"),uni=require("../research/atlas-unicode-runtime.js"),codec=require("../research/atlas-model-codec.js"),bundle=require("../research/atlas-semantic-bundle-v2.json");
const domain=codec.deserialize(JSON.stringify(bundle.domain)),u=uni.create(codec.deserialize(JSON.stringify(bundle.unicode)),domain.classes.map(x=>x[0]));
// Authored paraphrases, not externally collected or representative of all 64 classes.
const rows=[
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

function evalHoldout(fine,topics,uni,u,rows){
 const reference=[];for(let i=0;i<fine.rows.length;i++){for(const [pack,row] of [[fine,fine.rows[i]],[topics,topics.rows[i]]])for(let j=0;j<pack.tasks.length;j++)reference.push({id:pack.tasks[j],q:fine.normalize(row[j+1]),v:uni.unicodeFeatures(row[j+1])});}
 const exact=new Set(reference.map(x=>x.q));let total=0,top1=0,top5=0,nearest1=0,nearest5=0,agree=0,correctAgree=0,overlap=0;
 for(const [locale,...cases] of rows)for(let i=0;i<cases.length;i+=2){const q=cases[i],id=cases[i+1];total++;if(exact.has(fine.normalize(q)))overlap++;
 const rank=u.classify(q),f=uni.unicodeFeatures(q),scores=new Map();
 for(const r of reference){let v=0;for(const [k,w] of f)v+=w*(r.v.get(k)||0);scores.set(r.id,Math.max(v,scores.get(r.id)||0));}
 const nearest=[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 top1+=Number(rank[0].id===id);top5+=Number(rank.slice(0,5).some(x=>x.id===id));
 nearest1+=Number(nearest[0][0]===id);nearest5+=Number(nearest.slice(0,5).some(x=>x[0]===id));
 if(rank[0].id===nearest[0][0]){agree++;correctAgree+=Number(rank[0].id===id);}
 }
 return {total,overlap,top1,top5,nearest1,nearest5,agree,correctAgree};
}

const report=evalHoldout(fine,topics,uni,u,rows);assert.equal(report.total,80);assert.equal(report.overlap,0);assert.deepEqual(rows.map(r=>r[0]),fine.locales);console.log("PARAPHRASE_HOLDOUT_REPORT",JSON.stringify(report));
