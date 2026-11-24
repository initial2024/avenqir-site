"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const safeUrl=v=>{try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
 const linkGate=window.AVENQIR_LINK_GATE;
 const safety=window.AVENQIR_ATLAS_SAFETY;
 const finder=window.AVENQIR_ATLAS_FIND;
 const enrichment=window.AVENQIR_ATLAS_ENRICH;
 const locale=()=>window.AVENQIR_I18N;
 const trCategory=name=>locale()?.category(name)||name;
 const english=()=>!!locale()&&!locale().locale.startsWith('zh-');
 const T=(cn,en)=>english()?en:cn;
 const externalDialog=$('atlasExternalDialog');
 const externalGo=$('atlasExternalGo');
 const rememberBox=$('atlasRemember');
 let storage=null;try{storage=window.localStorage}catch{}
 const isAllowed=url=>!!linkGate?.maySkipConfirmation(url,storage);
 const dangerous=url=>linkGate?.urlRisk(url)?.blocked!==false;
 function updateApprovals(){const n=linkGate?.approvalCount(storage)||0;const status=$('atlasApprovalCount');if(status)status.textContent=n?T('本机已记住 '+n+' 个第三方网址（30 天自动过期）','Remembered '+n+' external URLs (expire after 30 days)'):T('本机没有记住的第三方网址','No external URL preferences saved');}
 $('atlasClearApprovals')?.addEventListener('click',()=>{if(!confirm(T('清除本机所有已记住的网址选择？清除后下次访问需要重新确认。','Clear all remembered external confirmations? Links will ask again.')))return;linkGate?.clearRemembered(storage);updateApprovals();draw();});
 let awaitingExternal=null;
 function showExternal(url,name){
   const href=safeUrl(url);
   if(!href)return;
   if(dangerous(href))return;
   if(isAllowed(href)){
     trackOpen(href);
     window.location.assign(href);
     return;
   }
   const u=new URL(href);
   awaitingExternal=href;
   if(rememberBox){rememberBox.checked=false;rememberBox.disabled=!linkGate?.urlRisk(href)?.rememberable;rememberBox.closest('label').hidden=rememberBox.disabled;}
   $('atlasExternalName').textContent=String(name||u.hostname).slice(0,90);
   $('atlasExternalHost').textContent=T('访问域名：','Destination host: ')+u.hostname;
   $('atlasExternalUrl').textContent=href;
   if(externalDialog&&typeof externalDialog.showModal==='function'){
     externalDialog.showModal();
     $('atlasExternalCancel').focus();
   }else{
     if(confirm(T('即将前往未核验第三方域名 '+u.hostname+'。本站不保证该网站安全，确认继续访问？','Leaving for unverified third-party domain '+u.hostname+'. This site cannot guarantee safety. Continue?'))){trackOpen(href);window.location.assign(href);}
     awaitingExternal=null;
   }
 }
 if(externalGo)externalGo.addEventListener('click',()=>{
   const href=awaitingExternal;
   if(href&&rememberBox?.checked)linkGate?.remember(href,storage);
   awaitingExternal=null;
   if(externalDialog?.open)externalDialog.close();
   if(href&&!dangerous(href)&&safeUrl(href)){trackOpen(href);window.location.assign(href);}
 });
 externalDialog?.addEventListener('close',()=>{awaitingExternal=null;});
 const catalog=window.AVENQIR_ATLAS_CATALOG;
 if(!catalog)throw Error('目录核心未加载');
 const paths=window.AVENQIR_ATLAS_PATHS||{links:[],flows:[],itemsForFlow:()=>[]};
 const guides=window.AVENQIR_ATLAS_GUIDES;
 const guideProgress=new Map();
 const taxonomy=window.AVENQIR_ATLAS_TAXONOMY||{groups:[],categoriesFor:()=>[],groupFor:()=>null};
 let quickQuery='';
 try{quickQuery=sessionStorage.getItem('avenqir.atlas.quick-query.v90')||'';sessionStorage.removeItem('avenqir.atlas.quick-query.v90');}catch{}
 const params=new URLSearchParams(location.search);
 const input=$('atlasQuery'),results=$('atlasResults'),cats=$('atlasCategories'),summary=$('atlasSummary'),source=$('atlasSource'),suggest=$('atlasSuggestions');
 const combine=catalog.combine;
 let records=catalog.catalog(), query=(params.get('q')||quickQuery||'').slice(0,140),category='',mode='all',limit=24,loaded=false,selectedFlow='',reviewedOnly=false,groupId='',expandedCategories=false;
 const key='avenqir.link-atlas.favorites.v8';let favorites=[],compareUrls=[];let pendingNoMatchQuery=query.trim();
 const multiCategories=new Set();
 const recentKey='avenqir.atlas.session-opens.v90';
 let sessionOpens=[];
 try{const raw=JSON.parse(sessionStorage.getItem(recentKey)||'[]');if(Array.isArray(raw))sessionOpens=raw.filter(x=>typeof x==='string').slice(0,100);}catch{}
 const multiOn=()=>!!$('atlasMultiCategory')?.checked;
 const languageMode=()=>$('atlasSiteLanguageMode')?.value||'prefer';
 const languageRank=item=>enrichment?.priority(item,locale()?.locale)||1;
 let localRecommendations=null;
 let regionRecommendations=null;
 function trackOpen(url){
   const item=records.find(x=>x.url===url);
   if(item)localRecommendations?.recordOpen(item.category);
   sessionOpens=[url,...sessionOpens.filter(x=>x!==url)].slice(0,100);
   try{sessionStorage.setItem(recentKey,JSON.stringify(sessionOpens));}catch{}
 }
 try{const v=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(v))favorites=v.filter(x=>typeof x==='string').slice(0,500)}catch{}
 input.value=query;
 const normalize=x=>String(x||'').toLocaleLowerCase().normalize('NFKC').trim();
 const meaningful=x=>[x.name,x.url,x.category,x.description].map(normalize);
 function score(x){if(!query)return 1;const terms=normalize(query).split(/\s+/).filter(Boolean);const fields=meaningful(x);
   if(!terms.every(w=>fields.some(v=>v.includes(w))||(/^[a-z]{2,20}$/.test(w)&&finder?.matches(w,[x.name,x.category]))))return -1;
   return terms.reduce((acc,t)=>acc+(fields[0]===t?12:fields[0].startsWith(t)?8:fields[0].includes(t)?6:0)+(fields[1].includes(t)?4:0)+(fields[2].includes(t)?3:0)+(fields[3].includes(t)?1:0),0);
 }
 function matchingGroup(x){
   if(!groupId)return true;
   if(groupId==='other')return !taxonomy.groupFor(x.category);
   return taxonomy.groupFor(x.category)===groupId;
 }
 function filtered(){const flow=paths.flows.find(f=>f.id===selectedFlow);const selectedUrls=flow?new Set(flow.urls):null;
   let r=records.map(x=>({x,rank:score(x)})).filter(({x,rank})=>rank>=0&&matchingGroup(x)&&(multiOn()?(!multiCategories.size||multiCategories.has(x.category)):(!category||x.category===category))&&(mode!=='saved'||favorites.includes(x.url))&&(!selectedUrls||selectedUrls.has(x.url))&&(!reviewedOnly||!!linkGate?.officialSourceReviewed(x.url))&&(languageMode()!=='exact'||languageRank(x)===0));
   if($('atlasSort').value==='recent')r.sort((a,b)=>{
     const ai=sessionOpens.indexOf(a.x.url),bi=sessionOpens.indexOf(b.x.url);
     return (ai<0?Number.MAX_SAFE_INTEGER:ai)-(bi<0?Number.MAX_SAFE_INTEGER:bi)||(b.rank-a.rank);
   });
   else if($('atlasSort').value==='name')r.sort((a,b)=>a.x.name.localeCompare(b.x.name,'zh-CN'));
   else if(query)r.sort((a,b)=>b.rank-a.rank||(languageMode()==='prefer'?languageRank(a.x)-languageRank(b.x):0)||a.x.name.localeCompare(b.x.name,'zh-CN'));
   else if(selectedUrls)r.sort((a,b)=>flow.urls.indexOf(a.x.url)-flow.urls.indexOf(b.x.url));
   else if(languageMode()==='prefer')r.sort((a,b)=>languageRank(a.x)-languageRank(b.x));
   return r.map(y=>y.x);
 }
 function storeFavorites(){try{localStorage.setItem(key,JSON.stringify(favorites))}catch{}}
 function drawGuide(){
   const box=$('atlasGuide'),flow=paths.flows.find(f=>f.id===selectedFlow);
   const guide=guides?.forFlow(flow,locale()?.locale);if(!box)return;
   box.hidden=!guide;if(!guide)return;
   $('atlasGuideTitle').textContent=(english()?'Guided steps · ':'操作引导 · ')+guide.title;
   $('atlasGuideOutcome').textContent=guide.outcome;
   $('atlasGuideCheck').textContent=guide.check;
   const steps=$('atlasGuideSteps');steps.replaceChildren();
   const marked=guideProgress.get(flow.id)||new Set();
   function progress(){const n=marked.size;$('atlasGuideProgress').textContent=english()?'Completed '+n+' / '+guide.steps.length+' (this page only)':'已确认 '+n+' / '+guide.steps.length+' 步（仅本页）';}
   for(const step of guide.steps){
     const li=el('li','atlas-guide-step');const top=el('div','atlas-guide-step-head');
     const label=el('label','atlas-guide-check-label');const check=el('input');check.type='checkbox';check.checked=marked.has(step.number);
     check.setAttribute('aria-label',T('标记步骤 '+step.number+' 已完成','Mark step '+step.number+' complete'));
     check.addEventListener('change',()=>{check.checked?marked.add(step.number):marked.delete(step.number);guideProgress.set(flow.id,marked);progress();});
     label.append(check,el('strong','',step.number+'. '+step.title));
     top.append(label);
     const item=records.find(x=>x.url===step.url);
     const name=item?.name||new URL(step.url).hostname;
     const action=el('a','atlas-guide-link',name+' ↗');
     const can=isAllowed(step.url);const bad=dangerous(step.url);
     if(!bad)action.href=can?step.url:'leave.html?url='+encodeURIComponent(step.url)+'&name='+encodeURIComponent(name);
     else{action.setAttribute('aria-disabled','true');action.textContent=T('网址结构已阻断','URL blocked by structural rules');}
     action.rel='noopener noreferrer';action.referrerPolicy='no-referrer';
     action.addEventListener('click',e=>{if(bad){e.preventDefault();return;}
       if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
       e.preventDefault();showExternal(step.url,name);
     });
     li.append(top,el('p','',step.detail),action);steps.append(li);
   }
   progress();
 }
 function drawPaths(){
   const wrap=$('atlasFlowGrid');if(!wrap)return;
   wrap.replaceChildren();
   for(const f of paths.flows){
     const b=el('button','atlas-flow-card'+(selectedFlow===f.id?' selected':''));b.type='button';
     b.setAttribute('aria-pressed',String(selectedFlow===f.id));
     const localized=guides?.forFlow(f,locale()?.locale);
     b.append(el('span','atlas-flow-icon',f.icon),el('strong','',localized?.title||f.title),el('small','',localized?.subtitle||f.subtitle));
     const note=el('span','atlas-flow-note',english()?'Follow each step; check external sources before using them.':f.note);b.append(note);
     b.addEventListener('click',()=>{
       selectedFlow=selectedFlow===f.id?'':f.id;category='';multiCategories.clear();groupId='';mode='all';query='';input.value='';limit=24;
       const u=new URL(location.href);u.searchParams.delete('q');history.replaceState(null,'',u.pathname+u.search+u.hash);
       document.querySelectorAll('[data-tab]').forEach(t=>{const active=t.dataset.tab==='all';t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active));});
       refreshEngines();suggestClose();drawPaths();choiceBar();draw();
       (selectedFlow?$('atlasGuide'):$('atlasResults')).scrollIntoView({behavior:'smooth',block:'start'});
     });
     wrap.append(b);
   }
   const reset=$('atlasResetFlow');if(reset)reset.hidden=!selectedFlow;
   const info=$('atlasFlowStatus');if(info)info.textContent=selectedFlow?(english()?'Selected: '+(guides?.forFlow(paths.flows.find(f=>f.id===selectedFlow),locale()?.locale)?.title||selectedFlow)+' · ordered steps':'已选择：'+paths.flows.find(f=>f.id===selectedFlow).title+' · 按推荐步骤排列'):(english()?'Choose a task to see the recommended steps and tools.':'选择一个任务场景，直接查看对应资源和使用顺序');
   drawGuide();
 }
 $('atlasResetFlow')?.addEventListener('click',()=>{selectedFlow='';drawPaths();draw();});
 const reviewedBox=$('atlasReviewedOnly');
 reviewedBox?.addEventListener('change',()=>{reviewedOnly=!!reviewedBox.checked;limit=24;draw();});
 $('atlasExportFavorites')?.addEventListener('click',()=>{
   const items=records.filter(x=>favorites.includes(x.url)).map(x=>({name:x.name,url:x.url,category:x.category,description:x.description}));
   const msg=$('atlasExportStatus');
   if(!items.length){if(msg)msg.textContent=T('目前没有收藏的网址。','No saved sites yet.');return;}
   try{
     const payload={format:'avenqir-atlas-favorites-v1',exportedAt:new Date().toISOString(),items};
     const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
     const href=URL.createObjectURL(blob),a=document.createElement('a');
     a.href=href;a.download='avenqir-atlas-favorites-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();
     setTimeout(()=>URL.revokeObjectURL(href),10000);
     if(msg)msg.textContent=T('已导出 '+items.length+' 条收藏；完整跨设备恢复请使用“数据迁移”。','Exported '+items.length+' favorites. For complete device migration, use Data Transfer.');
   }catch(e){if(msg)msg.textContent=T('无法导出：','Export failed: ')+String(e.message||e).slice(0,100);}
 });
 function choiceBar(){
   const counts=new Map();
   records.forEach(x=>counts.set(x.category,(counts.get(x.category)||0)+1));
   const categories=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));
   const totalCategories=categories.length;
   const knownGroups=taxonomy.groups||[];
   const knownCats=new Set(knownGroups.flatMap(g=>g.categories));
   const otherCategories=categories.filter(([name])=>!knownCats.has(name)).map(([name])=>name);
   const groups=[...knownGroups];
   if(otherCategories.length)groups.push({id:'other',title:T('其他收录','Other categories'),icon:'🗃️',description:T('来自站点后台的新增分类','New categories from the public backend'),categories:otherCategories});
   const bar=$('atlasGroupBar');
   if(bar){
     bar.replaceChildren();
     const makeGroup=(id,label,desc,count,iconText)=>{
       const button=el('button','atlas-group'+(groupId===id?' selected':''));button.type='button';
       button.setAttribute('aria-pressed',String(groupId===id));
       button.append(el('span','atlas-group-icon',iconText),el('strong','',(locale()?.group(id)||label)+' · '+count),el('small','',locale()?.group(id,'description')||desc));
       button.addEventListener('click',()=>{
         groupId=id;category='';multiCategories.clear();selectedFlow='';limit=24;
         if($('atlasCategorySearch'))$('atlasCategorySearch').value='';
         expandedCategories=false;choiceBar();drawPaths();draw();
         $('atlasResults').scrollIntoView({behavior:'smooth',block:'start'});
       });
       bar.append(button);
     };
     makeGroup('',T('全部领域','All topics'),T('浏览完整收录','Browse every site'),records.length,'✦');
     groups.forEach(g=>{
       const n=records.filter(x=>g.categories.includes(x.category)).length;
       if(n>0)makeGroup(g.id,g.title,g.description,n,g.icon);
     });
   }
   const hint=$('atlasTaxonomySummary');
   if(hint)hint.textContent=T('已加载 '+records.length+' 个独立网址 · '+totalCategories+' 个分类 · '+knownGroups.length+' 个主题分组（点击筛选）','Loaded '+records.length+' websites · '+totalCategories+' categories · '+knownGroups.length+' topic groups');
   const inputCategory=$('atlasCategorySearch');
   const needle=normalize(inputCategory?.value);
   let entries=categories.filter(([name])=>(!groupId||(groupId==='other'?!taxonomy.groupFor(name):taxonomy.groupFor(name)===groupId))&&(!needle||normalize(name).includes(needle)));
   // Keep the selected category visible even when it would not rank in the first 12.
   const totalInGroup=categories.reduce((n,[name,count])=>n+(!groupId||(groupId==='other'?!taxonomy.groupFor(name):taxonomy.groupFor(name)===groupId)?count:0),0);
   const visibleCategories=entries.length;
   if(!expandedCategories&&!needle)entries=entries.slice(0,12);
   cats.replaceChildren();
   const add=(name,count)=>{
     const title=name?trCategory(name)+' · '+count:(english()?'All · ':'全部 · ')+totalInGroup;
     const active=name?(multiOn()?multiCategories.has(name):category===name):multiOn()?multiCategories.size===0:category==='';
     const button=el('button','atlas-cat'+(active?' selected':''),title);
     button.type='button';button.setAttribute('aria-pressed',String(active));
     button.addEventListener('click',()=>{
       if(multiOn()){
         if(!name)multiCategories.clear();
         else if(multiCategories.has(name))multiCategories.delete(name);
         else multiCategories.add(name);
       }else{category=name;multiCategories.clear();}
       selectedFlow='';limit=24;choiceBar();drawPaths();draw();$('atlasResults').scrollIntoView({behavior:'smooth',block:'start'});
     });
     cats.append(button);
   };
   if(!needle)add('',totalInGroup);
   for(const [name,count] of entries)add(name,count);
   if(!entries.length&&needle)cats.append(el('p','atlas-taxonomy-no-match',T('没有匹配的分类。请换一个分类关键词。','No matching category. Try another search term.')));
   const expand=$('atlasExpandCategories');
   if(expand){
     expand.hidden=!!needle||visibleCategories<=12;
     expand.setAttribute('aria-expanded',String(expandedCategories));
     expand.textContent=expandedCategories?T('收起分类','Collapse categories'):T('展开全部 '+visibleCategories+' 个分类','Show all '+visibleCategories+' categories');
   }
   const side=$('atlasCategoryCount');
   if(side){
     side.replaceChildren();
     categories.slice(0,16).forEach(([name,count])=>{
       let button=el('button','',trCategory(name)+' · '+count);button.type='button';
       button.addEventListener('click',()=>{
         groupId=taxonomy.groupFor(name)||'other';category=name;multiCategories.clear();if($('atlasMultiCategory'))$('atlasMultiCategory').checked=false;expandedCategories=true;limit=24;
         if(inputCategory)inputCategory.value='';
         choiceBar();draw();
         window.scrollTo({top:Math.max(0,$('atlasResults').getBoundingClientRect().top+window.scrollY-150),behavior:'smooth'});
       });
       side.append(button);
     });
   }
 }
 $('atlasMultiCategory')?.addEventListener('change',()=>{
   if(multiOn()&&category)multiCategories.add(category);
   else if(!multiOn()&&multiCategories.size){category=[...multiCategories][0];multiCategories.clear();}
   else if(!multiOn())multiCategories.clear();
   limit=24;choiceBar();draw();
 });
 $('atlasExpandCategories')?.addEventListener('click',()=>{
   expandedCategories=!expandedCategories;choiceBar();
 });
 $('atlasCategorySearch')?.addEventListener('input',()=>{
   groupId='';category='';multiCategories.clear();selectedFlow='';expandedCategories=true;limit=24;
   choiceBar();drawPaths();draw();
 });
 function replaceQuery(v){query=v.slice(0,140);input.value=query;limit=24;draw();const u=new URL(location.href);query?u.searchParams.set('q',query):u.searchParams.delete('q');history.replaceState(null,'',u.pathname+u.search+u.hash)}
 function suggestClose(){suggest.hidden=true;suggest.replaceChildren()}
 function suggestions(){const q=normalize(input.value);suggest.replaceChildren();if(q.length<2){suggestClose();return}
   const matched=records.filter(r=>meaningful(r).some(v=>v.includes(q))).slice(0,5);if(!matched.length){suggestClose();return}
   matched.forEach(r=>{const b=el('button','atlas-suggest-item',r.name);b.type='button';b.setAttribute('role','option');b.append(el('small','',new URL(r.url).hostname+' · '+r.category));b.addEventListener('click',()=>submitSearch(r.name));suggest.append(b)});suggest.hidden=false;
 }
 function renderSafetyAudit(){
   const wrapper=$('atlasSecurityCounts');if(!wrapper||!safety)return;
   const totals=safety.summary(records);
   const cells=[
     [T('已检查结构','URLs screened'),totals.total+'',T('仅验证网址规则，并非在线扫描','Structural checks only; not an online scan')],
     [T('来源已核对','Source reviewed'),totals.reviewed+'',T('精确官网来源，不等于安全认证','Exact URL provenance, not a certificate')],
     [T('来源待核对','Source pending'),totals.pending+'',T('外链访问前仍提示确认','Requires external-link confirmation')],
     [T('需额外警惕','Extra caution'),totals.caution+'',T('参数、特殊域名或中转链接','Special domains, parameters or redirects')],
     [T('结构已阻断','Blocked structure'),totals.blocked+'',T('无法直接点击访问','Direct visit disabled')]
   ];
   wrapper.replaceChildren();
   for(const [name,value,note] of cells){
     const box=el('div','atlas-security-metric');
     box.append(el('strong','',value),el('span','',name),el('small','',note));
     wrapper.append(box);
   }
 }
 function draw(){const list=filtered(), shown=list.slice(0,limit);results.replaceChildren();$('atlasEmpty').hidden=list.length!==0;const hint=$('atlasFilteredHint');if(hint)hint.hidden=!(query&&list.length===0&&records.some(x=>score(x)>=0));
   const languageHint=$('atlasSiteLanguageHint'),target=locale()?.locale||'en';
   if(languageHint){
     const matched=records.filter(x=>languageRank(x)===0).length,unknown=records.filter(x=>enrichment?.languages(x).values.length===0).length;
     languageHint.textContent=english()?
       'Preferred site language: '+target+' · '+matched+' explicitly matched, '+unknown+' unknown. Unknown sites remain visible by default; source language is not inferred from region.':
       '网页语言偏好：'+target+' · '+matched+' 条可明确匹配，'+unknown+' 条语言未注明。默认保留未知语言网址，不按国家或地区猜测。';
   }
   renderSafetyAudit();
   $('resultsTitle').textContent=mode==='saved'?T('我的收藏','My favorites'):selectedFlow?(guides?.forFlow(paths.flows.find(f=>f.id===selectedFlow),locale()?.locale)?.title||selectedFlow):query?T('搜索结果','Search results'):category?trCategory(category)+(english()?' · Sites':' · 网站'):groupId?(locale()?.group(groupId)||(taxonomy.groups||[]).find(g=>g.id===groupId)?.title||'Other websites'):(english()?'Selected websites':'精选网站');
   summary.textContent=english()?
  ((query?'Matches: ':'Catalog: ')+list.length+' sites · Showing '+shown.length+' / '+records.length+
    (multiOn()&&multiCategories.size?' · Categories: '+[...multiCategories].map(trCategory).join(', '):category?' · Category: '+trCategory(category):'')+(groupId?' · topic filtered':'')):
  (query?'匹配':'目录')+' '+list.length+' 个网站 · 显示 '+shown.length+' 条 / 总目录 '+records.length+' 条'+(multiOn()&&multiCategories.size?' · 多选分类：'+[...multiCategories].join('、'):category?' · 分类：'+category:'')+(groupId?' · 当前主题分组已筛选':'');
   const counter=$('atlasLiveCount');if(counter)counter.textContent=english()?'Curated '+records.length+' unique websites · '+paths.flows.length+' guided tasks · '+new Set(records.map(x=>x.category)).size+' categories':'已整理 '+records.length+' 个独立网址 · '+paths.flows.length+' 条任务路径 · '+new Set(records.map(x=>x.category)).size+' 个分类';
   const more=$('atlasMore'),all=$('atlasShowAll');more.textContent=T('再显示 '+Math.min(24,Math.max(0,list.length-limit))+' 条 ↓','Show '+Math.min(24,Math.max(0,list.length-limit))+' more ↓');
   if(all){all.hidden=list.length<=shown.length;all.textContent=T('一次显示全部 '+list.length+' 条','Show all '+list.length+' entries');}
   for(const x of shown){const url=safeUrl(x.url);if(!url)continue;const host=new URL(url).hostname;
     const card=el('article','atlas-result');const icon=el('div','atlas-result-icon',x.name.slice(0,1).toLocaleUpperCase());icon.setAttribute('aria-hidden','true');
     const data=el('div','atlas-result-info');const hostrow=el('div','atlas-hostline');
     hostrow.append(el('span','atlas-host',host),el('span','atlas-chip',trCategory(x.category)||'Other'));
     const langs=enrichment?.languages(x);
     if(langs?.values.length)hostrow.append(el('span','atlas-language-indicator',langs.values.join(' / ').toUpperCase()+' · '+(langs.source==='explicit'?(english()?'tagged':'已标注'):(english()?'URL hint':'网址路径推断'))));
     if(x.category==='待分类')hostrow.append(el('span','atlas-auto-category',english()?'Needs categorization':'待分类'));
     else if(['high','medium'].includes(x.categorySource))hostrow.append(el('span','atlas-auto-category',english()?'Suggested category':'自动建议分类'));
     data.append(hostrow);
     const a=el('a','atlas-result-title',x.name+' ↗');const reviewed=!!linkGate?.officialSourceReviewed(url);const permitted=isAllowed(url);a.href=permitted?url:'leave.html?url='+encodeURIComponent(url)+'&name='+encodeURIComponent(x.name);a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';const rating=safety?.inspect(url);if(rating?.type==='blocked'){a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.classList.add('atlas-result-blocked');}a.addEventListener('click',e=>{if(rating?.type==='blocked'){e.preventDefault();return;}
       if(e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
       if(!permitted){e.preventDefault();showExternal(url,x.name);}
       else trackOpen(url);
     });data.append(a);
     const riskCopy=english()?({blocked:'Blocked by URL rules',caution:'Extra caution required',reviewed:'Exact source checked · NOT safety-certified',pending:'Source unverified · confirm before leaving'}[rating?.type]||'Source unverified'):rating?.label;
     data.append(el('small',reviewed?'atlas-review-ok':'atlas-review-unknown',riskCopy||(reviewed?T('官方来源已核对 · 非安全认证','Exact source checked · not safety-certified'):permitted?T('本机已记住（来源未核对）','Remembered on this device (source unverified)'):T('第三方来源待核对 · 点击后确认','Unverified third-party source · confirm before leaving'))));
     if(english()&&/[\u3400-\u9fff]/.test(x.description||'')){
       const detail=el('details','atlas-original-desc'),caption=el('summary','',T('查看原始简介','Original description (Chinese) · expand'));
       detail.append(caption,el('p','atlas-result-desc',x.description));data.append(detail);
     }else data.append(el('p','atlas-result-desc',x.description||T('访问网站','Visit website')));
     const report=el('a','atlas-report-link',T('报告失效 ↗','Report broken link ↗'));report.href='feedback.php?type=broken&url='+encodeURIComponent(url);report.setAttribute('aria-label',T('报告 '+x.name+' 链接失效','Report broken link: '+x.name));
     const cmp=el('button','atlas-compare-add',compareUrls.includes(url)?T('✓ 已加入对比','✓ Comparing'):T('＋ 对比','＋ Compare'));
     cmp.type='button';cmp.setAttribute('aria-pressed',String(compareUrls.includes(url)));
     cmp.addEventListener('click',()=>{
       if(compareUrls.includes(url))compareUrls=compareUrls.filter(v=>v!==url);
       else if(compareUrls.length<3)compareUrls.push(url);
       else {const status=$('atlasCompareStatus');if(status)status.textContent=T('最多同时比较三个网址，先移除一个。','You can compare up to three sites. Remove one first.');return;}
       draw();
     });
     const cardActions=el('div','atlas-card-actions');cardActions.append(report,cmp);
     const externalCheck=safety?.googleStatusLink(url);
     if(externalCheck){
       const check=el('a','atlas-security-lookup',T('查外部风险 ↗','Check external risk ↗'));
       check.href=externalCheck;check.target='_blank';check.rel='noopener noreferrer';check.referrerPolicy='no-referrer';
       check.title=T('仅点击后才会把此公开网址交给 Google Safe Browsing 查询；检测结果可能滞后或缺失，不能证明绝对安全','Only your click shares this public URL with Google; absence of a warning does not guarantee safety.');
       check.setAttribute('aria-label',T('向 Google Safe Browsing 主动查询 '+x.name+' 的风险状态','Check '+x.name+' with Google Safe Browsing'));
       cardActions.append(check);
     }
     data.append(cardActions);
     const star=el('button','atlas-star'+(favorites.includes(x.url)?' saved':''),favorites.includes(x.url)?'★':'☆');star.type='button';star.title=favorites.includes(x.url)?T('取消收藏','Remove favorite'):T('收藏到本机','Save locally');star.setAttribute('aria-label',star.title);star.addEventListener('click',()=>{if(favorites.includes(x.url))favorites=favorites.filter(u=>u!==x.url);else {favorites.push(x.url);localRecommendations?.recordSave(x.category);}storeFavorites();draw();localRecommendations?.render()});
     card.append(icon,data,star);results.append(card);
   }
   $('atlasMore').hidden=list.length<=shown.length;
   renderCompare();
 }
 function renderCompare(){
   const board=$('atlasCompareBoard'),list=$('atlasCompareItems');
   if(!board||!list)return;
   compareUrls=compareUrls.filter(url=>records.some(x=>x.url===url));
   board.hidden=compareUrls.length===0;list.replaceChildren();
   for(const url of compareUrls){
     const item=records.find(x=>x.url===url);if(!item)continue;
     const card=el('div','atlas-compare-item');card.append(el('strong','',item.name),
       el('small','',trCategory(item.category)+' · '+new URL(item.url).hostname),
       el('p','',item.description));
     const proven=!!linkGate?.officialSourceReviewed(item.url);
     card.append(el('small','',proven?T('已核对官方来源（非安全认证）','Exact source checked (not certified)'):T('来源未核对（需跳转确认）','Unverified source (confirmation required)')));
     const remove=el('button','',T('移出对比','Remove from comparison'));remove.type='button';
     remove.addEventListener('click',()=>{compareUrls=compareUrls.filter(v=>v!==url);draw();});
     card.append(remove);list.append(card);
   }
 }
 $('atlasCompareClear')?.addEventListener('click',()=>{compareUrls=[];draw();});
 $('atlasCompareCopy')?.addEventListener('click',async()=>{
   const status=$('atlasCompareStatus');
   const lines=compareUrls.map(url=>records.find(x=>x.url===url)).filter(Boolean).map(x=>
      x.name+' | '+trCategory(x.category)+' | '+x.url+'\n'+x.description+'\n'+
      (linkGate?.officialSourceReviewed(x.url)?T('来源已核对','Source reviewed'):T('来源未核对','Source unverified')));
   const text=lines.join('\n\n');
   if(!text){if(status)status.textContent=T('请先选择要对比的网址','Select sites to compare first.');return;}
   try{await navigator.clipboard.writeText(text);if(status)status.textContent=T('已复制 '+lines.length+' 条对比摘要。','Copied '+lines.length+' comparison entries.');}
   catch{if(status)status.textContent=T('此浏览器禁止复制，请检查站点权限。','Clipboard access was denied by this browser.');}
 });
 function scrollToResults(){
   const target=$('resultsTitle');if(!target)return;
   target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
   target.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 }
 function completeSearch(){
   const q=pendingNoMatchQuery.trim();if(!q||q!==query.trim())return;
   pendingNoMatchQuery='';
   scrollToResults();
   if(filtered().length)return;
   if(records.some(x=>score(x)>=0)){
     $('atlasFilteredHint').hidden=false;return;
   }
   openNoMatch(q);
 }
 function submitSearch(value){
   replaceQuery(value.trim());suggestClose();input.blur();
   pendingNoMatchQuery=query.trim();
   if(loaded)completeSearch();
 }
 function openNoMatch(q){
   const dialog=$('atlasNoMatchDialog');if(!dialog||dialog.open)return;
   $('atlasNoMatchQuery').textContent='“'+q+'”';
   for(const a of document.querySelectorAll('[data-no-match-engine]')){
     a.href=linkGate?.searchEngineDestination(a.dataset.noMatchEngine,q)||a.href;
   }
   $('atlasRecommendQuery').href='feedback.php?type=link';
   if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 }
 $('atlasRecommendQuery')?.addEventListener('click',()=>{try{sessionStorage.setItem('avenqir.feedback.query.once.v1',query.trim().slice(0,80))}catch{}});
 $('atlasNoMatchClose')?.addEventListener('click',()=>{const d=$('atlasNoMatchDialog');if(d.close)d.close();else d.removeAttribute('open');});
 $('atlasNoMatchDialog')?.addEventListener('click',e=>{const d=$('atlasNoMatchDialog');if(e.target===d){if(d.close)d.close();else d.removeAttribute('open');}});

 const tabs=[...document.querySelectorAll('[data-tab]')];tabs.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.tab;limit=24;tabs.forEach(t=>{let active=t===b;t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active))});draw()}));
 $('atlasClearFilters')?.addEventListener('click',()=>{
   category='';groupId='';selectedFlow='';multiCategories.clear();mode='all';reviewedOnly=false;limit=24;
   for(const id of ['atlasMultiCategory','atlasReviewedOnly'])if($(id))$(id).checked=false;
   if($('atlasSiteLanguageMode'))$('atlasSiteLanguageMode').value='prefer';
   for(const t of tabs){const active=t.dataset.tab==='all';t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active));}
   choiceBar();drawPaths();draw();scrollToResults();
 });
 $('atlasSort').addEventListener('change',draw);
 $('atlasSiteLanguageMode')?.addEventListener('change',()=>{limit=24;draw();});
 input.addEventListener('input',()=>{pendingNoMatchQuery='';query=input.value.slice(0,140);limit=24;draw();suggestions()});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!suggest.hidden){suggestClose()}else{replaceQuery('')}e.preventDefault()}});
 $('atlasForm').addEventListener('submit',e=>{e.preventDefault();submitSearch(input.value);});
 $('atlasClear').addEventListener('click',()=>{replaceQuery('');suggestClose();input.focus()});
 $('atlasMore').addEventListener('click',()=>{limit+=24;draw()});
 $('atlasShowAll')?.addEventListener('click',()=>{limit=filtered().length;draw();});
 $('atlasRandom').addEventListener('click',()=>{let entries=filtered();if(!entries.length)entries=records;const entry=entries[Math.floor(Math.random()*entries.length)];if(entry)showExternal(entry.url,entry.name)});
 const engineLinks=[...document.querySelectorAll('[data-search-provider]')];
 function refreshEngines(){for(const a of engineLinks){const target=linkGate?.searchEngineDestination(a.dataset.searchProvider,input.value);if(target)a.href=target;}}
 input.addEventListener('input',refreshEngines);
 for(const a of engineLinks)a.addEventListener('click',refreshEngines);
 refreshEngines();
 document.addEventListener('keydown',e=>{const t=e.target;const typing=t&&(t.matches('input,textarea,select')||t.isContentEditable);if(e.key==='/'&&!typing){e.preventDefault();input.focus();input.select()}});
 document.addEventListener('click',e=>{if(!e.target.closest('.atlas-search-form'))suggestClose()});
 localRecommendations=window.AVENQIR_LOCAL_RECOMMEND_UI?.mount({
   items:()=>records,favorites:()=>favorites,open:showExternal,
   reviewed:url=>!!linkGate?.officialSourceReviewed(url)
 })||null;
 regionRecommendations=window.AVENQIR_ATLAS_REGION_UI?.mount({
  items:()=>records,favorites:()=>favorites,open:showExternal,
  reviewed:url=>!!linkGate?.officialSourceReviewed(url)
 })||null;
 window.addEventListener('aq:language-change',()=>{drawPaths();choiceBar();draw();});
 updateApprovals();drawPaths();choiceBar();draw();
 catalog.load().then(data=>{
  records=data.items;
  source.textContent=data.remote?T('在线目录 + 本地精选','Online directory + curated links'):T('内置精选目录（后台不可用）','Built-in directory (backend unavailable)');
  loaded=true;choiceBar();draw();localRecommendations?.render();regionRecommendations?.render();drawGuide();
  if(pendingNoMatchQuery)completeSearch();
 });
})();
