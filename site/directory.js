"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const safeUrl=v=>{try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
 const linkGate=window.AVENQIR_LINK_GATE;
 const externalDialog=$('atlasExternalDialog');
 const externalGo=$('atlasExternalGo');
 const rememberBox=$('atlasRemember');
 let storage=null;try{storage=window.localStorage}catch{}
 const isAllowed=url=>!!linkGate?.maySkipConfirmation(url,storage);
 const dangerous=url=>linkGate?.urlRisk(url)?.blocked!==false;
 function updateApprovals(){const n=linkGate?.approvalCount(storage)||0;const status=$('atlasApprovalCount');if(status)status.textContent=n?'本机已记住 '+n+' 个第三方网址（30 天自动过期）':'本机没有记住的第三方网址';}
 $('atlasClearApprovals')?.addEventListener('click',()=>{if(!confirm('清除本机所有已记住的网址选择？清除后下次访问需要重新确认。'))return;linkGate?.clearRemembered(storage);updateApprovals();draw();});
 let awaitingExternal=null;
 function showExternal(url,name){
   const href=safeUrl(url);
   if(!href)return;
   if(dangerous(href))return;
   if(isAllowed(href)){
     window.location.assign(href);
     return;
   }
   const u=new URL(href);
   awaitingExternal=href;
   if(rememberBox){rememberBox.checked=false;rememberBox.disabled=!linkGate?.urlRisk(href)?.rememberable;rememberBox.closest('label').hidden=rememberBox.disabled;}
   $('atlasExternalName').textContent=String(name||u.hostname).slice(0,90);
   $('atlasExternalHost').textContent='访问域名：'+u.hostname;
   $('atlasExternalUrl').textContent=href;
   if(externalDialog&&typeof externalDialog.showModal==='function'){
     externalDialog.showModal();
     $('atlasExternalCancel').focus();
   }else{
     if(confirm('即将前往未核验第三方域名 '+u.hostname+'。本站不保证该网站安全，确认继续访问？'))window.location.assign(href);
     awaitingExternal=null;
   }
 }
 if(externalGo)externalGo.addEventListener('click',()=>{
   const href=awaitingExternal;
   if(href&&rememberBox?.checked)linkGate?.remember(href,storage);
   awaitingExternal=null;
   if(externalDialog?.open)externalDialog.close();
   if(href&&!dangerous(href)&&safeUrl(href))window.location.assign(href);
 });
 externalDialog?.addEventListener('close',()=>{awaitingExternal=null;});
 const initialData=[{"id":"r1","name":"GitHub","url":"https://github.com/","category":"开发","description":"开源项目与代码仓库"},{"id":"r2","name":"MDN Web Docs","url":"https://developer.mozilla.org/zh-CN/","category":"开发","description":"Web 开发技术文档"},{"id":"r3","name":"Can I use","url":"https://caniuse.com/","category":"开发","description":"浏览器兼容性查询"},{"id":"r4","name":"Internet Archive","url":"https://archive.org/","category":"互联网","description":"历史网页与公共资源"},{"id":"r5","name":"Project Gutenberg","url":"https://www.gutenberg.org/","category":"阅读","description":"公版电子书资源"},{"id":"r6","name":"OpenStreetMap","url":"https://www.openstreetmap.org/","category":"地图","description":"开放地图数据与社区"},{"id":"r7","name":"Wikimedia Commons","url":"https://commons.wikimedia.org/","category":"创作","description":"自由许可媒体素材"},{"id":"r8","name":"Pixabay","url":"https://pixabay.com/","category":"创作","description":"可浏览图片与视频素材，注意单项授权"},{"id":"r9","name":"Photopea","url":"https://www.photopea.com/","category":"创作","description":"浏览器图片与 PSD 编辑器"},{"id":"r10","name":"Excalidraw","url":"https://excalidraw.com/","category":"创作","description":"在线白板与手绘流程图"},{"id":"r11","name":"Khan Academy","url":"https://www.khanacademy.org/","category":"教育","description":"开放课程学习"},{"id":"r12","name":"MIT OpenCourseWare","url":"https://ocw.mit.edu/","category":"教育","description":"麻省理工学院开放课程"},{"id":"r13","name":"Google Scholar","url":"https://scholar.google.com/","category":"学术","description":"学术搜索"},{"id":"r14","name":"arXiv","url":"https://arxiv.org/","category":"学术","description":"预印本公开检索"},{"id":"r15","name":"NASA Image Library","url":"https://images.nasa.gov/","category":"科学","description":"NASA 图片与视频资源"},{"id":"r16","name":"NIST Chemistry WebBook","url":"https://webbook.nist.gov/chemistry/","category":"科学","description":"化学物性检索"},{"id":"r17","name":"Cloudflare Radar","url":"https://radar.cloudflare.com/","category":"网络","description":"互联网趋势和网络信息"},{"id":"r18","name":"BrowserLeaks","url":"https://browserleaks.com/","category":"网络","description":"浏览器 API 和 WebRTC 检测"},{"id":"r19","name":"DNSChecker","url":"https://dnschecker.org/","category":"网络","description":"DNS 传播查看"},{"id":"r20","name":"SSL Labs","url":"https://www.ssllabs.com/ssltest/","category":"网络","description":"网站 HTTPS 检测"},{"id":"r21","name":"Speedtest","url":"https://www.speedtest.net/","category":"实用","description":"网络速度测试"},{"id":"r22","name":"time.is","url":"https://time.is/","category":"实用","description":"准确时间与时区显示"},{"id":"r23","name":"Have I Been Pwned","url":"https://haveibeenpwned.com/","category":"安全","description":"查询邮箱是否涉及已知泄漏"},{"id":"r24","name":"VirusTotal","url":"https://www.virustotal.com/gui/home/url","category":"安全","description":"可疑公开 URL 分析；切勿上传私密文件"},{"id":"r25","name":"Open Library","url":"https://openlibrary.org/","category":"阅读","description":"图书目录与借阅信息"},{"id":"r26","name":"The Guardian","url":"https://www.theguardian.com/","category":"新闻","description":"英文新闻"},{"id":"r27","name":"BBC News","url":"https://www.bbc.com/news","category":"新闻","description":"国际新闻"},{"id":"r28","name":"itch.io","url":"https://itch.io/games/free","category":"休闲","description":"免费独立游戏"},{"id":"r29","name":"Chess.com","url":"https://www.chess.com/","category":"休闲","description":"国际象棋"},{"id":"r30","name":"GeoGuessr","url":"https://www.geoguessr.com/","category":"休闲","description":"地理探索游戏（部分功能可能付费）"}];

 const extraData=[{"id":"e31","name":"PhET 交互模拟","url":"https://phet.colorado.edu/","category":"教育","description":"科罗拉多大学的物理、化学和数学交互学习"},{"id":"e32","name":"GeoGebra","url":"https://www.geogebra.org/","category":"教育","description":"函数、几何、代数与互动数学工具"},{"id":"e33","name":"Desmos 图形计算器","url":"https://www.desmos.com/calculator","category":"数学","description":"交互式函数图像和数据可视化"},{"id":"e34","name":"WolframAlpha","url":"https://www.wolframalpha.com/","category":"数学","description":"数学与知识计算搜索，部分高级功能收费"},{"id":"e35","name":"ZoteroBib","url":"https://zbib.org/","category":"学术","description":"Zotero 团队的在线参考文献生成工具"},{"id":"e36","name":"Crossref Metadata Search","url":"https://search.crossref.org/","category":"学术","description":"通过标题、作者和 DOI 检索文献元数据"},{"id":"e37","name":"Our World in Data","url":"https://ourworldindata.org/","category":"数据","description":"全球社会、环境与经济数据图表"},{"id":"e38","name":"PubMed","url":"https://pubmed.ncbi.nlm.nih.gov/","category":"学术","description":"生命科学与生物医学论文检索"},{"id":"e39","name":"Wikidata","url":"https://www.wikidata.org/","category":"数据","description":"开放结构化知识库"},{"id":"e40","name":"NASA Eyes","url":"https://science.nasa.gov/eyes/","category":"科学","description":"NASA 太阳系、地球与太空任务可视化"},{"id":"e41","name":"NASA 互动资源","url":"https://www.nasa.gov/interactives/","category":"科学","description":"NASA 互动科学活动与探索资源"},{"id":"e42","name":"Stellarium Web","url":"https://stellarium-web.org/","category":"科学","description":"浏览器中的星空与天体位置模拟"},{"id":"e43","name":"CyberChef","url":"https://gchq.github.io/CyberChef/","category":"开发","description":"GCHQ 的编解码与数据处理工具，切勿输入密钥"},{"id":"e44","name":"PageSpeed Insights","url":"https://pagespeed.web.dev/","category":"开发","description":"网页性能和 Core Web Vitals 评估"},{"id":"e45","name":"web.dev","url":"https://web.dev/","category":"开发","description":"现代网页性能、兼容性和最佳实践"},{"id":"e46","name":"WebAIM WAVE","url":"https://wave.webaim.org/","category":"开发","description":"网页可访问性评估和人工检查辅助"},{"id":"e47","name":"Internet.nl","url":"https://internet.nl/","category":"网络","description":"网站 HTTPS、DNSSEC、IPv6 与邮件标准检测"},{"id":"e48","name":"Google Safe Browsing","url":"https://safebrowsing.google.com/","category":"安全","description":"了解 Google 安全浏览与网站危险状态检查"},{"id":"e49","name":"urlscan.io","url":"https://urlscan.io/","category":"安全","description":"网页行为分析；公开扫描可能暴露提交的网址"},{"id":"e50","name":"Openverse","url":"https://openverse.org/","category":"创作","description":"检索开放许可图片和音频，仍需核对具体许可"},{"id":"e51","name":"Google Fonts","url":"https://fonts.google.com/","category":"创作","description":"可用于网页设计的开源字体目录"},{"id":"e52","name":"Blender","url":"https://www.blender.org/","category":"创作","description":"开源 3D 建模、动画与渲染"},{"id":"e53","name":"GIMP","url":"https://www.gimp.org/","category":"创作","description":"开源图像编辑器"},{"id":"e54","name":"Inkscape","url":"https://inkscape.org/","category":"创作","description":"开源 SVG 矢量图形编辑软件"},{"id":"e55","name":"Materials Project","url":"https://materialsproject.org/","category":"材料","description":"计算材料数据库与晶体结构、能量性质检索"},{"id":"e56","name":"MatWeb","url":"https://www.matweb.com/","category":"材料","description":"金属、聚合物、陶瓷与复合材料性能表"},{"id":"e57","name":"Crystallography Open Database","url":"https://www.crystallography.net/cod/","category":"材料","description":"开放晶体结构数据，适用于结构分析"},{"id":"e58","name":"NIST JARVIS","url":"https://jarvis.nist.gov/","category":"材料","description":"NIST 计算材料科学与多尺度数据平台"},{"id":"e59","name":"Materials Cloud","url":"https://www.materialscloud.org/","category":"材料","description":"计算材料数据、工作流与研究资源"},{"id":"e60","name":"nanoHUB","url":"https://nanohub.org/","category":"材料","description":"纳米科学教学、模拟和研究平台"},{"id":"e61","name":"RSC 元素周期表","url":"https://www.rsc.org/periodic-table","category":"化学","description":"英国皇家化学会元素与性质资料"},{"id":"e62","name":"RCSB PDB","url":"https://www.rcsb.org/","category":"科研","description":"蛋白质和生物分子三维结构数据库"},{"id":"e63","name":"OpenAlex","url":"https://openalex.org/","category":"学术","description":"开放学术文献、作者、机构和引文关联"},{"id":"e64","name":"Semantic Scholar","url":"https://www.semanticscholar.org/","category":"学术","description":"跨学科学术论文与引文检索"},{"id":"e65","name":"DOAJ","url":"https://doaj.org/","category":"学术","description":"开放获取期刊目录及论文检索"},{"id":"e66","name":"CORE","url":"https://core.ac.uk/","category":"学术","description":"开放论文与学术仓储检索"},{"id":"e67","name":"Europe PMC","url":"https://europepmc.org/","category":"学术","description":"生命科学论文与预印本检索"},{"id":"e68","name":"Zotero","url":"https://www.zotero.org/","category":"学术","description":"参考文献管理、阅读和整理"},{"id":"e69","name":"OpenStax","url":"https://openstax.org/","category":"教育","description":"免费开放教材，涵盖物理、化学、数学"},{"id":"e70","name":"LibreTexts","url":"https://libretexts.org/","category":"教育","description":"开放教材与教学资源库"},{"id":"e71","name":"W3C HTML Validator","url":"https://validator.w3.org/","category":"开发","description":"W3C 网页标记语法检查"},{"id":"e72","name":"W3C CSS Validator","url":"https://jigsaw.w3.org/css-validator/","category":"开发","description":"W3C CSS 样式表验证"},{"id":"e73","name":"OWASP Cheat Sheets","url":"https://cheatsheetseries.owasp.org/","category":"安全","description":"应用开发安全实践与防护指南"},{"id":"e74","name":"Mozilla Observatory","url":"https://developer.mozilla.org/en-US/observatory","category":"安全","description":"网站安全响应头与配置评估"},{"id":"e75","name":"WebPageTest","url":"https://www.webpagetest.org/","category":"开发","description":"网站页面加载速度和性能分析"},{"id":"e76","name":"regex101","url":"https://regex101.com/","category":"开发","description":"正则表达式测试和语法解释"},{"id":"e77","name":"JSON Schema","url":"https://json-schema.org/","category":"开发","description":"JSON 数据结构规范和验证资料"},{"id":"e78","name":"Mermaid Live","url":"https://mermaid.live/","category":"开发","description":"流程图和结构化文本图表编辑"},{"id":"e79","name":"diagrams.net","url":"https://app.diagrams.net/","category":"创作","description":"在线流程图、架构图与概念图"},{"id":"e80","name":"Wireshark","url":"https://www.wireshark.org/","category":"网络","description":"开源网络协议分析软件"},{"id":"e81","name":"Let's Encrypt","url":"https://letsencrypt.org/","category":"网络","description":"免费自动化 TLS 证书项目"},{"id":"e82","name":"EFF","url":"https://www.eff.org/","category":"安全","description":"电子前哨基金会数字权利与隐私资源"},{"id":"e83","name":"OpenRefine","url":"https://openrefine.org/","category":"数据","description":"开源结构化数据清洗与转换"},{"id":"e84","name":"Software Heritage","url":"https://www.softwareheritage.org/","category":"开发","description":"公共软件源码历史归档项目"},{"id":"e85","name":"Data Commons","url":"https://datacommons.org/","category":"数据","description":"开放统计数据与地理知识关联"},{"id":"e86","name":"Wolfram MathWorld","url":"https://mathworld.wolfram.com/","category":"数学","description":"数学概念、公式和定义参考"},{"id":"e87","name":"OEIS","url":"https://oeis.org/","category":"数学","description":"整数数列在线百科数据库"},{"id":"e88","name":"World Bank Open Data","url":"https://data.worldbank.org/","category":"数据","description":"世界银行开放经济与发展指标"},{"id":"e89","name":"UNdata","url":"https://data.un.org/","category":"数据","description":"联合国统计数据查询入口"},{"id":"e90","name":"Codeberg","url":"https://codeberg.org/","category":"开发","description":"社区驱动开源代码托管"},{"id":"e91","name":"GitLab","url":"https://gitlab.com/","category":"开发","description":"代码管理、CI/CD 和协作平台"},{"id":"e92","name":"Internet Society","url":"https://www.internetsociety.org/","category":"网络","description":"互联网开放性与标准政策倡议"},{"id":"e93","name":"Stanford Encyclopedia of Philosophy","url":"https://plato.stanford.edu/","category":"阅读","description":"专家编写的斯坦福哲学百科"},{"id":"e94","name":"Project Euler","url":"https://projecteuler.net/","category":"数学","description":"数学与编程结合的挑战题"}];
 const paths=window.AVENQIR_ATLAS_PATHS||{links:[],flows:[],itemsForFlow:()=>[]};
 const params=new URLSearchParams(location.search);
 const input=$('atlasQuery'),results=$('atlasResults'),cats=$('atlasCategories'),summary=$('atlasSummary'),source=$('atlasSource'),suggest=$('atlasSuggestions');
 const combine=(base,more)=>{const urls=new Set();return [...base,...more].filter(item=>{const value=safeUrl(item.url);if(!value||urls.has(value))return false;urls.add(value);return true;});};
 let records=combine(combine(initialData,extraData),paths.links), query=(params.get('q')||'').slice(0,140),category='',mode='all',limit=8,loaded=false,selectedFlow='',reviewedOnly=false;
 const key='avenqir.link-atlas.favorites.v8';let favorites=[];
 try{const v=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(v))favorites=v.filter(x=>typeof x==='string').slice(0,500)}catch{}
 input.value=query;
 const normalize=x=>String(x||'').toLocaleLowerCase().normalize('NFKC').trim();
 const meaningful=x=>[x.name,x.url,x.category,x.description].map(normalize);
 function score(x){if(!query)return 1;const terms=normalize(query).split(/\s+/).filter(Boolean);const fields=meaningful(x);
   if(!terms.every(w=>fields.some(v=>v.includes(w))))return -1;
   return terms.reduce((acc,t)=>acc+(fields[0]===t?12:fields[0].startsWith(t)?8:fields[0].includes(t)?6:0)+(fields[1].includes(t)?4:0)+(fields[2].includes(t)?3:0)+(fields[3].includes(t)?1:0),0);
 }
 function filtered(){const flow=paths.flows.find(f=>f.id===selectedFlow);const selectedUrls=flow?new Set(flow.urls):null;
   let r=records.map(x=>({x,rank:score(x)})).filter(({x,rank})=>rank>=0&&(!category||x.category===category)&&(mode!=='saved'||favorites.includes(x.url))&&(!selectedUrls||selectedUrls.has(x.url))&&(!reviewedOnly||!!linkGate?.officialSourceReviewed(x.url)));
   if($('atlasSort').value==='name')r.sort((a,b)=>a.x.name.localeCompare(b.x.name,'zh-CN'));
   else if(query)r.sort((a,b)=>b.rank-a.rank||a.x.name.localeCompare(b.x.name,'zh-CN'));
   else if(selectedUrls)r.sort((a,b)=>flow.urls.indexOf(a.x.url)-flow.urls.indexOf(b.x.url));
   return r.map(y=>y.x);
 }
 function storeFavorites(){try{localStorage.setItem(key,JSON.stringify(favorites))}catch{}}
 function drawPaths(){
   const wrap=$('atlasFlowGrid');if(!wrap)return;
   wrap.replaceChildren();
   for(const f of paths.flows){
     const b=el('button','atlas-flow-card'+(selectedFlow===f.id?' selected':''));b.type='button';
     b.setAttribute('aria-pressed',String(selectedFlow===f.id));
     b.append(el('span','atlas-flow-icon',f.icon),el('strong','',f.title),el('small','',f.subtitle));
     const note=el('span','atlas-flow-note',f.note);b.append(note);
     b.addEventListener('click',()=>{
       selectedFlow=selectedFlow===f.id?'':f.id;category='';mode='all';query='';input.value='';limit=8;
       const u=new URL(location.href);u.searchParams.delete('q');history.replaceState(null,'',u.pathname+u.search+u.hash);
       document.querySelectorAll('[data-tab]').forEach(t=>{const active=t.dataset.tab==='all';t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active));});
       refreshEngines();suggestClose();drawPaths();choiceBar();draw();
       $('atlasResults').scrollIntoView({behavior:'smooth',block:'start'});
     });
     wrap.append(b);
   }
   const reset=$('atlasResetFlow');if(reset)reset.hidden=!selectedFlow;
   const info=$('atlasFlowStatus');if(info)info.textContent=selectedFlow?'已选择：'+paths.flows.find(f=>f.id===selectedFlow).title+' · 按推荐步骤排列':'选择一个任务场景，直接查看对应资源和使用顺序';
 }
 $('atlasResetFlow')?.addEventListener('click',()=>{selectedFlow='';drawPaths();draw();});
 const reviewedBox=$('atlasReviewedOnly');
 reviewedBox?.addEventListener('change',()=>{reviewedOnly=!!reviewedBox.checked;limit=8;draw();});
 $('atlasExportFavorites')?.addEventListener('click',()=>{
   const items=records.filter(x=>favorites.includes(x.url)).map(x=>({name:x.name,url:x.url,category:x.category,description:x.description}));
   const msg=$('atlasExportStatus');
   if(!items.length){if(msg)msg.textContent='目前没有收藏的网址。';return;}
   try{
     const payload={format:'avenqir-atlas-favorites-v1',exportedAt:new Date().toISOString(),items};
     const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
     const href=URL.createObjectURL(blob),a=document.createElement('a');
     a.href=href;a.download='avenqir-atlas-favorites-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();
     setTimeout(()=>URL.revokeObjectURL(href),10000);
     if(msg)msg.textContent='已导出 '+items.length+' 条收藏；完整跨设备恢复请使用“数据迁移”。';
   }catch(e){if(msg)msg.textContent='无法导出：'+String(e.message||e).slice(0,100);}
 });
 function choiceBar(){let counts=new Map();records.forEach(r=>counts.set(r.category,(counts.get(r.category)||0)+1));let entries=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));
   cats.replaceChildren();const add=(name,count)=>{let b=el('button','atlas-cat'+(category===name?' selected':''),name||'全部');b.type='button';b.setAttribute('aria-pressed',String(category===name));b.addEventListener('click',()=>{category=name;limit=8;choiceBar();draw()});cats.append(b)};add('',records.length);entries.forEach(([name,count])=>add(name,count));
   const side=$('atlasCategoryCount');side.replaceChildren();entries.slice(0,12).forEach(([name,count])=>{let b=el('button','',name+' '+count);b.type='button';b.addEventListener('click',()=>{category=name;limit=8;choiceBar();draw();window.scrollTo({top:Math.max(0,$('atlasResults').getBoundingClientRect().top+window.scrollY-150),behavior:'smooth'})});side.append(b)});
 }
 function replaceQuery(v){query=v.slice(0,140);input.value=query;limit=8;draw();const u=new URL(location.href);query?u.searchParams.set('q',query):u.searchParams.delete('q');history.replaceState(null,'',u.pathname+u.search+u.hash)}
 function suggestClose(){suggest.hidden=true;suggest.replaceChildren()}
 function suggestions(){const q=normalize(input.value);suggest.replaceChildren();if(q.length<2){suggestClose();return}
   const matched=records.filter(r=>meaningful(r).some(v=>v.includes(q))).slice(0,5);if(!matched.length){suggestClose();return}
   matched.forEach(r=>{const b=el('button','atlas-suggest-item',r.name);b.type='button';b.setAttribute('role','option');b.append(el('small','',new URL(r.url).hostname+' · '+r.category));b.addEventListener('click',()=>{replaceQuery(r.name);suggestClose();input.focus()});suggest.append(b)});suggest.hidden=false;
 }
 function draw(){const list=filtered(), shown=list.slice(0,limit);results.replaceChildren();$('atlasEmpty').hidden=list.length!==0;
   $('resultsTitle').textContent=mode==='saved'?'我的收藏':selectedFlow?paths.flows.find(f=>f.id===selectedFlow).title:query?'搜索结果':category?category+' · 网站':'精选网站';
   summary.textContent=(query?'匹配':'目录')+' '+list.length+' 个网站'+(list.length>limit?' · 已显示前 '+shown.length+' 条':'')+(category?' · 分类：'+category:'');
   for(const x of shown){const url=safeUrl(x.url);if(!url)continue;const host=new URL(url).hostname;
     const card=el('article','atlas-result');const icon=el('div','atlas-result-icon',x.name.slice(0,1).toLocaleUpperCase());icon.setAttribute('aria-hidden','true');
     const data=el('div','atlas-result-info');const hostrow=el('div','atlas-hostline');hostrow.append(el('span','atlas-host',host),el('span','atlas-chip',x.category||'其他'));data.append(hostrow);
     const a=el('a','atlas-result-title',x.name+' ↗');const reviewed=!!linkGate?.officialSourceReviewed(url);const permitted=isAllowed(url);a.href=permitted?url:'leave.html?url='+encodeURIComponent(url)+'&name='+encodeURIComponent(x.name);a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';a.addEventListener('click',e=>{if(!permitted){e.preventDefault();showExternal(url,x.name);}});data.append(a);data.append(el('small',permitted?'atlas-review-ok':'atlas-review-unknown',reviewed?'官方来源已核对 · 直接访问':permitted?'本机已记住 · 直接访问':'第三方来源未核验 · 点击后确认'));
     data.append(el('p','atlas-result-desc',x.description||'访问网站'));
     const report=el('a','atlas-report-link','报告失效 ↗');report.href='feedback.php?type=broken&url='+encodeURIComponent(url);report.setAttribute('aria-label','报告 '+x.name+' 链接失效');data.append(report);
     const star=el('button','atlas-star'+(favorites.includes(x.url)?' saved':''),favorites.includes(x.url)?'★':'☆');star.type='button';star.title=favorites.includes(x.url)?'取消收藏':'收藏到本机';star.setAttribute('aria-label',star.title);star.addEventListener('click',()=>{if(favorites.includes(x.url))favorites=favorites.filter(u=>u!==x.url);else favorites.push(x.url);storeFavorites();draw()});
     card.append(icon,data,star);results.append(card);
   }
   $('atlasMore').hidden=list.length<=shown.length;
 }
 const tabs=[...document.querySelectorAll('[data-tab]')];tabs.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.tab;limit=8;tabs.forEach(t=>{let active=t===b;t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active))});draw()}));
 $('atlasSort').addEventListener('change',draw);
 input.addEventListener('input',()=>{query=input.value.slice(0,140);limit=8;draw();suggestions()});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!suggest.hidden){suggestClose()}else{replaceQuery('')}e.preventDefault()}});
 $('atlasForm').addEventListener('submit',e=>{e.preventDefault();replaceQuery(input.value);suggestClose()});
 $('atlasClear').addEventListener('click',()=>{replaceQuery('');suggestClose();input.focus()});
 $('atlasMore').addEventListener('click',()=>{limit+=12;draw()});
 $('atlasRandom').addEventListener('click',()=>{let entries=filtered();if(!entries.length)entries=records;const entry=entries[Math.floor(Math.random()*entries.length)];if(entry)showExternal(entry.url,entry.name)});
 const engineLinks=[...document.querySelectorAll('[data-search-provider]')];
 function refreshEngines(){for(const a of engineLinks){const target=linkGate?.searchEngineDestination(a.dataset.searchProvider,input.value);if(target)a.href=target;}}
 input.addEventListener('input',refreshEngines);
 for(const a of engineLinks)a.addEventListener('click',refreshEngines);
 refreshEngines();
 document.addEventListener('keydown',e=>{const t=e.target;const typing=t&&(t.matches('input,textarea,select')||t.isContentEditable);if((e.key==='/'&&!typing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();input.focus();input.select()}});
 document.addEventListener('click',e=>{if(!e.target.closest('.atlas-search-form'))suggestClose()});
 function sanitize(rows){if(!Array.isArray(rows)||rows.length>500)throw Error('记录数量异常');return rows.filter(x=>x&&typeof x.name==='string'&&typeof x.category==='string'&&typeof x.description==='string'&&safeUrl(x.url)).map(x=>({name:x.name.slice(0,90),category:x.category.slice(0,40),url:safeUrl(x.url),description:x.description.slice(0,320)}))}
 updateApprovals();drawPaths();choiceBar();draw();
 (async()=>{const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),7000);try{const r=await fetch('public-api.php?ts='+Date.now(),{cache:'no-store',signal:ctl.signal,credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);if(!(r.headers.get('content-type')||'').includes('application/json'))throw Error('缺少 JSON 响应');const data=await r.json();if(data.ok!==true)throw Error('API 数据无效');records=combine(combine(combine(sanitize(data.items),initialData),extraData),paths.links);source.textContent='公开目录 · 管理数据 + 精选资源';loaded=true;choiceBar();draw()}catch(e){source.textContent='使用内置目录';summary.textContent='无法实时读取后台，显示内置示例（不会覆盖已有数据）';console.warn('Avenqir directory fallback:',e.message)}finally{clearTimeout(timer)}})();
})();