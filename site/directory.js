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
     trackOpen(href);
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
     if(confirm('即将前往未核验第三方域名 '+u.hostname+'。本站不保证该网站安全，确认继续访问？')){trackOpen(href);window.location.assign(href);}
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
 const taxonomy=window.AVENQIR_ATLAS_TAXONOMY||{groups:[],categoriesFor:()=>[],groupFor:()=>null};
 const params=new URLSearchParams(location.search);
 const input=$('atlasQuery'),results=$('atlasResults'),cats=$('atlasCategories'),summary=$('atlasSummary'),source=$('atlasSource'),suggest=$('atlasSuggestions');
 const combine=catalog.combine;
 let records=catalog.catalog(), query=(params.get('q')||'').slice(0,140),category='',mode='all',limit=24,loaded=false,selectedFlow='',reviewedOnly=false,groupId='',expandedCategories=false;
 const key='avenqir.link-atlas.favorites.v8';let favorites=[],compareUrls=[];let pendingNoMatchQuery='';
 let localRecommendations=null;
 function trackOpen(url){
   const item=records.find(x=>x.url===url);
   if(item)localRecommendations?.recordOpen(item.category);
 }
 try{const v=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(v))favorites=v.filter(x=>typeof x==='string').slice(0,500)}catch{}
 input.value=query;
 const normalize=x=>String(x||'').toLocaleLowerCase().normalize('NFKC').trim();
 const meaningful=x=>[x.name,x.url,x.category,x.description].map(normalize);
 function score(x){if(!query)return 1;const terms=normalize(query).split(/\s+/).filter(Boolean);const fields=meaningful(x);
   if(!terms.every(w=>fields.some(v=>v.includes(w))))return -1;
   return terms.reduce((acc,t)=>acc+(fields[0]===t?12:fields[0].startsWith(t)?8:fields[0].includes(t)?6:0)+(fields[1].includes(t)?4:0)+(fields[2].includes(t)?3:0)+(fields[3].includes(t)?1:0),0);
 }
 function matchingGroup(x){
   if(!groupId)return true;
   if(groupId==='other')return !taxonomy.groupFor(x.category);
   return taxonomy.groupFor(x.category)===groupId;
 }
 function filtered(){const flow=paths.flows.find(f=>f.id===selectedFlow);const selectedUrls=flow?new Set(flow.urls):null;
   let r=records.map(x=>({x,rank:score(x)})).filter(({x,rank})=>rank>=0&&matchingGroup(x)&&(!category||x.category===category)&&(mode!=='saved'||favorites.includes(x.url))&&(!selectedUrls||selectedUrls.has(x.url))&&(!reviewedOnly||!!linkGate?.officialSourceReviewed(x.url)));
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
       selectedFlow=selectedFlow===f.id?'':f.id;category='';groupId='';mode='all';query='';input.value='';limit=24;
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
 reviewedBox?.addEventListener('change',()=>{reviewedOnly=!!reviewedBox.checked;limit=24;draw();});
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
 function choiceBar(){
   const counts=new Map();
   records.forEach(x=>counts.set(x.category,(counts.get(x.category)||0)+1));
   const categories=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));
   const totalCategories=categories.length;
   const knownGroups=taxonomy.groups||[];
   const knownCats=new Set(knownGroups.flatMap(g=>g.categories));
   const otherCategories=categories.filter(([name])=>!knownCats.has(name)).map(([name])=>name);
   const groups=[...knownGroups];
   if(otherCategories.length)groups.push({id:'other',title:'其他收录',icon:'🗃️',description:'来自站点后台的新增分类',categories:otherCategories});
   const bar=$('atlasGroupBar');
   if(bar){
     bar.replaceChildren();
     const makeGroup=(id,label,desc,count,iconText)=>{
       const button=el('button','atlas-group'+(groupId===id?' selected':''));button.type='button';
       button.setAttribute('aria-pressed',String(groupId===id));
       button.append(el('span','atlas-group-icon',iconText),el('strong','',label+' · '+count),el('small','',desc));
       button.addEventListener('click',()=>{
         groupId=id;category='';selectedFlow='';limit=24;
         if($('atlasCategorySearch'))$('atlasCategorySearch').value='';
         expandedCategories=false;choiceBar();drawPaths();draw();
         $('atlasResults').scrollIntoView({behavior:'smooth',block:'start'});
       });
       bar.append(button);
     };
     makeGroup('','全部领域','浏览完整收录',records.length,'✦');
     groups.forEach(g=>{
       const n=records.filter(x=>g.categories.includes(x.category)).length;
       if(n>0)makeGroup(g.id,g.title,g.description,n,g.icon);
     });
   }
   const hint=$('atlasTaxonomySummary');
   if(hint)hint.textContent='已加载 '+records.length+' 个独立网址 · '+totalCategories+' 个分类 · '+knownGroups.length+' 个主题分组（点击筛选）';
   const inputCategory=$('atlasCategorySearch');
   const needle=normalize(inputCategory?.value);
   let entries=categories.filter(([name])=>(!groupId||(groupId==='other'?!taxonomy.groupFor(name):taxonomy.groupFor(name)===groupId))&&(!needle||normalize(name).includes(needle)));
   // Keep the selected category visible even when it would not rank in the first 12.
   const totalInGroup=categories.reduce((n,[name,count])=>n+(!groupId||(groupId==='other'?!taxonomy.groupFor(name):taxonomy.groupFor(name)===groupId)?count:0),0);
   const visibleCategories=entries.length;
   if(!expandedCategories&&!needle)entries=entries.slice(0,12);
   cats.replaceChildren();
   const add=(name,count)=>{
     const title=name?name+' · '+count:'全部 · '+totalInGroup;
     const button=el('button','atlas-cat'+(category===name?' selected':''),title);
     button.type='button';button.setAttribute('aria-pressed',String(category===name));
     button.addEventListener('click',()=>{category=name;limit=24;choiceBar();draw()});
     cats.append(button);
   };
   if(!needle)add('',totalInGroup);
   for(const [name,count] of entries)add(name,count);
   const expand=$('atlasExpandCategories');
   if(expand){
     expand.hidden=!!needle||visibleCategories<=12;
     expand.setAttribute('aria-expanded',String(expandedCategories));
     expand.textContent=expandedCategories?'收起分类':'展开全部 '+visibleCategories+' 个分类';
   }
   const side=$('atlasCategoryCount');
   if(side){
     side.replaceChildren();
     categories.slice(0,16).forEach(([name,count])=>{
       let button=el('button','',name+' · '+count);button.type='button';
       button.addEventListener('click',()=>{
         groupId=taxonomy.groupFor(name)||'other';category=name;expandedCategories=true;limit=24;
         if(inputCategory)inputCategory.value='';
         choiceBar();draw();
         window.scrollTo({top:Math.max(0,$('atlasResults').getBoundingClientRect().top+window.scrollY-150),behavior:'smooth'});
       });
       side.append(button);
     });
   }
 }
 $('atlasExpandCategories')?.addEventListener('click',()=>{
   expandedCategories=!expandedCategories;choiceBar();
 });
 $('atlasCategorySearch')?.addEventListener('input',()=>{
   groupId='';category='';selectedFlow='';expandedCategories=true;limit=24;
   choiceBar();drawPaths();draw();
 });
 function replaceQuery(v){query=v.slice(0,140);input.value=query;limit=24;draw();const u=new URL(location.href);query?u.searchParams.set('q',query):u.searchParams.delete('q');history.replaceState(null,'',u.pathname+u.search+u.hash)}
 function suggestClose(){suggest.hidden=true;suggest.replaceChildren()}
 function suggestions(){const q=normalize(input.value);suggest.replaceChildren();if(q.length<2){suggestClose();return}
   const matched=records.filter(r=>meaningful(r).some(v=>v.includes(q))).slice(0,5);if(!matched.length){suggestClose();return}
   matched.forEach(r=>{const b=el('button','atlas-suggest-item',r.name);b.type='button';b.setAttribute('role','option');b.append(el('small','',new URL(r.url).hostname+' · '+r.category));b.addEventListener('click',()=>{replaceQuery(r.name);suggestClose();input.focus()});suggest.append(b)});suggest.hidden=false;
 }
 function draw(){const list=filtered(), shown=list.slice(0,limit);results.replaceChildren();$('atlasEmpty').hidden=list.length!==0;
   $('resultsTitle').textContent=mode==='saved'?'我的收藏':selectedFlow?paths.flows.find(f=>f.id===selectedFlow).title:query?'搜索结果':category?category+' · 网站':groupId?((taxonomy.groups||[]).find(g=>g.id===groupId)?.title||'其他收录'):'精选网站';
   summary.textContent=(query?'匹配':'目录')+' '+list.length+' 个网站 · 显示 '+shown.length+' 条 / 总目录 '+records.length+' 条'+(category?' · 分类：'+category:'')+(groupId?' · 当前主题分组已筛选':'');
   const counter=$('atlasLiveCount');if(counter)counter.textContent='已整理 '+records.length+' 个独立网址 · '+paths.flows.length+' 条任务路径 · '+new Set(records.map(x=>x.category)).size+' 个分类';
   const more=$('atlasMore'),all=$('atlasShowAll');more.textContent='再显示 '+Math.min(24,Math.max(0,list.length-limit))+' 条 ↓';
   if(all){all.hidden=list.length<=shown.length;all.textContent='一次显示全部 '+list.length+' 条';}
   for(const x of shown){const url=safeUrl(x.url);if(!url)continue;const host=new URL(url).hostname;
     const card=el('article','atlas-result');const icon=el('div','atlas-result-icon',x.name.slice(0,1).toLocaleUpperCase());icon.setAttribute('aria-hidden','true');
     const data=el('div','atlas-result-info');const hostrow=el('div','atlas-hostline');hostrow.append(el('span','atlas-host',host),el('span','atlas-chip',x.category||'其他'));data.append(hostrow);
     const a=el('a','atlas-result-title',x.name+' ↗');const reviewed=!!linkGate?.officialSourceReviewed(url);const permitted=isAllowed(url);a.href=permitted?url:'leave.html?url='+encodeURIComponent(url)+'&name='+encodeURIComponent(x.name);a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';a.addEventListener('click',e=>{
       if(e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
       if(!permitted){e.preventDefault();showExternal(url,x.name);}
       else trackOpen(url);
     });data.append(a);data.append(el('small',permitted?'atlas-review-ok':'atlas-review-unknown',reviewed?'官方来源已核对 · 直接访问':permitted?'本机已记住 · 直接访问':'第三方来源未核验 · 点击后确认'));
     data.append(el('p','atlas-result-desc',x.description||'访问网站'));
     const report=el('a','atlas-report-link','报告失效 ↗');report.href='feedback.php?type=broken&url='+encodeURIComponent(url);report.setAttribute('aria-label','报告 '+x.name+' 链接失效');
     const cmp=el('button','atlas-compare-add',compareUrls.includes(url)?'✓ 已加入对比':'＋ 对比');
     cmp.type='button';cmp.setAttribute('aria-pressed',String(compareUrls.includes(url)));
     cmp.addEventListener('click',()=>{
       if(compareUrls.includes(url))compareUrls=compareUrls.filter(v=>v!==url);
       else if(compareUrls.length<3)compareUrls.push(url);
       else {const status=$('atlasCompareStatus');if(status)status.textContent='最多同时比较三个网址，先移除一个。';return;}
       draw();
     });
     const cardActions=el('div','atlas-card-actions');cardActions.append(report,cmp);data.append(cardActions);
     const star=el('button','atlas-star'+(favorites.includes(x.url)?' saved':''),favorites.includes(x.url)?'★':'☆');star.type='button';star.title=favorites.includes(x.url)?'取消收藏':'收藏到本机';star.setAttribute('aria-label',star.title);star.addEventListener('click',()=>{if(favorites.includes(x.url))favorites=favorites.filter(u=>u!==x.url);else {favorites.push(x.url);localRecommendations?.recordSave(x.category);}storeFavorites();draw();localRecommendations?.render()});
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
       el('small','',item.category+' · '+new URL(item.url).hostname),
       el('p','',item.description));
     const proven=!!linkGate?.officialSourceReviewed(item.url);
     card.append(el('small','',proven?'已核对官方来源（非安全认证）':'来源未核对（需跳转确认）'));
     const remove=el('button','', '移出对比');remove.type='button';
     remove.addEventListener('click',()=>{compareUrls=compareUrls.filter(v=>v!==url);draw();});
     card.append(remove);list.append(card);
   }
 }
 $('atlasCompareClear')?.addEventListener('click',()=>{compareUrls=[];draw();});
 $('atlasCompareCopy')?.addEventListener('click',async()=>{
   const status=$('atlasCompareStatus');
   const lines=compareUrls.map(url=>records.find(x=>x.url===url)).filter(Boolean).map(x=>
      x.name+' | '+x.category+' | '+x.url+'\n'+x.description+'\n'+
      (linkGate?.officialSourceReviewed(x.url)?'来源已核对':'来源未核对'));
   const text=lines.join('\n\n');
   if(!text){if(status)status.textContent='请先选择要对比的网址';return;}
   try{await navigator.clipboard.writeText(text);if(status)status.textContent='已复制 '+lines.length+' 条对比摘要。';}
   catch{if(status)status.textContent='此浏览器禁止复制，请检查站点权限。';}
 });
 function openNoMatch(){
   const q=pendingNoMatchQuery.trim();if(!q||q!==query.trim())return;
   if(records.some(x=>score(x)>=0))return;
   const dialog=$('atlasNoMatchDialog');if(!dialog||dialog.open)return;
   $('atlasNoMatchQuery').textContent='“'+q+'”';
   for(const a of document.querySelectorAll('[data-no-match-engine]')){
     a.href=linkGate?.searchEngineDestination(a.dataset.noMatchEngine,q)||a.href;
   }
   $('atlasRecommendQuery').href='feedback.php?type=link&q='+encodeURIComponent(q);
   if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
   pendingNoMatchQuery='';
 }
 $('atlasNoMatchClose')?.addEventListener('click',()=>{const d=$('atlasNoMatchDialog');if(d.close)d.close();else d.removeAttribute('open');});
 $('atlasNoMatchDialog')?.addEventListener('click',e=>{const d=$('atlasNoMatchDialog');if(e.target===d){if(d.close)d.close();else d.removeAttribute('open');}});

 const tabs=[...document.querySelectorAll('[data-tab]')];tabs.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.tab;limit=24;tabs.forEach(t=>{let active=t===b;t.classList.toggle('active',active);t.setAttribute('aria-pressed',String(active))});draw()}));
 $('atlasSort').addEventListener('change',draw);
 input.addEventListener('input',()=>{pendingNoMatchQuery='';query=input.value.slice(0,140);limit=24;draw();suggestions()});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!suggest.hidden){suggestClose()}else{replaceQuery('')}e.preventDefault()}});
 $('atlasForm').addEventListener('submit',e=>{e.preventDefault();replaceQuery(input.value);suggestClose();pendingNoMatchQuery=query.trim();if(loaded)openNoMatch();});
 $('atlasClear').addEventListener('click',()=>{replaceQuery('');suggestClose();input.focus()});
 $('atlasMore').addEventListener('click',()=>{limit+=24;draw()});
 $('atlasShowAll')?.addEventListener('click',()=>{limit=filtered().length;draw();});
 $('atlasRandom').addEventListener('click',()=>{let entries=filtered();if(!entries.length)entries=records;const entry=entries[Math.floor(Math.random()*entries.length)];if(entry)showExternal(entry.url,entry.name)});
 const engineLinks=[...document.querySelectorAll('[data-search-provider]')];
 function refreshEngines(){for(const a of engineLinks){const target=linkGate?.searchEngineDestination(a.dataset.searchProvider,input.value);if(target)a.href=target;}}
 input.addEventListener('input',refreshEngines);
 for(const a of engineLinks)a.addEventListener('click',refreshEngines);
 refreshEngines();
 document.addEventListener('keydown',e=>{const t=e.target;const typing=t&&(t.matches('input,textarea,select')||t.isContentEditable);if((e.key==='/'&&!typing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();input.focus();input.select()}});
 document.addEventListener('click',e=>{if(!e.target.closest('.atlas-search-form'))suggestClose()});
 localRecommendations=window.AVENQIR_LOCAL_RECOMMEND_UI?.mount({
   items:()=>records,favorites:()=>favorites,open:showExternal,
   reviewed:url=>!!linkGate?.officialSourceReviewed(url)
 })||null;
 updateApprovals();drawPaths();choiceBar();draw();
 catalog.load().then(data=>{
  records=data.items;
  source.textContent=data.remote?'在线目录 + 本地精选':'内置精选目录（后台不可用）';
  loaded=true;choiceBar();draw();localRecommendations?.render();
  if(pendingNoMatchQuery)openNoMatch();
 });
})();
