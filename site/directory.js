"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const safeUrl=v=>{try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
 const linkGate=window.AVENQIR_LINK_GATE;
 const safety=window.AVENQIR_ATLAS_SAFETY;
 const sourceUI=window.AVENQIR_ATLAS_SOURCE_UI;
 const finder=window.AVENQIR_ATLAS_FIND;
 const searchActions=window.AVENQIR_SEARCH_ACTIONS;
 const enrichment=window.AVENQIR_ATLAS_ENRICH;
 const locale=()=>window.AVENQIR_I18N;
 const trCategory=name=>locale()?.category(name)||name;
 const english=()=>!!locale()&&!locale().locale.startsWith('zh-');
 const T=(cn,en)=>english()?en:cn;
 const externalDialog=$('atlasExternalDialog');
 const externalGo=$('atlasExternalGo');
 const rememberBox=$('atlasRemember');
 let storage=null;try{storage=window.localStorage}catch{}
 const isAllowed=url=>safety?.threatStatus(url)!=='listed'&&!!linkGate?.maySkipConfirmation(url,storage);
 const dangerous=url=>safety?.threatStatus(url)==='listed'||linkGate?.urlRisk(url)?.blocked!==false;
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
   const notice=$('atlasExternalNotice');
   if(sourceUI&&notice)notice.replaceChildren(sourceUI.external(href,false),
     T('外链由第三方运营，请核对目标网址。','This website is operated by a third party. Check the destination URL.'));
   if(externalDialog&&typeof externalDialog.showModal==='function'){
     externalDialog.showModal();
     $('atlasExternalCancel').focus();
   }else{
     if(confirm(T('即将前往第三方域名 '+u.hostname+'。请核对目标网址，是否继续？','Leaving for the third-party domain '+u.hostname+'. Check the destination. Continue?'))){trackOpen(href);window.location.assign(href);}
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
 if(!catalog){const notice=$('atlasStartupNotice');if(notice)notice.firstChild.textContent='目录核心未加载，请使用下方重新加载入口。';return;}
 const paths=window.AVENQIR_ATLAS_PATHS||{links:[],flows:[],itemsForFlow:()=>[]};
 const guides=window.AVENQIR_ATLAS_GUIDES;
 const guideProgress=new Map();
 const taxonomy=window.AVENQIR_ATLAS_TAXONOMY||{groups:[],categoriesFor:()=>[],groupFor:()=>null};
 let quickQuery='';
 try{quickQuery=sessionStorage.getItem('avenqir.atlas.quick-query.v90')||'';sessionStorage.removeItem('avenqir.atlas.quick-query.v90');}catch{}
 const params=new URLSearchParams(location.search);
 const input=$('atlasQuery'),results=$('atlasResults'),cats=$('atlasCategories'),summary=$('atlasSummary'),source=$('atlasSource'),suggest=$('atlasSuggestions');
 const combine=catalog.combine;
 let records=catalog.catalog(), query=(params.get('q')||quickQuery||'').slice(0,140),category='',mode='all',limit=24,loaded=false,selectedFlow='',sourceFilter='all',threatFilter='all',groupId='',expandedCategories=false;
 const pageSize=window.matchMedia?.('(max-width: 600px)').matches?12:24;
 limit=pageSize;
 const key='avenqir.link-atlas.favorites.v8';let favorites=[],compareUrls=[];let pendingNoMatchQuery=query.trim();
 const multiCategories=new Set();
 const densityKey='avenqir.atlas.density.v1';
 function applyDensity(value){const compact=value==='compact';document.body.dataset.atlasDensity=compact?'compact':'comfortable';const b=$('atlasDensity');if(b){b.setAttribute('aria-pressed',String(compact));b.textContent=compact?T('舒适','Comfortable'):T('紧凑','Compact');b.title=compact?T('切换舒适布局','Switch to comfortable layout'):T('切换紧凑布局','Switch to compact layout');}}
 let density='';try{density=storage?.getItem(densityKey)||'';}catch{}
 applyDensity(density|| (window.matchMedia('(max-width:600px)').matches?'compact':'comfortable'));
 $('atlasDensity')?.addEventListener('click',()=>{const next=document.body.dataset.atlasDensity==='compact'?'comfortable':'compact';applyDensity(next);try{storage?.setItem(densityKey,next);}catch{}});
 const sticky=$('atlasStickySearch');
 function stickySize(){document.documentElement.style.setProperty('--atlas-head-height',(document.querySelector('.headbar')?.getBoundingClientRect().height||0)+'px');document.documentElement.style.setProperty('--atlas-search-height',(sticky?.getBoundingClientRect().height||0)+'px');}
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(stickySize);for(const node of [sticky,document.querySelector('.headbar')])if(node)observer.observe(node);}
 window.addEventListener('resize',stickySize);stickySize();
 $('atlasQuickFilters')?.addEventListener('click',()=>{const box=$('atlasAdvancedFilters');box.open=true;box.scrollIntoView({block:'start'});box.querySelector('summary')?.focus({preventScroll:true});});
 const recentKey='avenqir.atlas.session-opens.v90';
 let sessionOpens=[];
 try{const raw=JSON.parse(sessionStorage.getItem(recentKey)||'[]');if(Array.isArray(raw))sessionOpens=raw.filter(x=>typeof x==='string').slice(0,100);}catch{}
 const multiOn=()=>!!$('atlasMultiCategory')?.checked;
 const languageMode=()=>$('atlasSiteLanguageMode')?.value||'prefer';
 let rankLocale='',rankCache=new WeakMap();
 const languageRank=item=>{const current=locale()?.locale||'en';if(current!==rankLocale){rankLocale=current;rankCache=new WeakMap()}if(!rankCache.has(item))rankCache.set(item,enrichment?.priority(item,current)??1);return rankCache.get(item)};
 let localRecommendations=null;
 let regionRecommendations=null;
 function trackOpen(url){
   const item=records.find(x=>x.url===url);
   if(item)localRecommendations?.recordOpen(item.category);
   sessionOpens=[url,...sessionOpens.filter(x=>x!==url)].slice(0,100);
   try{sessionStorage.setItem(recentKey,JSON.stringify(sessionOpens));}catch{}
   sourceUI?.noteVisit(url);
   window.dispatchEvent(new CustomEvent('aq:website-open',{detail:url}));
 }
 try{const v=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(v))favorites=v.filter(x=>typeof x==='string').slice(0,500)}catch{}
 input.value=query;
 const normalize=x=>String(x||'').toLocaleLowerCase().normalize('NFKC').trim();
 const initialsCache=new WeakMap();
 function initialsMatch(item,term){if(!finder||!/^[a-z]{2,20}$/.test(term))return false;let values=initialsCache.get(item);if(!values){values=[finder.initials(item.name),finder.initials(item.category)];initialsCache.set(item,values)}return values.some(v=>v.includes(term));}
 const fieldCache=new WeakMap();
 const meaningful=x=>{let fields=fieldCache.get(x);if(!fields){fields=[x.name,x.url,x.category,x.description].map(normalize);fieldCache.set(x,fields)}return fields};
 let termsQuery=null,termsCache=[];
 function score(x){if(!query)return 1;if(termsQuery!==query){termsQuery=query;termsCache=normalize(query).split(/\s+/).filter(Boolean)}const terms=termsCache;const fields=meaningful(x);
   if(!terms.every(w=>fields.some(v=>v.includes(w))||initialsMatch(x,w)))return -1;
   return terms.reduce((acc,t)=>acc+(fields[0]===t?12:fields[0].startsWith(t)?8:fields[0].includes(t)?6:0)+(fields[1].includes(t)?4:0)+(fields[2].includes(t)?3:0)+(fields[3].includes(t)?1:0),0);
 }
 function matchingGroup(x){
   if(!groupId)return true;
   if(groupId==='other')return !taxonomy.groupFor(x.category);
   return taxonomy.groupFor(x.category)===groupId;
 }
 function quickCategories(){
   const bar=$('atlasQuickCategories');if(!bar)return;
   const counts=new Map();
   for(const item of records){if(score(item)<0||(mode==='saved'&&!favorites.includes(item.url)))continue;counts.set(item.category,(counts.get(item.category)||0)+1);}
   const sorted=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
   const active=multiOn()?null:category;
   const entries=sorted.slice(0,10);if(active&&!entries.some(([n])=>n===active))entries.unshift([active,counts.get(active)||0]);
   const offset=bar.scrollLeft;
   const focus=document.activeElement?.dataset?.quickCategory;
   const add=(name,count)=>{const b=el('button','atlas-quick-category',(name?trCategory(name):T('全部','All'))+' · '+count);b.type='button';b.dataset.quickCategory=name;b.setAttribute('aria-pressed',String(active===name&&!groupId&&!selectedFlow));b.addEventListener('click',()=>{
     groupId='';category=name;selectedFlow='';multiCategories.clear();if($('atlasMultiCategory'))$('atlasMultiCategory').checked=false;limit=pageSize;choiceBar();drawPaths();draw();
     const u=new URL(location.href);if(name)u.searchParams.set('category',name);else u.searchParams.delete('category');u.hash='atlasResults';history.replaceState(null,'',u.pathname+u.search+u.hash);scrollToResults();
   });return b;};
   bar.replaceChildren(add('',[...counts.values()].reduce((a,b)=>a+b,0)),...entries.map(([n,c])=>add(n,c)));
   bar.scrollLeft=offset;if(focus!==undefined)[...bar.children].find(b=>b.dataset.quickCategory===focus)?.focus({preventScroll:true});
 }
 function highlight(node,value){const text=String(value||'');const terms=query.trim().split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);if(!terms.length){node.textContent=text;return;}const lower=text.toLowerCase();let start=0;while(start<text.length){let hit=-1,term='';for(const t of terms){const i=lower.indexOf(t.toLowerCase(),start);if(i>=0&&(hit<0||i<hit)){hit=i;term=t;}}if(hit<0){node.append(document.createTextNode(text.slice(start)));break;}if(hit>start)node.append(document.createTextNode(text.slice(start,hit)));node.append(el('mark','atlas-match',text.slice(hit,hit+term.length)));start=hit+term.length;}}
 function filtered(){const flow=paths.flows.find(f=>f.id===selectedFlow);const selectedUrls=flow?new Set(flow.urls):null;
   let r=records.map(x=>({x,rank:score(x)})).filter(({x,rank})=>rank>=0&&matchingGroup(x)&&(multiOn()?(!multiCategories.size||multiCategories.has(x.category)):(!category||x.category===category))&&(mode!=='saved'||favorites.includes(x.url))&&(!selectedUrls||selectedUrls.has(x.url))&&(sourceFilter==='all'||Boolean(linkGate?.officialSourceReviewed(x.url))===(sourceFilter==='reviewed'))&&(threatFilter==='all'||(safety?.threatStatus(x.url)||'unknown')===threatFilter)&&(languageMode()!=='exact'||languageRank(x)===0));
   if($('atlasSort').value==='recent')r.sort((a,b)=>{
     const ai=sessionOpens.indexOf(a.x.url),bi=sessionOpens.indexOf(b.x.url);
     return (ai<0?Number.MAX_SAFE_INTEGER:ai)-(bi<0?Number.MAX_SAFE_INTEGER:bi)||(b.rank-a.rank);
   });
   else if($('atlasSort').value==='name')r.sort((a,b)=>a.x.name.localeCompare(b.x.name,'zh-CN'));
   else if(!selectedUrls&&['rating','recommended','popular'].includes($('atlasSort').value)){
     const rating=$('atlasSort').value==='rating';
     const value=x=>dangerous(x.url)?-1:(rating?sourceUI?.average(x.url)||0:$('atlasSort').value==='popular'?sourceUI?.popularity(x.url)||0:sourceUI?.recommendation(x.url)??-1);
     r.sort((a,b)=>(query?b.rank-a.rank:0)||value(b.x)-value(a.x)||b.rank-a.rank||(languageMode()==='prefer'?languageRank(a.x)-languageRank(b.x):0));
   }
   else if(query)r.sort((a,b)=>b.rank-a.rank||(languageMode()==='prefer'?languageRank(a.x)-languageRank(b.x):0)||(sourceUI?.recommendation(b.x.url)??-1)-(sourceUI?.recommendation(a.x.url)??-1)||a.x.name.localeCompare(b.x.name,'zh-CN'));
   else if(selectedUrls)r.sort((a,b)=>flow.urls.indexOf(a.x.url)-flow.urls.indexOf(b.x.url));
   else if(languageMode()==='prefer')r.sort((a,b)=>languageRank(a.x)-languageRank(b.x)||(sourceUI?.recommendation(b.x.url)??-1)-(sourceUI?.recommendation(a.x.url)??-1));
   else r.sort((a,b)=>(sourceUI?.recommendation(b.x.url)??-1)-(sourceUI?.recommendation(a.x.url)??-1));
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
       selectedFlow=selectedFlow===f.id?'':f.id;category='';multiCategories.clear();groupId='';mode='all';query='';input.value='';limit=pageSize;
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
 const sourceBox=$('atlasSourceFilter');
 const threatBox=$('atlasThreatFilter');
 sourceBox?.addEventListener('change',()=>{sourceFilter=sourceBox.value;limit=pageSize;draw();});
 threatBox?.addEventListener('change',()=>{threatFilter=['all','not-listed','listed','unknown'].includes(threatBox.value)?threatBox.value:'all';limit=pageSize;draw();});
 let filterCountRecords=null,filterCountLocale='',filterCountMinute=-1,filterCountCache=null;
 function updateFilterCounts(){
   const currentLocale=locale()?.locale||'en',minute=Math.floor(Date.now()/60000);
   if(filterCountRecords!==records||filterCountLocale!==currentLocale||filterCountMinute!==minute){
     filterCountRecords=records;filterCountLocale=currentLocale;filterCountMinute=minute;
     const threat=safety?.threatSummary(records)||{checked:0,listed:0,unknown:records.length};
     const registry=records.filter(x=>safety?.registryEvidence(x.url)).length;
     filterCountCache={reviewed:records.filter(x=>linkGate?.officialSourceReviewed(x.url)).length,clear:threat.checked-threat.listed,listed:threat.listed,unknown:threat.unknown,registry};
   }
   const c=filterCountCache;
   if($('atlasSourceFilterLabel'))$('atlasSourceFilterLabel').textContent=T('来源状态','Source status');
   if(sourceBox){
     const labels={all:T('全部来源','All sources'),reviewed:T('来源已核对','Source checked')+' ('+c.reviewed+')',pending:T('来源待核对','Source pending')+' ('+(records.length-c.reviewed)+')'};
     for(const option of sourceBox.options)option.textContent=labels[option.value];
   }
   if($('atlasThreatLabel'))$('atlasThreatLabel').textContent=T('动态风险筛选','Dynamic risk filter');
   if(threatBox){
     const labels={all:T('不限风险结果','All risk results'),'not-listed':T('近期清单未命中','Recent list: no match')+' ('+c.clear+')',listed:T('风险清单命中','Warning list match')+' ('+c.listed+')',unknown:T('结果未知或过期','Unknown or expired')+' ('+c.unknown+')'};
     for(const option of threatBox.options)option.textContent=labels[option.value]||option.value;
   }
   const counts=$('atlasFilterCounts');
   if(counts)counts.textContent=T('全部 '+records.length+' · 来源核对 '+c.reviewed+' · 政府域名归属 '+c.registry+' · 近期清单未命中 '+c.clear+' · 命中 '+c.listed+' · 未知 '+c.unknown+'。未命中不等于安全认证。','All '+records.length+' · source reviewed '+c.reviewed+' · government registry '+c.registry+' · recent no match '+c.clear+' · listed '+c.listed+' · unknown '+c.unknown+'. No match is not safety certification.');
 }
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
         groupId=id;category='';multiCategories.clear();selectedFlow='';limit=pageSize;
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
       selectedFlow='';limit=pageSize;choiceBar();drawPaths();draw();$('atlasResults').scrollIntoView({behavior:'smooth',block:'start'});
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
         groupId=taxonomy.groupFor(name)||'other';category=name;multiCategories.clear();if($('atlasMultiCategory'))$('atlasMultiCategory').checked=false;expandedCategories=true;limit=pageSize;
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
   limit=pageSize;choiceBar();draw();
 });
 $('atlasExpandCategories')?.addEventListener('click',()=>{
   expandedCategories=!expandedCategories;choiceBar();
 });
 $('atlasCategorySearch')?.addEventListener('input',()=>{
   groupId='';category='';multiCategories.clear();selectedFlow='';expandedCategories=true;limit=pageSize;
   choiceBar();drawPaths();draw();
 });
 function replaceQuery(v){query=v.slice(0,140);input.value=query;limit=pageSize;draw();const u=new URL(location.href);query?u.searchParams.set('q',query):u.searchParams.delete('q');history.replaceState(null,'',u.pathname+u.search+u.hash)}
 function suggestClose(){suggest.hidden=true;suggest.replaceChildren()}
 function suggestions(){const q=normalize(input.value);suggest.replaceChildren();if(q.length<2){suggestClose();return}
   const matched=records.map(r=>({r,rank:score(r)})).filter(x=>x.rank>=0).sort((a,b)=>b.rank-a.rank).slice(0,5).map(x=>x.r);if(!matched.length){suggestClose();return}
   matched.forEach(r=>{const b=el('button','atlas-suggest-item',r.name);b.type='button';b.setAttribute('role','option');b.append(el('small','',new URL(r.url).hostname+' · '+r.category));b.addEventListener('click',()=>submitSearch(r.name));suggest.append(b)});suggest.hidden=false;
 }
 let safetyRecords=null,safetyLocale='',safetyTotals=null;
 function renderSafetyAudit(){
   const wrapper=$('atlasSecurityCounts');if(!wrapper||!safety)return;
   const currentLocale=locale()?.locale||'en';
   if(safetyRecords===records&&safetyLocale===currentLocale)return;
   if(safetyRecords!==records)safetyTotals=safety.summary(records);
   safetyRecords=records;safetyLocale=currentLocale;
   const totals=safetyTotals;
   const threat=safety.threatSummary?.(records);
   const cells=[
     [T('已检查结构','URLs screened'),totals.total+'',T('仅验证网址规则，并非在线扫描','Structural checks only; not an online scan')],
     [T('来源已核对','Source reviewed'),totals.reviewed+'',T('精确官网来源，不等于安全认证','Exact URL provenance, not a certificate')],
     [T('来源待核对','Source pending'),totals.pending+'',T('外链访问前仍提示确认','Requires external-link confirmation')],
     [T('需额外警惕','Extra caution'),totals.caution+'',T('参数、特殊域名或中转链接','Special domains, parameters or redirects')],
     [T('结构已阻断','Blocked structure'),totals.blocked+'',T('无法直接点击访问','Direct visit disabled')]
   ];
   if(threat){cells.push([T('外部钓鱼清单已比对','External phishing list checked'),String(threat.checked)+' / '+totals.total,T('CERT Polska 域名级快照 · 未命中不代表安全','CERT Polska domain snapshot; no match is not a safety verdict')],[T('清单命中','Warning list matches'),String(threat.listed),T('目录内阻断直接访问','Direct navigation blocked in directory')],[T('未取得有效外部结果','External result unknown'),String(threat.unknown),threat.checkedAt?(threat.stale?T('上次快照已过期：','Previous snapshot expired: '):T('上次核验：','Last check: '))+threat.checkedAt:T('等待首次核验','Awaiting first audit')]);}
   wrapper.replaceChildren();
   for(const [name,value,note] of cells){
     const box=el('div','atlas-security-metric');
     box.append(el('strong','',value),el('span','',name),el('small','',note));
     wrapper.append(box);
   }
 }
 let languageStatsRecords=null,languageStatsLocale='';
 function draw(){const list=filtered(), shown=list.slice(0,limit);quickCategories();results.replaceChildren();$('atlasEmpty').hidden=list.length!==0;const hint=$('atlasFilteredHint');if(hint)hint.hidden=!(query&&list.length===0&&records.some(x=>score(x)>=0));
   const languageHint=$('atlasSiteLanguageHint'),target=locale()?.locale||'en';
   if(languageHint&&(languageStatsRecords!==records||languageStatsLocale!==target)){
     languageStatsRecords=records;languageStatsLocale=target;
     const matched=records.filter(x=>languageRank(x)===0).length,unknown=records.filter(x=>enrichment?.languages(x).values.length===0).length;
     languageHint.textContent=english()?
       'Preferred site language: '+target+' · '+matched+' explicitly matched, '+unknown+' unknown. Unknown sites remain visible by default; source language is not inferred from region.':
       '网页语言偏好：'+target+' · '+matched+' 条可明确匹配，'+unknown+' 条语言未注明。默认保留未知语言网址，不按国家或地区猜测。';
   }
   renderSafetyAudit();updateFilterCounts();
   $('resultsTitle').textContent=mode==='saved'?T('我的收藏','My favorites'):selectedFlow?(guides?.forFlow(paths.flows.find(f=>f.id===selectedFlow),locale()?.locale)?.title||selectedFlow):query?T('搜索结果','Search results'):category?trCategory(category)+(english()?' · Sites':' · 网站'):groupId?(locale()?.group(groupId)||(taxonomy.groups||[]).find(g=>g.id===groupId)?.title||'Other websites'):(english()?'Selected websites':'精选网站');
   summary.textContent=english()?
  ((query?'Matches: ':'Catalog: ')+list.length+' sites · Showing '+shown.length+' / '+records.length+
    (multiOn()&&multiCategories.size?' · Categories: '+[...multiCategories].map(trCategory).join(', '):category?' · Category: '+trCategory(category):'')+(groupId?' · topic filtered':'')):
  (query?'匹配':'目录')+' '+list.length+' 个网站 · 显示 '+shown.length+' 条 / 总目录 '+records.length+' 条'+(multiOn()&&multiCategories.size?' · 多选分类：'+[...multiCategories].join('、'):category?' · 分类：'+category:'')+(groupId?' · 当前主题分组已筛选':'');
   if(sourceFilter!=='all')summary.textContent+=' · '+(sourceBox?.selectedOptions[0]?.textContent||sourceFilter);
   if(threatFilter!=='all')summary.textContent+=' · '+(threatBox?.selectedOptions[0]?.textContent||threatFilter);
   const counter=$('atlasLiveCount');if(counter)counter.textContent=english()?'Curated '+records.length+' unique websites · '+paths.flows.length+' guided tasks · '+new Set(records.map(x=>x.category)).size+' categories':'已整理 '+records.length+' 个独立网址 · '+paths.flows.length+' 条任务路径 · '+new Set(records.map(x=>x.category)).size+' 个分类';
   const more=$('atlasMore'),all=$('atlasShowAll');more.textContent=T('再显示 '+Math.min(pageSize,Math.max(0,list.length-limit))+' 条 ↓','Show '+Math.min(pageSize,Math.max(0,list.length-limit))+' more ↓');
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
     const a=el('a','atlas-result-title');highlight(a,x.name+' ↗');const permitted=isAllowed(url);a.href=permitted?url:'leave.html?url='+encodeURIComponent(url)+'&name='+encodeURIComponent(x.name);a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';if(dangerous(url)){a.textContent=x.name;a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.classList.add('atlas-result-blocked');}a.addEventListener('click',e=>{if(dangerous(url)){e.preventDefault();return;}
       if(e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
       if(!permitted){e.preventDefault();showExternal(url,x.name);}
       else trackOpen(url);
     });data.append(a);
     if(sourceUI)data.append(sourceUI.external(url,permitted));
     if(english()&&/[\u3400-\u9fff]/.test(x.description||'')){
       const detail=el('details','atlas-original-desc'),caption=el('summary','',T('查看原始简介','Original description (Chinese) · expand'));
       detail.append(caption,el('p','atlas-result-desc',x.description));data.append(detail);
     }else{const desc=el('p','atlas-result-desc');highlight(desc,x.description||T('访问网站','Visit website'));data.append(desc);}
     const report=el('a','atlas-report-link',T('报告失效 ↗','Report broken link ↗'));report.href='feedback.php?type=broken&url='+encodeURIComponent(url);report.setAttribute('aria-label',T('报告 '+x.name+' 链接失效','Report broken link: '+x.name));
     const cmp=el('button','atlas-compare-add',compareUrls.includes(url)?T('✓ 已加入对比','✓ Comparing'):T('＋ 对比','＋ Compare'));
     cmp.type='button';cmp.setAttribute('aria-pressed',String(compareUrls.includes(url)));
     cmp.addEventListener('click',()=>{
       if(compareUrls.includes(url))compareUrls=compareUrls.filter(v=>v!==url);
       else if(compareUrls.length<3)compareUrls.push(url);
       else {const status=$('atlasCompareStatus');if(status)status.textContent=T('最多同时比较三个网址，先移除一个。','You can compare up to three sites. Remove one first.');return;}
       draw();
     });
     const cardActions=el('div','atlas-card-actions');const moreActions=el('details','atlas-card-more');const moreLabel=el('summary','',T('更多','More'));moreActions.append(moreLabel);const secondary=el('div','atlas-secondary-actions');secondary.append(report,cmp);moreActions.append(secondary);
     const rate=sourceUI?.ratingLink(url);
     if(rate)cardActions.append(rate);
     const reg=safety?.registryEvidence(url);
     if(reg)data.append(el('small','atlas-review-unknown',T('美国政府域名登记归属：','US federal domain registration: ')+reg.organization+T(' · 非精确网址安全核验',' · not exact URL safety verification')));
     const externalVerdict=safety?.threatStatus(url);
     if(externalVerdict==='listed')data.append(el('small','atlas-review-unknown',T('CERT Polska 清单命中 · 目录内禁止访问','CERT Polska warning-list match · blocked in directory')));
     else if(externalVerdict==='not-listed')data.append(el('small','atlas-review-unknown',T('CERT Polska 清单未命中 · 非安全认证','CERT Polska list: no match · not safety-certified')));
     const externalCheck=safety?.googleStatusLink(url);
     if(externalCheck){
       const check=el('a','atlas-security-lookup',T('查外部风险 ↗','Check external risk ↗'));
       check.href=externalCheck;check.target='_blank';check.rel='noopener noreferrer';check.referrerPolicy='no-referrer';
       check.title=T('仅点击后才会把此公开网址交给 Google Safe Browsing 查询；检测结果可能滞后或缺失，不能证明绝对安全','Only your click shares this public URL with Google; absence of a warning does not guarantee safety.');
       check.setAttribute('aria-label',T('向 Google Safe Browsing 主动查询 '+x.name+' 的风险状态','Check '+x.name+' with Google Safe Browsing'));
       secondary.append(check);
     }
     cardActions.append(moreActions);data.append(cardActions);
     const star=el('button','atlas-star'+(favorites.includes(x.url)?' saved':''),favorites.includes(x.url)?'★':'☆');star.type='button';star.title=favorites.includes(x.url)?T('取消收藏','Remove favorite'):T('收藏到本机','Save locally');star.setAttribute('aria-label',star.title);star.setAttribute('aria-pressed',String(favorites.includes(x.url)));star.addEventListener('click',()=>{if(favorites.includes(x.url))favorites=favorites.filter(u=>u!==x.url);else {favorites.push(x.url);localRecommendations?.recordSave(x.category);}storeFavorites();draw();localRecommendations?.render()});
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
 function revealHashPanel(){
   let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return;}
   const target=id?$(id):null;const panel=target?.closest('details.atlas-compact-panel');if(panel){panel.open=true;requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}
 }
 function translateCompact(){for(const s of document.querySelectorAll('[data-compact-en]')){if(!s.dataset.compactCn)s.dataset.compactCn=s.textContent;s.textContent=T(s.dataset.compactCn,s.dataset.compactEn);}}
 window.addEventListener('hashchange',revealHashPanel);
 function scrollToResults(){
   const target=$('resultsTitle');if(!target)return;
   target.setAttribute('tabindex','-1');
   requestAnimationFrame(()=>{try{target.focus({preventScroll:true});}catch{}target.scrollIntoView({behavior:'auto',block:'start'});});
 }
 let committedQuery='';
 let lastNoMatch='';
 function updateSearchNext(q,noMatch){
   const box=$('atlasSearchNext');if(!box)return;
   box.hidden=!q;
   if(!q)return;
   // Prioritize matching sites. With no matches put continuation before the empty state.
   const empty=$('atlasEmpty'),paging=$('atlasMore')?.parentElement;
   if(noMatch&&empty)empty.insertAdjacentElement('beforebegin',box);
   else if(paging)paging.insertAdjacentElement('afterend',box);
   $('atlasSearchNextText').textContent=noMatch?T('没有收录「'+q+'」相关资源。','No catalog matches for “'+q+'”.'):T('还想找更多「'+q+'」相关内容？','Looking for more about “'+q+'”?');
   $('atlasReopenNoMatch').hidden=!noMatch;
   for(const a of box.querySelectorAll('[data-search-next-engine]'))a.href=linkGate.searchEngineDestination(a.dataset.searchNextEngine,q);
 }
 function clearSearchNext(){committedQuery='';lastNoMatch='';updateSearchNext('',false);const d=$('atlasNoMatchDialog');if(d?.open){if(d.close)d.close();else d.removeAttribute('open');}}
 function navigateProvider(e,engine,q){
   const target=searchActions?.engineURL(engine,q,linkGate)||linkGate?.searchEngineDestination(engine,q);
   if(!target)return;
   // Keep the anchor's trusted native navigation (including WebView gesture,
   // open-in-new-tab and keyboard activation). Never rewrite to a local search.
   e.currentTarget.href=target;
 }
 for(const a of document.querySelectorAll('[data-search-next-engine]'))a.addEventListener('click',e=>navigateProvider(e,a.dataset.searchNextEngine,committedQuery));
 for(const a of document.querySelectorAll('[data-no-match-engine]'))a.addEventListener('click',e=>navigateProvider(e,a.dataset.noMatchEngine,lastNoMatch));
 for(const a of document.querySelectorAll('[data-search-recommend]'))a.addEventListener('click',e=>{
   const q=(a.id==='atlasRecommendQuery'?lastNoMatch:committedQuery).trim();
   if(!q||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
   e.preventDefault();
   const target=searchActions?.recommendationURL(q,window)||'feedback.php?type=link';
   window.location.assign(target);
 });
 $('atlasReopenNoMatch')?.addEventListener('click',()=>{if(lastNoMatch)openNoMatch(lastNoMatch);});
 function completeSearch(){
   const q=pendingNoMatchQuery.trim();if(!q||q!==query.trim())return;
   pendingNoMatchQuery='';
   committedQuery=q;lastNoMatch='';
   scrollToResults();
   if(filtered().length){updateSearchNext(q,false);return;}
   if(records.some(x=>score(x)>=0)){
     $('atlasFilteredHint').hidden=false;updateSearchNext(q,false);return;
   }
   lastNoMatch=q;updateSearchNext(q,true);
   openNoMatch(q);
 }
 function submitSearch(value){
   clearTimeout(inputTimer);
   clearSearchNext();
   replaceQuery(value.trim());suggestClose();input.blur();
   pendingNoMatchQuery=query.trim();
   if(loaded)completeSearch();
   else {committedQuery=pendingNoMatchQuery;updateSearchNext(committedQuery,false);scrollToResults();}
 }
 function openNoMatch(q){
   const dialog=$('atlasNoMatchDialog');if(!dialog||dialog.open)return;
   $('atlasNoMatchQuery').textContent='“'+q+'”';
   for(const a of document.querySelectorAll('[data-no-match-engine]')){
     a.href=linkGate?.searchEngineDestination(a.dataset.noMatchEngine,q)||a.href;
   }
   $('atlasRecommendQuery').href='feedback.php?type=link';
   try{if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}catch{dialog.setAttribute('open','');}
 }

 $('atlasNoMatchClose')?.addEventListener('click',()=>{const d=$('atlasNoMatchDialog');if(d.close)d.close();else d.removeAttribute('open');});
 $('atlasNoMatchDialog')?.addEventListener('click',e=>{const d=$('atlasNoMatchDialog');if(e.target===d){if(d.close)d.close();else d.removeAttribute('open');}});

 const tabs=[...document.querySelectorAll('[data-tab]')];tabs.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.tab;limit=pageSize;tabs.forEach(t=>{let active=t===b;t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active))});draw()}));
 $('atlasClearFilters')?.addEventListener('click',()=>{
   const resetURL=new URL(location.href);resetURL.searchParams.delete('category');history.replaceState(null,'',resetURL.pathname+resetURL.search+resetURL.hash);
   category='';groupId='';selectedFlow='';multiCategories.clear();mode='all';sourceFilter='all';if(sourceBox)sourceBox.value='all';threatFilter='all';if(threatBox)threatBox.value='all';limit=pageSize;
   for(const id of ['atlasMultiCategory','atlasReviewedOnly'])if($(id))$(id).checked=false;
   if($('atlasSiteLanguageMode'))$('atlasSiteLanguageMode').value='prefer';
   for(const t of tabs){const active=t.dataset.tab==='all';t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active));}
   choiceBar();drawPaths();draw();scrollToResults();
 });
 $('atlasSort').addEventListener('change',async()=>{
   if(['rating','recommended','popular'].includes($('atlasSort').value))await sourceUI?.refreshRatings(false,Number($('atlasRatingWindow')?.value||7));
   draw();
 });
 const ratingHint=$('atlasRatingHint');
 function ratingStatus(){if(ratingHint)ratingHint.textContent=sourceUI?.ratingsAvailable()?T('公开汇总 · 评分至少5份才进入推荐排序。','Public totals · at least 5 ratings to enter recommendation ranking.'):T('公开数据暂不可用 · 本机记录或原始目录排序。','Public data unavailable · device records or catalog order.');}
 let firstRatingRender=true;
 window.addEventListener('aq:ratings-updated',()=>{ratingStatus();if(firstRatingRender){firstRatingRender=false;if(!query&&!document.querySelector('dialog[open]')&&window.scrollY<200)draw();}});
 window.addEventListener('aq:language-change',ratingStatus);
 $('atlasRatingRefresh')?.addEventListener('click',async()=>{await sourceUI?.refreshRatings(true,Number($('atlasRatingWindow')?.value||7));draw();});
 $('atlasRatingWindow')?.addEventListener('change',async()=>{await sourceUI?.refreshRatings(true,Number($('atlasRatingWindow').value));draw();});
 ratingStatus();
 $('atlasSiteLanguageMode')?.addEventListener('change',()=>{limit=pageSize;draw();});
 let inputTimer=null,composing=false;
 function scheduleInput(){clearTimeout(inputTimer);pendingNoMatchQuery='';clearSearchNext();query=input.value.slice(0,140);limit=pageSize;inputTimer=setTimeout(()=>{if(!composing){draw();suggestions()}},90);}
 input.addEventListener('compositionstart',()=>{composing=true;clearTimeout(inputTimer)});
 input.addEventListener('compositionend',()=>{composing=false;scheduleInput()});
 input.addEventListener('input',e=>{if(!composing&&!e.isComposing)scheduleInput()});

 input.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!suggest.hidden){suggestClose()}else{replaceQuery('')}e.preventDefault()}});
 $('atlasForm').addEventListener('submit',e=>{e.preventDefault();if(!composing)submitSearch(input.value);});
 $('atlasClear').addEventListener('click',()=>{clearTimeout(inputTimer);clearSearchNext();pendingNoMatchQuery='';replaceQuery('');suggestClose();input.focus()});
 $('atlasMore').addEventListener('click',()=>{limit+=pageSize;draw()});
 $('atlasShowAll')?.addEventListener('click',()=>{limit=filtered().length;draw();});
 const engineLinks=[...document.querySelectorAll('[data-search-provider]')];
 function refreshEngines(){for(const a of engineLinks){const target=linkGate?.searchEngineDestination(a.dataset.searchProvider,input.value);if(target)a.href=target;}}
 input.addEventListener('input',refreshEngines);
 for(const a of engineLinks)a.addEventListener('click',refreshEngines);
 refreshEngines();
 document.addEventListener('keydown',e=>{const t=e.target;const typing=t&&(t.matches('input,textarea,select')||t.isContentEditable);if(e.defaultPrevented||document.querySelector('dialog[open]'))return;if((e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey)||((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k')){e.preventDefault();input.focus();input.select()}});
 document.addEventListener('click',e=>{if(!e.target.closest('.atlas-search-form'))suggestClose()});
 function mountOptionalRecommendations(){
   localRecommendations=window.AVENQIR_LOCAL_RECOMMEND_UI?.mount({
     items:()=>records,favorites:()=>favorites,open:showExternal,
     reviewed:url=>!!linkGate?.officialSourceReviewed(url)
   })||null;
   regionRecommendations=window.AVENQIR_ATLAS_REGION_UI?.mount({
     items:()=>records,favorites:()=>favorites,open:showExternal,
     reviewed:url=>!!linkGate?.officialSourceReviewed(url)
   })||null;
 }
 window.addEventListener('aq:language-change',()=>{translateCompact();applyDensity(document.body.dataset.atlasDensity);drawPaths();choiceBar();draw();});
 const initialCategory=params.get('category');if(initialCategory&&records.some(x=>x.category===initialCategory))category=initialCategory;
 translateCompact();revealHashPanel();
 // Paint local results before optional recommendation panels or network sync.
 draw();
 source.textContent=T('内置目录已可用 · 同步公开数据中','Built-in catalog ready · syncing public entries');
 const initialLocalQuery=pendingNoMatchQuery;
 // Local results are usable immediately; the no-match verdict waits for the bounded public sync.
 if(initialLocalQuery){committedQuery=initialLocalQuery;updateSearchNext(initialLocalQuery,false);scrollToResults();}
 requestAnimationFrame(()=>setTimeout(()=>{try{updateApprovals();drawPaths();choiceBar();mountOptionalRecommendations()}catch{}},0));
 if($('atlasStartupNotice'))$('atlasStartupNotice').hidden=true;
 catalog.load().then(data=>{
  if(data.remote)records=data.items;
  source.textContent=data.remote?T('在线目录 + 本地精选','Online directory + curated links'):T('内置精选目录（后台不可用）','Built-in directory (backend unavailable)');
  loaded=true;if(data.remote){choiceBar();draw();}
  if(pendingNoMatchQuery)completeSearch();else revealHashPanel();
  localRecommendations?.render();regionRecommendations?.render();drawGuide();
 }).catch(()=>{loaded=true;if(pendingNoMatchQuery)completeSearch();});
})();
