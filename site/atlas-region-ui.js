"use strict";
/* Regional UI: no fetch, no IP geolocation, no location permission, no server sync. */
(function(root){
 const api=root.AVENQIR_ATLAS_REGION;
 // The document language is the language actually shown to the visitor. Use it as
 // the authoritative presentation signal when a long-lived PWA has stale modules.
 const locale=()=>{
  const page=String(root.document?.documentElement?.lang||'').trim();
  return page||String(root.AVENQIR_I18N?.locale||'').trim()||'en';
 };
 const E=()=>locale()!=='zh-Hans';
 const T=(zh,en)=>E()?en:zh;
 // All 40 advertised interface locales have region-selector labels.
 // Less frequent messages can fall back to English, never to Simplified Chinese.
 const REGIONAL_COPY=Object.freeze({"en":{"auto":"Timezone hint (no IP lookup)","everyday":"Everyday services","public":"Public information","timezoneReason":"Timezone hint, not IP location","manualReason":"Your manual region selection","reviewed":"Exact source checked (not a safety certificate)","unverified":"Third-party website · confirm before leaving","source":"Original source description (Chinese)"},"zh-Hans":{"auto":"根据浏览器时区建议（不读取 IP）","everyday":"生活常用","public":"公共资讯","timezoneReason":"浏览器时区建议（不是 IP 定位）","manualReason":"手动选择的地区","reviewed":"来源已核对（非安全认证）","unverified":"第三方网站 · 跳转前确认","source":"原始简介（中文）"},"zh-Hant":{"auto":"根據瀏覽器時區建議（不讀取 IP）","everyday":"日常服務","public":"公共資訊","timezoneReason":"瀏覽器時區建議（非 IP 定位）","manualReason":"手動選擇的地區","reviewed":"來源已核對（非安全認證）","unverified":"第三方網站 · 跳轉前確認","source":"原始說明（中文）"},"ja":{"auto":"ブラウザーのタイムゾーンを使用（IP検索なし）","everyday":"日常サービス","public":"公共情報","timezoneReason":"タイムゾーンによる推奨（IP位置情報ではありません）","manualReason":"手動で選択した地域","reviewed":"出典を確認済み（安全認証ではありません）","unverified":"外部サイト · 移動前に確認","source":"元の説明（中国語）"},"ko":{"auto":"브라우저 시간대 사용(IP 조회 없음)","everyday":"생활 서비스","public":"공공 정보","timezoneReason":"시간대 기반 추천(IP 위치 아님)","manualReason":"직접 선택한 지역","reviewed":"출처 확인됨(안전 인증 아님)","unverified":"외부 웹사이트 · 이동 전 확인","source":"원본 설명(중국어)"},"fr":{"auto":"Suggestion par fuseau horaire (sans recherche IP)","everyday":"Services du quotidien","public":"Informations publiques","timezoneReason":"Suggestion par fuseau horaire, pas par IP","manualReason":"Région choisie manuellement","reviewed":"Source vérifiée (pas une certification de sécurité)","unverified":"Site tiers · confirmer avant de quitter","source":"Description d’origine (chinois)"},"de":{"auto":"Vorschlag nach Zeitzone (ohne IP-Abfrage)","everyday":"Alltagsdienste","public":"Öffentliche Informationen","timezoneReason":"Zeitzonenhinweis, keine IP-Ortung","manualReason":"Manuell ausgewählte Region","reviewed":"Quelle geprüft (keine Sicherheitszertifizierung)","unverified":"Externe Website · vor dem Verlassen bestätigen","source":"Originalbeschreibung (Chinesisch)"},"es":{"auto":"Sugerencia por zona horaria (sin consultar IP)","everyday":"Servicios cotidianos","public":"Información pública","timezoneReason":"Sugerencia por zona horaria, no por IP","manualReason":"Región seleccionada manualmente","reviewed":"Fuente verificada (no certifica seguridad)","unverified":"Sitio de terceros · confirma antes de salir","source":"Descripción original (chino)"},"pt":{"auto":"Sugestão pelo fuso horário (sem consultar IP)","everyday":"Serviços do dia a dia","public":"Informação pública","timezoneReason":"Sugestão pelo fuso horário, não pelo IP","manualReason":"Região selecionada manualmente","reviewed":"Fonte verificada (não é certificação de segurança)","unverified":"Site externo · confirme antes de sair","source":"Descrição original (chinês)"},"it":{"auto":"Suggerimento dal fuso orario (senza ricerca IP)","everyday":"Servizi quotidiani","public":"Informazioni pubbliche","timezoneReason":"Suggerimento dal fuso orario, non dall’IP","manualReason":"Regione scelta manualmente","reviewed":"Fonte verificata (non certifica la sicurezza)","unverified":"Sito esterno · conferma prima di uscire","source":"Descrizione originale (cinese)"},"nl":{"auto":"Suggestie op basis van tijdzone (geen IP-controle)","everyday":"Dagelijkse diensten","public":"Openbare informatie","timezoneReason":"Tijdzonesuggestie, geen IP-locatie","manualReason":"Handmatig gekozen regio","reviewed":"Bron gecontroleerd (geen veiligheidscertificaat)","unverified":"Externe website · bevestig voordat je vertrekt","source":"Oorspronkelijke beschrijving (Chinees)"},"sv":{"auto":"Förslag via tidszon (ingen IP-kontroll)","everyday":"Vardagstjänster","public":"Offentlig information","timezoneReason":"Tidszonsförslag, inte IP-plats","manualReason":"Manuellt vald region","reviewed":"Källan granskad (ingen säkerhetscertifiering)","unverified":"Extern webbplats · bekräfta innan du lämnar","source":"Ursprunglig beskrivning (kinesiska)"},"no":{"auto":"Forslag fra tidssone (ingen IP-oppslag)","everyday":"Hverdagstjenester","public":"Offentlig informasjon","timezoneReason":"Tidssoneforslag, ikke IP-posisjon","manualReason":"Manuelt valgt region","reviewed":"Kilde kontrollert (ikke sikkerhetssertifisering)","unverified":"Eksternt nettsted · bekreft før du går videre","source":"Opprinnelig beskrivelse (kinesisk)"},"da":{"auto":"Forslag ud fra tidszone (intet IP-opslag)","everyday":"Daglige tjenester","public":"Offentlig information","timezoneReason":"Tidszoneforslag, ikke IP-placering","manualReason":"Manuelt valgt region","reviewed":"Kilde gennemgået (ikke sikkerhedscertificeret)","unverified":"Eksternt websted · bekræft før du fortsætter","source":"Oprindelig beskrivelse (kinesisk)"},"fi":{"auto":"Aikavyöhykesuositus (ei IP-hakua)","everyday":"Arjen palvelut","public":"Julkinen tieto","timezoneReason":"Aikavyöhykevinkki, ei IP-sijainti","manualReason":"Itse valittu alue","reviewed":"Lähde tarkistettu (ei turvallisuustakuu)","unverified":"Ulkopuolinen sivusto · vahvista ennen siirtymistä","source":"Alkuperäinen kuvaus (kiinaksi)"},"pl":{"auto":"Sugestia ze strefy czasowej (bez sprawdzania IP)","everyday":"Usługi codzienne","public":"Informacje publiczne","timezoneReason":"Sugestia strefy czasowej, nie lokalizacja IP","manualReason":"Region wybrany ręcznie","reviewed":"Źródło sprawdzone (nie jest certyfikatem bezpieczeństwa)","unverified":"Zewnętrzna witryna · potwierdź przed wyjściem","source":"Oryginalny opis (chiński)"},"cs":{"auto":"Doporučení podle časového pásma (bez IP)","everyday":"Každodenní služby","public":"Veřejné informace","timezoneReason":"Doporučení z časového pásma, nikoli IP polohy","manualReason":"Ručně vybraný region","reviewed":"Zdroj ověřen (ne certifikace bezpečnosti)","unverified":"Web třetí strany · před odchodem potvrďte","source":"Původní popis (čínsky)"},"sk":{"auto":"Odporúčanie podľa časového pásma (bez IP)","everyday":"Každodenné služby","public":"Verejné informácie","timezoneReason":"Návrh podľa pásma, nie polohy IP","manualReason":"Ručne zvolený región","reviewed":"Zdroj overený (nie certifikát bezpečnosti)","unverified":"Externý web · pred odchodom potvrďte","source":"Pôvodný opis (čínsky)"},"hu":{"auto":"Időzóna-alapú javaslat (IP-lekérdezés nélkül)","everyday":"Mindennapi szolgáltatások","public":"Nyilvános információk","timezoneReason":"Időzóna alapján, nem IP-hely alapján","manualReason":"Kézzel kiválasztott régió","reviewed":"Forrás ellenőrizve (nem biztonsági tanúsítvány)","unverified":"Külső webhely · továbblépés előtt erősítsd meg","source":"Eredeti leírás (kínai)"},"ro":{"auto":"Sugestie după fus orar (fără verificarea IP)","everyday":"Servicii cotidiene","public":"Informații publice","timezoneReason":"Sugestie după fus orar, nu după IP","manualReason":"Regiune selectată manual","reviewed":"Sursă verificată (nu certificare de securitate)","unverified":"Site extern · confirmă înainte de accesare","source":"Descriere originală (chineză)"},"bg":{"auto":"Предложение според часовата зона (без IP)","everyday":"Ежедневни услуги","public":"Обществена информация","timezoneReason":"По часова зона, не по IP адрес","manualReason":"Ръчно избран регион","reviewed":"Проверен източник (не е сертификат за сигурност)","unverified":"Външен сайт · потвърдете преди отваряне","source":"Оригинално описание (китайски)"},"hr":{"auto":"Prijedlog prema vremenskoj zoni (bez IP-a)","everyday":"Svakodnevne usluge","public":"Javne informacije","timezoneReason":"Prijedlog prema zoni, ne IP lokaciji","manualReason":"Ručno odabrana regija","reviewed":"Izvor provjeren (nije potvrda sigurnosti)","unverified":"Vanjska stranica · potvrdite prije odlaska","source":"Izvorni opis (kineski)"},"sr":{"auto":"Предлог према временској зони (без IP-а)","everyday":"Свакодневне услуге","public":"Јавне информације","timezoneReason":"Предлог по зони, не по IP локацији","manualReason":"Ручно изабрана регија","reviewed":"Извор проверен (није потврда безбедности)","unverified":"Спољни сајт · потврдите пре одласка","source":"Оригинални опис (кинески)"},"sl":{"auto":"Predlog glede na časovni pas (brez IP)","everyday":"Vsakodnevne storitve","public":"Javne informacije","timezoneReason":"Predlog po pasu, ne po IP lokaciji","manualReason":"Ročno izbrana regija","reviewed":"Vir preverjen (ni potrdilo o varnosti)","unverified":"Zunanje spletno mesto · potrdite pred odhodom","source":"Izvirni opis (kitajsko)"},"el":{"auto":"Πρόταση βάσει ζώνης ώρας (χωρίς έλεγχο IP)","everyday":"Καθημερινές υπηρεσίες","public":"Δημόσιες πληροφορίες","timezoneReason":"Πρόταση ζώνης ώρας, όχι τοποθεσία IP","manualReason":"Περιοχή που επιλέξατε","reviewed":"Ελεγμένη πηγή (όχι πιστοποίηση ασφάλειας)","unverified":"Εξωτερικός ιστότοπος · επιβεβαιώστε πριν φύγετε","source":"Αρχική περιγραφή (κινεζικά)"},"ru":{"auto":"Рекомендация по часовому поясу (без проверки IP)","everyday":"Повседневные сервисы","public":"Общедоступная информация","timezoneReason":"По часовому поясу, не по IP-адресу","manualReason":"Регион, выбранный вручную","reviewed":"Источник проверен (не гарантия безопасности)","unverified":"Сторонний сайт · подтвердите переход","source":"Исходное описание (китайский)"},"uk":{"auto":"Порада за часовим поясом (без перевірки IP)","everyday":"Повсякденні сервіси","public":"Публічна інформація","timezoneReason":"За часовим поясом, не за IP-адресою","manualReason":"Регіон, обраний вручну","reviewed":"Джерело перевірено (не гарантія безпеки)","unverified":"Сторонній сайт · підтвердьте перехід","source":"Оригінальний опис (китайська)"},"tr":{"auto":"Saat dilimine göre öneri (IP sorgusu yok)","everyday":"Günlük hizmetler","public":"Kamu bilgileri","timezoneReason":"Saat dilimi önerisi, IP konumu değil","manualReason":"Elle seçtiğiniz bölge","reviewed":"Kaynak doğrulandı (güvenlik sertifikası değil)","unverified":"Üçüncü taraf site · çıkmadan önce onaylayın","source":"Özgün açıklama (Çince)"},"ar":{"auto":"اقتراح حسب المنطقة الزمنية (دون فحص IP)","everyday":"خدمات يومية","public":"معلومات عامة","timezoneReason":"اقتراح حسب المنطقة الزمنية وليس موقع IP","manualReason":"المنطقة المختارة يدويًا","reviewed":"تم التحقق من المصدر (ليس شهادة أمان)","unverified":"موقع خارجي · أكّد قبل المغادرة","source":"الوصف الأصلي (بالصينية)"},"he":{"auto":"הצעה לפי אזור זמן (ללא בדיקת IP)","everyday":"שירותים יומיומיים","public":"מידע ציבורי","timezoneReason":"הצעה לפי אזור זמן, לא מיקום IP","manualReason":"אזור שנבחר ידנית","reviewed":"המקור נבדק (לא אישור בטיחות)","unverified":"אתר חיצוני · יש לאשר לפני המעבר","source":"תיאור מקורי (בסינית)"},"fa":{"auto":"پیشنهاد بر اساس منطقه زمانی (بدون بررسی IP)","everyday":"خدمات روزمره","public":"اطلاعات عمومی","timezoneReason":"پیشنهاد منطقه زمانی، نه موقعیت IP","manualReason":"منطقه انتخاب‌شده دستی","reviewed":"منبع بررسی شده (نه گواهی امنیتی)","unverified":"وب‌سایت خارجی · پیش از خروج تأیید کنید","source":"توضیح اصلی (چینی)"},"hi":{"auto":"समय क्षेत्र से सुझाव (IP जाँच नहीं)","everyday":"दैनिक सेवाएँ","public":"सार्वजनिक जानकारी","timezoneReason":"समय क्षेत्र आधारित सुझाव, IP स्थान नहीं","manualReason":"आपका चुना हुआ क्षेत्र","reviewed":"स्रोत जाँचा गया (सुरक्षा प्रमाणन नहीं)","unverified":"बाहरी वेबसाइट · आगे बढ़ने से पहले पुष्टि करें","source":"मूल विवरण (चीनी)"},"bn":{"auto":"সময় অঞ্চল অনুযায়ী পরামর্শ (IP পরীক্ষা নয়)","everyday":"দৈনন্দিন সেবা","public":"সর্বজনীন তথ্য","timezoneReason":"সময় অঞ্চল থেকে পরামর্শ, IP অবস্থান নয়","manualReason":"নিজে নির্বাচিত অঞ্চল","reviewed":"উৎস যাচাই করা (নিরাপত্তা সনদ নয়)","unverified":"বাহ্যিক ওয়েবসাইট · যাওয়ার আগে নিশ্চিত করুন","source":"মূল বিবরণ (চীনা)"},"ur":{"auto":"ٹائم زون کے مطابق تجویز (IP جانچ نہیں)","everyday":"روزمرہ خدمات","public":"عوامی معلومات","timezoneReason":"ٹائم زون کی تجویز، IP مقام نہیں","manualReason":"آپ کا منتخب علاقہ","reviewed":"ذریعہ جانچا گیا (حفاظتی سرٹیفکیٹ نہیں)","unverified":"بیرونی ویب سائٹ · جانے سے پہلے تصدیق کریں","source":"اصل تفصیل (چینی)"},"th":{"auto":"แนะนำตามเขตเวลา (ไม่ตรวจสอบ IP)","everyday":"บริการในชีวิตประจำวัน","public":"ข้อมูลสาธารณะ","timezoneReason":"คำแนะนำจากเขตเวลา ไม่ใช่ตำแหน่ง IP","manualReason":"ภูมิภาคที่เลือกเอง","reviewed":"ตรวจสอบแหล่งที่มาแล้ว (ไม่ใช่การรับรองความปลอดภัย)","unverified":"เว็บไซต์ภายนอก · ยืนยันก่อนออก","source":"คำอธิบายต้นฉบับ (ภาษาจีน)"},"vi":{"auto":"Gợi ý theo múi giờ (không tra cứu IP)","everyday":"Dịch vụ hằng ngày","public":"Thông tin công cộng","timezoneReason":"Gợi ý theo múi giờ, không phải vị trí IP","manualReason":"Khu vực bạn chọn","reviewed":"Đã kiểm tra nguồn (không chứng nhận an toàn)","unverified":"Trang bên thứ ba · xác nhận trước khi rời đi","source":"Mô tả gốc (tiếng Trung)"},"id":{"auto":"Saran berdasarkan zona waktu (tanpa cek IP)","everyday":"Layanan sehari-hari","public":"Informasi publik","timezoneReason":"Saran zona waktu, bukan lokasi IP","manualReason":"Wilayah yang Anda pilih","reviewed":"Sumber diperiksa (bukan sertifikasi keamanan)","unverified":"Situs pihak ketiga · konfirmasi sebelum keluar","source":"Deskripsi asli (bahasa Tionghoa)"},"ms":{"auto":"Cadangan mengikut zon waktu (tanpa semakan IP)","everyday":"Perkhidmatan harian","public":"Maklumat awam","timezoneReason":"Cadangan zon waktu, bukan lokasi IP","manualReason":"Wilayah pilihan anda","reviewed":"Sumber disemak (bukan pensijilan keselamatan)","unverified":"Laman pihak ketiga · sahkan sebelum keluar","source":"Penerangan asal (bahasa Cina)"},"fil":{"auto":"Mungkahi batay sa time zone (walang IP lookup)","everyday":"Pang-araw-araw na serbisyo","public":"Pampublikong impormasyon","timezoneReason":"Batay sa time zone, hindi lokasyon ng IP","manualReason":"Rehiyong manu-manong pinili","reviewed":"Sinuri ang pinagmulan (hindi sertipikasyon ng kaligtasan)","unverified":"Panlabas na site · kumpirmahin bago umalis","source":"Orihinal na paglalarawan (Chinese)"},"af":{"auto":"Voorstel volgens tydsone (geen IP-opsoek)","everyday":"Daaglikse dienste","public":"Openbare inligting","timezoneReason":"Tydsonevoorstel, nie IP-ligging nie","manualReason":"Handgekose streek","reviewed":"Bron nagegaan (nie veiligheidssertifisering nie)","unverified":"Derdeparty-webwerf · bevestig voor jy vertrek","source":"Oorspronklike beskrywing (Chinees)"},"sw":{"auto":"Pendekezo la saa za eneo (bila kuangalia IP)","everyday":"Huduma za kila siku","public":"Taarifa za umma","timezoneReason":"Pendekezo la saa za eneo, si mahali pa IP","manualReason":"Eneo ulilochagua","reviewed":"Chanzo kimekaguliwa (si uthibitisho wa usalama)","unverified":"Tovuti ya nje · thibitisha kabla ya kuondoka","source":"Maelezo asili (Kichina)"}});
 const C=(key)=>REGIONAL_COPY[locale()]?.[key]||REGIONAL_COPY.en[key]||'';
 const CATEGORY_EN=Object.freeze({"地图":"Maps","地球科学":"Earth sciences","天文":"Astronomy","学术":"Academic resources","实用":"Utilities","教育":"Education","数据":"Data","文化":"Culture","新闻":"News","旅游出行":"Travel and transport","法律政策":"Law and policy","环境气候":"Environment and climate","科技资讯":"Technology","科研":"Research","经济金融":"Economics and finance","语言":"Languages","阅读":"Reading"});
 const category=name=>{
   const translated=root.AVENQIR_I18N?.category(name)||name;
   return E()&&/[\u3400-\u9fff]/.test(translated)?CATEGORY_EN[name]||'Resources':translated;
 };
 const regionName=r=>{if(!E())return r.label;try{return new Intl.DisplayNames([locale()],{type:'region'}).of(r.code)||r.code;}catch{return r.code;}};
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
   const auto=el('option','',C('auto'));auto.value='auto';select.append(auto);
   const names={'东亚':'East Asia','东南亚':'Southeast Asia','南亚':'South Asia','中东':'Middle East','欧洲':'Europe','美洲':'Americas','大洋洲':'Oceania','非洲':'Africa'};
   const areaGroups=new Map();
   for(const r of api.regions){
     const label=E()?(names[r.area]||'Other regions'):(r.area||'其他地区');
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
    top.append(el('span','atlas-local-category',C(kind==='生活常用'?'everyday':'public')+' · '+category(item.category)),
      el('small','atlas-local-reason',E()?C(selected.source==='manual'?'manualReason':'timezoneReason'):reason));
    const a=el('a','atlas-local-link',item.name+' ↗');
    a.href=reviewed(item.url)?item.url:'leave.html?url='+encodeURIComponent(item.url)+'&name='+encodeURIComponent(item.name);
    a.referrerPolicy='no-referrer';a.rel='noopener noreferrer';
    a.addEventListener('click',e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();open(item.url,item.name);});
    const desc=el('p','atlas-local-description',E()?englishDescription(item,label):item.description);
    box.append(top,a,desc);
    if(E()&&/[\u3400-\u9fff]/.test(item.description||'')){
      const original=el('details','atlas-original-desc');
      original.append(el('summary','', C('source')),el('p','atlas-local-description',item.description));
      box.append(original);
    }
    box.append(el('small','atlas-local-trust',reviewed(item.url)?C('reviewed'):C('unverified')));
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
 const result=Object.freeze({mount,englishDescription,regionalCopy:REGIONAL_COPY});
 root.AVENQIR_ATLAS_REGION_UI=result;
 if(typeof module==='object'&&module.exports)module.exports=result;
})(typeof window!=='undefined'?window:globalThis);
