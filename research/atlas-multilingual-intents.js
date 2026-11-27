"use strict";
(function(root){
// Exact, local multilingual task phrases. Not a general translation system.
const tasks=["qr-create","regex-test","flowchart","timer","image-compress"];
const rows=[
  [
    "en",
    "generate a qr code",
    "test a regular expression",
    "draw a flowchart",
    "start a countdown timer",
    "compress an image"
  ],
  [
    "zh-Hans",
    "生成二维码",
    "测试正则表达式",
    "绘制流程图",
    "启动倒计时",
    "压缩图片"
  ],
  [
    "zh-Hant",
    "產生二維碼",
    "測試正規表示式",
    "繪製流程圖",
    "啟動倒數計時",
    "壓縮圖片"
  ],
  [
    "ja",
    "QRコードを作成",
    "正規表現をテスト",
    "フローチャートを作成",
    "カウントダウンを開始",
    "画像を圧縮"
  ],
  [
    "ko",
    "QR 코드 생성",
    "정규 표현식 테스트",
    "순서도 그리기",
    "카운트다운 시작",
    "이미지 압축"
  ],
  [
    "fr",
    "générer un code QR",
    "tester une expression régulière",
    "dessiner un organigramme",
    "lancer un compte à rebours",
    "compresser une image"
  ],
  [
    "de",
    "QR-Code erstellen",
    "regulären Ausdruck testen",
    "Flussdiagramm erstellen",
    "Countdown starten",
    "Bild komprimieren"
  ],
  [
    "es",
    "generar un código QR",
    "probar una expresión regular",
    "crear un diagrama de flujo",
    "iniciar una cuenta regresiva",
    "comprimir una imagen"
  ],
  [
    "pt",
    "gerar um código QR",
    "testar uma expressão regular",
    "criar um fluxograma",
    "iniciar uma contagem regressiva",
    "comprimir uma imagem"
  ],
  [
    "it",
    "generare un codice QR",
    "testare un'espressione regolare",
    "creare un diagramma di flusso",
    "avviare un conto alla rovescia",
    "comprimere un'immagine"
  ],
  [
    "nl",
    "een QR-code maken",
    "een reguliere expressie testen",
    "een stroomdiagram maken",
    "een afteltimer starten",
    "een afbeelding comprimeren"
  ],
  [
    "sv",
    "skapa en QR-kod",
    "testa ett reguljärt uttryck",
    "skapa ett flödesschema",
    "starta en nedräkning",
    "komprimera en bild"
  ],
  [
    "no",
    "lage en QR-kode",
    "teste et regulært uttrykk",
    "lage et flytskjema",
    "starte en nedtelling",
    "komprimere et bilde"
  ],
  [
    "da",
    "oprette en QR-kode",
    "teste et regulært udtryk",
    "oprette et rutediagram",
    "starte en nedtælling",
    "komprimere et billede"
  ],
  [
    "fi",
    "luoda QR-koodi",
    "testata säännöllistä lauseketta",
    "piirtää vuokaavio",
    "käynnistää lähtölaskenta",
    "pakata kuva"
  ],
  [
    "pl",
    "wygenerować kod QR",
    "przetestować wyrażenie regularne",
    "narysować schemat blokowy",
    "uruchomić odliczanie",
    "skompresować obraz"
  ],
  [
    "cs",
    "vytvořit QR kód",
    "otestovat regulární výraz",
    "nakreslit vývojový diagram",
    "spustit odpočet",
    "komprimovat obrázek"
  ],
  [
    "sk",
    "vytvoriť QR kód",
    "otestovať regulárny výraz",
    "nakresliť vývojový diagram",
    "spustiť odpočítavanie",
    "komprimovať obrázok"
  ],
  [
    "hu",
    "QR-kód létrehozása",
    "reguláris kifejezés tesztelése",
    "folyamatábra készítése",
    "visszaszámlálás indítása",
    "kép tömörítése"
  ],
  [
    "ro",
    "generează un cod QR",
    "testează o expresie regulată",
    "creează o diagramă de flux",
    "pornește numărătoarea inversă",
    "comprimă o imagine"
  ],
  [
    "bg",
    "генериране на QR код",
    "тестване на регулярен израз",
    "създаване на блок-схема",
    "стартиране на обратно броене",
    "компресиране на изображение"
  ],
  [
    "hr",
    "generirati QR kod",
    "testirati regularni izraz",
    "izraditi dijagram toka",
    "pokrenuti odbrojavanje",
    "komprimirati sliku"
  ],
  [
    "sr",
    "generisati QR kod",
    "testirati regularni izraz",
    "napraviti dijagram toka",
    "pokrenuti odbrojavanje",
    "komprimovati sliku"
  ],
  [
    "sl",
    "ustvariti kodo QR",
    "preizkusiti regularni izraz",
    "narisati diagram poteka",
    "začeti odštevanje",
    "stisniti sliko"
  ],
  [
    "el",
    "δημιουργία κωδικού QR",
    "δοκιμή κανονικής έκφρασης",
    "δημιουργία διαγράμματος ροής",
    "έναρξη αντίστροφης μέτρησης",
    "συμπίεση εικόνας"
  ],
  [
    "ru",
    "создать QR-код",
    "проверить регулярное выражение",
    "нарисовать блок-схему",
    "запустить обратный отсчёт",
    "сжать изображение"
  ],
  [
    "uk",
    "створити QR-код",
    "перевірити регулярний вираз",
    "намалювати блок-схему",
    "запустити зворотний відлік",
    "стиснути зображення"
  ],
  [
    "tr",
    "QR kodu oluştur",
    "düzenli ifadeyi test et",
    "akış şeması oluştur",
    "geri sayımı başlat",
    "resmi sıkıştır"
  ],
  [
    "ar",
    "إنشاء رمز QR",
    "اختبار تعبير نمطي",
    "إنشاء مخطط انسيابي",
    "بدء العد التنازلي",
    "ضغط صورة"
  ],
  [
    "he",
    "יצירת קוד QR",
    "בדיקת ביטוי רגולרי",
    "יצירת תרשים זרימה",
    "הפעלת ספירה לאחור",
    "דחיסת תמונה"
  ],
  [
    "fa",
    "ساخت کد QR",
    "آزمایش عبارت منظم",
    "رسم نمودار جریان",
    "شروع شمارش معکوس",
    "فشرده سازی تصویر"
  ],
  [
    "hi",
    "QR कोड बनाएं",
    "रेगुलर एक्सप्रेशन का परीक्षण करें",
    "फ्लोचार्ट बनाएं",
    "उलटी गिनती शुरू करें",
    "छवि संपीड़ित करें"
  ],
  [
    "bn",
    "QR কোড তৈরি করুন",
    "রেগুলার এক্সপ্রেশন পরীক্ষা করুন",
    "ফ্লোচার্ট তৈরি করুন",
    "কাউন্টডাউন শুরু করুন",
    "ছবি সংকুচিত করুন"
  ],
  [
    "ur",
    "QR کوڈ بنائیں",
    "ریگولر ایکسپریشن کی جانچ کریں",
    "فلو چارٹ بنائیں",
    "الٹی گنتی شروع کریں",
    "تصویر کو کمپریس کریں"
  ],
  [
    "th",
    "สร้างคิวอาร์โค้ด",
    "ทดสอบนิพจน์ปรกติ",
    "สร้างผังงาน",
    "เริ่มนับถอยหลัง",
    "บีบอัดรูปภาพ"
  ],
  [
    "vi",
    "tạo mã QR",
    "kiểm thử biểu thức chính quy",
    "vẽ lưu đồ",
    "bắt đầu đếm ngược",
    "nén hình ảnh"
  ],
  [
    "id",
    "buat kode QR",
    "uji ekspresi reguler",
    "buat diagram alir",
    "mulai hitung mundur",
    "kompres gambar"
  ],
  [
    "ms",
    "jana kod QR",
    "uji ungkapan nalar",
    "buat carta alir",
    "mulakan kira detik",
    "mampatkan imej"
  ],
  [
    "fil",
    "gumawa ng QR code",
    "subukan ang regular expression",
    "gumawa ng flowchart",
    "simulan ang countdown",
    "i-compress ang larawan"
  ],
  [
    "af",
    "skep 'n QR-kode",
    "toets 'n reëlmatige uitdrukking",
    "teken 'n vloeidiagram",
    "begin 'n aftelling",
    "druk 'n beeld saam"
  ]
];

const normalize=q=>String(q||'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[\u200c\u200d]/g,' ').replace(/\s+/gu,' ').trim().replace(/[.!?。！？؟]+$/u,'').trim();
const index=new Map();
for(const [locale,...phrases] of rows)phrases.forEach((phrase,i)=>{const k=normalize(phrase),existing=index.get(k);if(existing&&existing!==tasks[i])throw Error('alias collision');index.set(k,tasks[i]);});
function resolve(q){const n=normalize(q);const id=index.get(n);if(id)return {id,blocked:false};if(n.length>512)return {id:null,blocked:true};
 // Added conditions or additional requests are not supported by exact aliases.
 for(const phrase of index.keys())if(n.includes(phrase))return {id:null,blocked:true};
 return {id:null,blocked:false};
}
const api=Object.freeze({tasks,locales:Object.freeze(rows.map(x=>x[0])),rows:Object.freeze(rows.map(x=>Object.freeze(x))),resolve,normalize});
if(typeof module==='object'&&module.exports)module.exports=api;else root.AVENQIR_RESEARCH_MULTILINGUAL=api;
})(typeof self!=='undefined'?self:globalThis);
