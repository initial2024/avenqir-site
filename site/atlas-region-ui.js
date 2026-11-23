"use strict";
/* Regional UI: no fetch, no IP geolocation, no location permission, no server sync. */
(function(root){
 const api=root.AVENQIR_ATLAS_REGION;
 // The document language is the language actually shown to the visitor. Use it as
 // the authoritative presentation signal when a long-lived PWA has stale modules.
 const locale=()=>{
  const page=String(root.document?.documentElement?.lang||'').trim();
  const setting=String(root.AVENQIR_I18N?.locale||'').trim();
  if(page&&!/^zh(?:-|$)/i.test(page))return page;
  return setting||page||'en';
 };
 const E=()=>!/^zh(?:-Hans|-CN|$)/i.test(locale());
 const T=(zh,en)=>E()?en:zh;
 const WORDS=Object.freeze({"en":["Timezone hint (no IP lookup)","Everyday services","Public information","Timezone hint, not IP geolocation","Third-party website · confirm before leaving","Source checked (not safety-certified)","Original source description (Chinese)","Regional resources"],"zh-Hans":["根据浏览器时区建议（不读取 IP）","生活常用","公共资讯","浏览器时区建议（不是 IP 定位）","第三方网站 · 跳转前确认","来源已核对（非安全认证）","原始中文简介","地区资源"],"zh-Hant":["根據瀏覽器時區建議（不讀取 IP）","日常服務","公共資訊","瀏覽器時區建議（非 IP 定位）","第三方網站 · 離開前確認","來源已核對（非安全認證）","原始中文簡介","地區資源"],"ja":["ブラウザーのタイムゾーンから提案（IP 不使用）","生活サービス","公共情報","タイムゾーンに基づく提案（IP 位置情報ではありません）","外部サイト · 移動前に確認","出典を確認済み（安全認証ではありません）","元の中国語の説明","地域の情報"],"ko":["브라우저 시간대 기반 추천 (IP 사용 안 함)","생활 서비스","공공 정보","시간대 기반 추천 (IP 위치 정보 아님)","외부 사이트 · 이동 전 확인","출처 확인됨 (안전 인증 아님)","원본 중국어 설명","지역 자료"],"fr":["Suggestion selon le fuseau horaire (sans IP)","Services du quotidien","Informations publiques","Indice de fuseau horaire, pas de géolocalisation IP","Site tiers · confirmer avant de quitter","Source vérifiée (pas une certification de sécurité)","Description originale (chinois)","Ressources locales"],"de":["Vorschlag nach Zeitzone (ohne IP)","Alltagsdienste","Öffentliche Informationen","Zeitzonenhinweis, keine IP-Ortung","Externe Website · vor dem Verlassen bestätigen","Quelle geprüft (keine Sicherheitszertifizierung)","Originalbeschreibung (Chinesisch)","Regionale Ressourcen"],"es":["Sugerencia por zona horaria (sin IP)","Servicios cotidianos","Información pública","Sugerencia por zona horaria, no ubicación IP","Sitio externo · confirmar antes de salir","Fuente comprobada (no certifica seguridad)","Descripción original (chino)","Recursos regionales"],"pt":["Sugestão pelo fuso horário (sem IP)","Serviços do dia a dia","Informações públicas","Sugestão pelo fuso horário, não localização por IP","Site externo · confirmar antes de sair","Fonte verificada (não certifica segurança)","Descrição original (chinês)","Recursos regionais"],"it":["Suggerimento dal fuso orario (senza IP)","Servizi quotidiani","Informazioni pubbliche","Suggerimento dal fuso orario, non geolocalizzazione IP","Sito esterno · conferma prima di uscire","Fonte verificata (non certifica la sicurezza)","Descrizione originale (cinese)","Risorse locali"],"nl":["Suggestie op basis van tijdzone (zonder IP)","Dagelijkse diensten","Openbare informatie","Tijdzonehint, geen IP-locatie","Externe website · bevestigen voor vertrek","Bron gecontroleerd (geen veiligheidscertificaat)","Oorspronkelijke beschrijving (Chinees)","Regionale bronnen"],"sv":["Förslag utifrån tidszon (utan IP)","Vardagstjänster","Offentlig information","Tidszonsförslag, inte IP-position","Extern webbplats · bekräfta innan du lämnar","Källa kontrollerad (ingen säkerhetscertifiering)","Originalbeskrivning (kinesiska)","Regionala resurser"],"no":["Forslag basert på tidssone (uten IP)","Hverdagstjenester","Offentlig informasjon","Tidssoneforslag, ikke IP-posisjon","Eksternt nettsted · bekreft før du går videre","Kilde kontrollert (ikke sikkerhetssertifisering)","Original beskrivelse (kinesisk)","Regionale ressurser"],"da":["Forslag ud fra tidszone (uden IP)","Hverdagstjenester","Offentlig information","Tidszoneforslag, ikke IP-placering","Eksternt websted · bekræft før du fortsætter","Kilde kontrolleret (ikke en sikkerhedscertificering)","Original beskrivelse (kinesisk)","Regionale ressourcer"],"fi":["Aikavyöhykkeeseen perustuva ehdotus (ei IP:tä)","Arjen palvelut","Julkiset tiedot","Aikavyöhykevihje, ei IP-paikannus","Ulkoinen sivusto · vahvista ennen siirtymistä","Lähde tarkistettu (ei turvallisuussertifikaatti)","Alkuperäinen kuvaus (kiina)","Alueelliset resurssit"],"pl":["Sugestia według strefy czasowej (bez IP)","Usługi codzienne","Informacje publiczne","Wskazówka strefy czasowej, nie lokalizacja IP","Strona zewnętrzna · potwierdź przed przejściem","Źródło sprawdzone (nie jest certyfikatem bezpieczeństwa)","Oryginalny opis (chiński)","Zasoby regionalne"],"cs":["Návrh podle časového pásma (bez IP)","Každodenní služby","Veřejné informace","Nápověda podle časového pásma, ne poloha IP","Externí web · před odchodem potvrďte","Zdroj ověřen (nejde o bezpečnostní certifikaci)","Původní popis (čínsky)","Regionální zdroje"],"sk":["Návrh podľa časového pásma (bez IP)","Každodenné služby","Verejné informácie","Návrh podľa časového pásma, nie poloha IP","Externý web · pred odchodom potvrďte","Zdroj overený (nie bezpečnostná certifikácia)","Pôvodný opis (čínsky)","Regionálne zdroje"],"hu":["Időzóna alapján javasolt (IP nélkül)","Mindennapi szolgáltatások","Közérdekű információk","Időzóna alapján, nem IP-helymeghatározás","Külső webhely · erősítse meg a megnyitást","Forrás ellenőrizve (nem biztonsági tanúsítvány)","Eredeti leírás (kínai)","Regionális források"],"ro":["Sugestie după fusul orar (fără IP)","Servicii zilnice","Informații publice","Sugestie pe baza fusului orar, nu localizare IP","Site extern · confirmă înainte de accesare","Sursă verificată (nu certifică siguranța)","Descriere originală (chineză)","Resurse regionale"],"bg":["Предложение по часова зона (без IP)","Ежедневни услуги","Публична информация","Подсказка по часова зона, не IP местоположение","Външен сайт · потвърдете преди посещение","Източникът е проверен (не е сертификат за сигурност)","Оригинално описание (китайски)","Регионални ресурси"],"hr":["Prijedlog prema vremenskoj zoni (bez IP-a)","Svakodnevne usluge","Javne informacije","Prijedlog vremenske zone, ne IP lokacija","Vanjska stranica · potvrdite prije odlaska","Izvor provjeren (nije sigurnosni certifikat)","Izvorni opis (kineski)","Regionalni resursi"],"sr":["Предлог према временској зони (без IP-а)","Свакодневне услуге","Јавне информације","Временска зона, не IP локација","Спољни сајт · потврдите пре одласка","Извор проверен (није безбедносни сертификат)","Оригинални опис (кинески)","Регионални ресурси"],"sl":["Predlog glede na časovni pas (brez IP-ja)","Vsakodnevne storitve","Javne informacije","Časovni pas, ne lokacija IP","Zunanje spletno mesto · potrdite pred obiskom","Vir preverjen (ni varnostni certifikat)","Izvirni opis (kitajščina)","Regionalni viri"],"el":["Πρόταση βάσει ζώνης ώρας (χωρίς IP)","Καθημερινές υπηρεσίες","Δημόσιες πληροφορίες","Ένδειξη ζώνης ώρας, όχι εντοπισμός IP","Εξωτερικός ιστότοπος · επιβεβαιώστε πριν φύγετε","Η πηγή ελέγχθηκε (όχι πιστοποίηση ασφάλειας)","Αρχική περιγραφή (κινεζικά)","Τοπικοί πόροι"],"ru":["Рекомендация по часовому поясу (без IP)","Повседневные сервисы","Общедоступная информация","Подсказка по часовому поясу, не IP-геолокация","Сторонний сайт · подтвердите переход","Источник проверен (не сертификат безопасности)","Исходное описание (китайский)","Региональные ресурсы"],"uk":["Порада за часовим поясом (без IP)","Повсякденні послуги","Публічна інформація","Підказка за часовим поясом, не IP-геолокація","Сторонній сайт · підтвердьте перехід","Джерело перевірено (не сертифікат безпеки)","Оригінальний опис (китайською)","Регіональні ресурси"],"tr":["Saat dilimine göre öneri (IP kullanılmaz)","Günlük hizmetler","Kamu bilgileri","Saat dilimi ipucu, IP konumu değildir","Üçüncü taraf site · ayrılmadan önce onaylayın","Kaynak doğrulandı (güvenlik sertifikası değildir)","Özgün açıklama (Çince)","Bölgesel kaynaklar"],"ar":["اقتراح وفق المنطقة الزمنية (دون IP)","خدمات يومية","معلومات عامة","اقتراح حسب المنطقة الزمنية وليس موقع IP","موقع خارجي · أكّد قبل الانتقال","تم التحقق من المصدر (ليس شهادة أمان)","الوصف الأصلي (بالصينية)","موارد إقليمية"],"he":["הצעה לפי אזור זמן (ללא IP)","שירותים יומיומיים","מידע ציבורי","רמז לפי אזור זמן, לא מיקום IP","אתר חיצוני · יש לאשר לפני המעבר","המקור נבדק (לא אישור אבטחה)","התיאור המקורי (בסינית)","משאבים אזוריים"],"fa":["پیشنهاد بر اساس منطقه زمانی (بدون IP)","خدمات روزمره","اطلاعات عمومی","راهنمای منطقه زمانی، نه مکان‌یابی IP","وب‌سایت خارجی · پیش از خروج تأیید کنید","منبع بررسی شده (گواهی امنیت نیست)","توضیح اصلی (چینی)","منابع منطقه‌ای"],"hi":["समय क्षेत्र के अनुसार सुझाव (IP नहीं)","दैनिक सेवाएँ","सार्वजनिक जानकारी","समय क्षेत्र संकेत, IP स्थान नहीं","बाहरी वेबसाइट · जाने से पहले पुष्टि करें","स्रोत जाँचा गया (सुरक्षा प्रमाणन नहीं)","मूल विवरण (चीनी)","क्षेत्रीय संसाधन"],"bn":["সময় অঞ্চল অনুযায়ী পরামর্শ (IP নয়)","দৈনন্দিন সেবা","জনসাধারণের তথ্য","সময় অঞ্চল নির্দেশনা, IP অবস্থান নয়","বাইরের ওয়েবসাইট · যাওয়ার আগে নিশ্চিত করুন","উৎস যাচাই করা হয়েছে (নিরাপত্তার সনদ নয়)","মূল বিবরণ (চীনা)","আঞ্চলিক সংস্থান"],"ur":["ٹائم زون کی بنیاد پر تجویز (IP نہیں)","روزمرہ خدمات","عوامی معلومات","ٹائم زون کا اشارہ، IP مقام نہیں","بیرونی ویب سائٹ · جانے سے پہلے تصدیق کریں","ذریعہ جانچ لیا گیا (حفاظتی سرٹیفکیٹ نہیں)","اصل تفصیل (چینی)","علاقائی وسائل"],"th":["แนะนำตามเขตเวลา (ไม่ใช้ IP)","บริการในชีวิตประจำวัน","ข้อมูลสาธารณะ","คำแนะนำตามเขตเวลา ไม่ใช่ตำแหน่ง IP","เว็บไซต์ภายนอก · ยืนยันก่อนออก","ตรวจสอบแหล่งที่มาแล้ว (ไม่ใช่การรับรองความปลอดภัย)","คำอธิบายต้นฉบับ (ภาษาจีน)","แหล่งข้อมูลในภูมิภาค"],"vi":["Gợi ý theo múi giờ (không dùng IP)","Dịch vụ hằng ngày","Thông tin công cộng","Gợi ý theo múi giờ, không phải vị trí IP","Trang bên thứ ba · xác nhận trước khi rời đi","Đã kiểm tra nguồn (không chứng nhận an toàn)","Mô tả gốc (tiếng Trung)","Nguồn tài nguyên khu vực"],"id":["Saran berdasarkan zona waktu (tanpa IP)","Layanan sehari-hari","Informasi publik","Petunjuk zona waktu, bukan lokasi IP","Situs pihak ketiga · konfirmasi sebelum keluar","Sumber diperiksa (bukan sertifikasi keamanan)","Deskripsi asli (bahasa Tionghoa)","Sumber daya regional"],"ms":["Cadangan berdasarkan zon waktu (tanpa IP)","Perkhidmatan harian","Maklumat awam","Petunjuk zon waktu, bukan lokasi IP","Laman pihak ketiga · sahkan sebelum keluar","Sumber disemak (bukan pensijilan keselamatan)","Penerangan asal (bahasa Cina)","Sumber serantau"],"fil":["Mungkahi batay sa time zone (walang IP)","Pang-araw-araw na serbisyo","Pampublikong impormasyon","Pahiwatig sa time zone, hindi lokasyon ng IP","Ibang website · kumpirmahin bago umalis","Nasuri ang pinagmulan (hindi sertipikasyon ng seguridad)","Orihinal na paglalarawan (Chinese)","Mga sangguniang panrehiyon"],"af":["Voorstel volgens tydsone (geen IP)","Alledaagse dienste","Openbare inligting","Tydsonewenk, nie IP-ligging nie","Derdeparty-webwerf · bevestig voordat jy vertrek","Bron nagegaan (nie veiligheidssertifisering nie)","Oorspronklike beskrywing (Chinees)","Streekhulpbronne"]});
 const PACK_KEYS=['auto','everyday','public','timezone','thirdparty','reviewed','original','resources'];
 const language=()=>{const code=locale().replace(/_/g,'-');if(/^zh-(?:TW|HK|MO|Hant)/i.test(code))return 'zh-Hant';if(/^zh/i.test(code))return 'zh-Hans';return code.split('-')[0].toLowerCase();};
 const phrase=key=>{
  const index=PACK_KEYS.indexOf(key);
  if(index<0)return key;
  return (WORDS[language()]||WORDS.en)[index]||WORDS.en[index];
 };
 const category=name=>root.AVENQIR_I18N?.category(name)||name;
 const regionName=r=>{if(language()==='zh-Hans')return r.label;try{return new Intl.DisplayNames([locale()],{type:'region'}).of(r.code)||r.code;}catch{return r.code;}};
 const AREA_M49=Object.freeze({'东亚':'030','东南亚':'035','南亚':'034','中东':'145','欧洲':'150','美洲':'019','大洋洲':'009','非洲':'002'});
 const regionGroup=area=>{
  if(language()==='zh-Hans')return area;
  const code=AREA_M49[area];if(!code)return 'Other regions';
  try{return new Intl.DisplayNames([locale()],{type:'region'}).of(code)||'Other regions';}catch{return 'Other regions';}
 };
 // Explicit English summaries are written against the curated record, not generated
 // by contacting an outside translator. Unknown records use their existing category
 // as a conservative label; source metadata can always be expanded verbatim.
 const EN_DESCRIPTIONS=Object.freeze({
  every011:'Ride-hailing, transportation and delivery services in Singapore',
  every012:'Online grocery and supermarket shopping in Singapore',
  every013:'Singapore rail transport updates and service notices',
  every014:'Singapore postal services and parcel tracking',
  every015:'Municipal feedback and community services in Singapore',
  rg88017:'Singapore government information and public services',
  rg88018:'Official social and economic statistics for Singapore',
  rg88019:'Public open-data portal for Singapore',
  rg88020:'Official Singapore weather forecasts',
  rg88021:'Singapore public transport information',
  rg88022:'Singapore library and digital reading resources',
  rg88023:'Official education information from Singapore’s Ministry of Education',
  rg88024:'Singapore parks and ecological resources'
 });
 function englishDescription(item,regionLabel){
   const original=String(item?.description||'').trim();
   if(original&&!/[\u3400-\u9fff]/.test(original))return original;
   if(Object.hasOwn(EN_DESCRIPTIONS,item?.id))return EN_DESCRIPTIONS[item.id];
   const topic=category(item?.category||'');
   const cleanTopic=String(topic||'').replace(/[\u3400-\u9fff]/g,'').trim();
   const cleanRegion=String(regionLabel||'').replace(/[\u3400-\u9fff]/g,'').trim();
   return (cleanTopic||'Public website')+' resources for '+(cleanRegion||'the selected region')+'.';
 }
 function mount({items,favorites,open,reviewed}){
  if(!api||typeof document==='undefined')return null;
  const $=id=>document.getElementById(id);
  const toggle=$('atlasRegionToggle'),body=$('atlasRegionBody'),select=$('atlasRegionSelect'),status=$('atlasRegionStatus'),cards=$('atlasRegionCards'),clear=$('atlasRegionClear');
  if(!toggle||!body||!select||!status||!cards||!clear)return null;
  let storage;try{storage=root.localStorage;}catch{storage=null;}
  const model=api.create(storage,()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch{return '';}});
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  function buildOptions(){
   const previous=select.value;select.replaceChildren();
   const auto=el('option','',phrase('auto'));auto.value='auto';select.append(auto);
   const areaGroups=new Map();
   for(const r of api.regions){
     const label=regionGroup(r.area);
     let group=areaGroups.get(label);
     if(!group){group=el('optgroup');group.label=label;areaGroups.set(label,group);select.append(group);}
     const option=el('option','',regionName(r));option.value=r.code;group.append(option);
   }
   if(previous)select.value=previous;
  }
  buildOptions();
  function render(){
   buildOptions();
   const state=model.read(),selected=model.selection();
   toggle.checked=state.enabled;toggle.setAttribute('aria-checked',String(state.enabled));body.hidden=!state.enabled;
   cards.replaceChildren();
   if(!state.enabled){
     status.textContent=T('默认关闭 · 无请求、无 IP 定位、无地区使用记录','Disabled · no requests, IP lookup or region activity logging');
     return;
   }
   select.value=state.mode==='manual'?state.code||'auto':'auto';
   if(!selected.code){
     status.textContent=T('当前时区没有可用的地区建议，请手动选择；没有地区就不显示推荐。','No region hint for this timezone. Choose a region manually to see suggestions.');
     cards.append(el('p','atlas-local-empty',T('不进行任何 IP 查询。选择地区后才会出现适合该地区的公开资源。','No IP queries are made. Choose a region to view curated public resources.')));
     return;
   }
   const selectedRegion=api.regions.find(r=>r.code===selected.code);
   const label=selectedRegion?regionName(selectedRegion):selected.code;
   status.textContent=selected.source==='timezone'
    ?T('地区建议：'+label+' · 依据浏览器时区，非公网 IP 归属地（可手动修改）','Suggested region: '+label+' · based on browser timezone, NOT IP location')
    :T('已手动选择：'+label+' · 仅在此浏览器保存地区代码','Selected manually: '+label+' · saved only in this browser');
   const picks=model.recommend(items(),favorites(),8);
   if(!picks.length){cards.append(el('p','atlas-local-empty',T('该地区暂无可用的精选资源。可切换其他地区，或浏览完整目录。','No curated resources are available for this region. Browse the full directory.')));return;}
   for(const {item,reason,kind} of picks){
    const box=el('article','atlas-local-card'),top=el('div','atlas-local-card-head');
    top.append(el('span','atlas-local-category',phrase(kind==='生活常用'?'everyday':'public')+' · '+category(item.category)),
      el('small','atlas-local-reason',E()?(selected.source==='manual'?T('手动选择的地区','Your manual region selection'):phrase('timezone')):reason));
    const a=el('a','atlas-local-link',item.name+' ↗');
    a.href=reviewed(item.url)?item.url:'leave.html?url='+encodeURIComponent(item.url)+'&name='+encodeURIComponent(item.name);
    a.referrerPolicy='no-referrer';a.rel='noopener noreferrer';
    a.addEventListener('click',e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();open(item.url,item.name);});
    const desc=el('p','atlas-local-description',!E()?item.description:(language()==='en'?englishDescription(item,label):(label+' · '+category(item.category)+' · '+phrase('resources'))));
    box.append(top,a,desc);
    if(E()&&/[\u3400-\u9fff]/.test(item.description||'')){
      const original=el('details','atlas-original-desc');
      original.append(el('summary','',phrase('original')),el('p','atlas-local-description',item.description));
      box.append(original);
    }
    box.append(el('small','atlas-local-trust',phrase(reviewed(item.url)?'reviewed':'thirdparty')));
    cards.append(box);
   }
  }
  toggle.addEventListener('change',()=>{
    if(!toggle.checked){model.disable();render();return;}
    if(!model.enable()){toggle.checked=false;status.textContent=T('本机存储不可用，保持关闭。','Browser storage is unavailable; regional suggestions remain off.');return;}
    render();
  });
  select.addEventListener('change',()=>{
    if(select.value==='auto')model.useAutomatic();
    else model.choose(select.value);
    render();
  });
  clear.addEventListener('click',()=>{
    model.disable();render();status.textContent=T('地区推荐记录已清除并关闭；原收藏和个性化兴趣记录不变。','Region setting cleared; other bookmarks and interests remain unchanged.');
  });
  root.addEventListener?.('aq:language-change',render);
  render();
  return Object.freeze({render});
 }
 const result=Object.freeze({mount,englishDescription,phrase,regionGroup,language,PACK_KEYS,localeCodes:Object.keys(WORDS)});
 root.AVENQIR_ATLAS_REGION_UI=result;
 if(typeof module==='object'&&module.exports)module.exports=result;
})(typeof window!=='undefined'?window:globalThis);
