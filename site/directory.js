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
 const catalog=window.AVENQIR_ATLAS_CATALOG;
 if(!catalog)throw Error('目录核心未加载');
 const paths=window.AVENQIR_ATLAS_PATHS||{links:[],flows:[],itemsForFlow:()=>[]};
 const params=new URLSearchParams(location.search);
 const input=$('atlasQuery'),results=$('atlasResults'),cats=$('atlasCategories'),summary=$('atlasSummary'),source=$('atlasSource'),suggest=$('atlasSuggestions');
 const combine=catalog.combine;
 let records=catalog.catalog(), query=(params.get('q')||'').slice(0,140),category='',mode='all',limit=8,loaded=false,selectedFlow='',reviewedOnly=false;
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
 updateApprovals();drawPaths();choiceBar();draw();
 catalog.load().then(data=>{
  records=data.items;
  source.textContent=data.remote?'在线目录 + 本地精选':'内置精选目录（后台不可用）';
  loaded=true;choiceBar();draw();
  if(typeof afterCatalogLoad==='function')afterCatalogLoad();
 });
})();
