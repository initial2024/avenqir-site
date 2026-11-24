"use strict";
(()=>{
 const $=id=>document.getElementById(id);
 const section=$('popular');
 const model=window.AVENQIR_ATLAS_POPULAR;
 const catalog=window.AVENQIR_ATLAS_CATALOG;
 if(!section||!model||!catalog)return;
 const entries=model.pool(catalog.catalog());
 const picksById=new Map(entries.map(pick=>[pick.entry.id,pick]));
 const gate=window.AVENQIR_LINK_GATE;
 const safety=window.AVENQIR_ATLAS_SAFETY;
 const home=section.dataset.popularView==='home';
 let storage=null;
 try{storage=window.localStorage;}catch{}
 const english=()=>!(window.AVENQIR_I18N?.locale||document.documentElement.lang).toLowerCase().startsWith('zh');
 const t=(zh,en)=>english()?en:zh;
 const el=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text)node.textContent=text;
  return node;
 };
 const validTopics=new Set(model.topics.map(x=>x[0]));
 const initial=new URLSearchParams(location.search).get('popular');
 let topic=validTopics.has(initial)?initial:'all';
 let expanded=false;
 let activeTask='';
 let lastRandom=null;

 function titleFor(pick){
  const type=model.topics.find(x=>x[0]===pick.topic);
  return type?t(type[2],type[3]):pick.entry.category;
 }
 function makeCard(pick){
  const {entry,description,reason,login,files,region}=pick;
  const status=model.access(entry.url,gate,safety);
  const article=el('article','aq-pick');
  article.dataset.pickId=entry.id;
  const meta=el('p','aq-pick-category',titleFor(pick));
  const heading=el('h3','',entry.name);
  const details=el('p','aq-pick-description',t(description[0],description[1]));
  const why=el('p','aq-pick-reason',t(reason[0],reason[1]));
  const loginText={
   no:t('无需登录','No sign-in'),
   optional:t('部分功能需登录','Sign-in for some features'),
   required:t('使用需登录','Sign-in required'),
   depends:t('登录要求随功能变化','Sign-in varies by feature')
  }[login];
  const attrs=el('ul','aq-pick-meta');
  attrs.append(el('li','',loginText));
  attrs.append(el('li','',region?t('地区或内容限制','Regional or content limits'):t('未记录地区限制','No known regional limit')));
  const filesText=files?t('文件可能上传至第三方服务器处理。','Files may be uploaded to a third-party server for processing.'):t('无需上传文件','No file upload required');
  attrs.append(el('li','',filesText));
  const provenance=el('span','aq-pick-provenance',status.blocked?
   t('当前已拦截','Currently blocked'):status.confirmed?
   t('精确网址来源已核对','Exact source checked'):t('来源待核对','Source pending'));
  const footer=el('div','aq-pick-footer');
  footer.append(provenance);
  if(!status.blocked){
   const link=el('a','aq-pick-link',t('访问网站','Open site'));
   link.href=gate.maySkipConfirmation(entry.url,storage)?entry.url:'leave.html?url='+encodeURIComponent(entry.url)+'&name='+encodeURIComponent(entry.name);
   link.rel='noopener noreferrer';
   link.referrerPolicy='no-referrer';
   link.setAttribute('aria-label',t('访问 '+entry.name,'Open '+entry.name));
   link.addEventListener('click',event=>{
    if(model.access(entry.url,gate,safety).blocked)event.preventDefault();
   });
   footer.append(link);
  }
  article.append(meta,heading,details,why,attrs,footer);
  return article;
 }
 function showPreview(pick){
  lastRandom=pick;
  const preview=$('popularPreview');
  preview.hidden=false;
  preview.replaceChildren(pick?makeCard(pick):el('p','',t('暂时没有可推荐的网址。','There are no eligible picks right now.')));
 }
 function chooseRandom(){
  showPreview(model.drawRandom(entries,gate,safety,lastRandom?.entry.id));
 }
 function homeCards(){
  const ordered=[...entries.filter(p=>p.home),...entries.filter(p=>!p.home)];
  return ordered.slice(0,16);
 }
 function visibleCards(){
  if(home)return homeCards();
  const filtered=topic==='all'?entries:entries.filter(x=>x.topic===topic);
  return expanded||topic!=='all'?filtered:filtered.slice(0,12);
 }
 function renderCards(){
  const cards=$('popularCards');
  cards.dataset.expanded=String(expanded&&topic==='all');
  cards.replaceChildren(...visibleCards().map(makeCard));
  $('popularNetworkNote').hidden=topic!=='network'&&!home&&topic!=='all';
  const showAll=$('popularExpand');
  if(showAll){
   showAll.hidden=topic!=='all'||entries.length<=12;
   showAll.textContent=expanded?t('收起完整精选','Show fewer picks'):t('查看全部 '+entries.length+' 个精选','Show all '+entries.length+' picks');
   showAll.setAttribute('aria-expanded',String(expanded));
  }
 }
 function renderTopics(){
  const nodes=[];
  if(!home){
   const all=el('button','aq-popular-chip',t('全部精选','All picks'));
   all.type='button';
   all.dataset.popularTopic='all';
   nodes.push(all);
  }
  const topics=home?model.topics.slice(0,7):model.topics;
  for(const [id,icon,zh,en] of topics){
   const node=el(home?'a':'button','aq-popular-chip',icon+' '+t(zh,en));
   if(home)node.href='directory.html?popular='+id+'#popular';
   else{node.type='button';node.dataset.popularTopic=id;}
   nodes.push(node);
  }
  for(const node of nodes){
   const value=node.dataset.popularTopic;
   if(!value)continue;
   node.setAttribute('aria-pressed',String(value===topic));
   node.addEventListener('click',()=>{
    topic=value;
    for(const button of nodes)button.setAttribute('aria-pressed',String(button===node));
    renderCards();
   });
  }
  $('popularTopics').replaceChildren(...nodes);
 }
 function renderIntent(){
  const buttons=$('popularIntentButtons');
  if(!buttons)return;
  const result=$('popularIntentResults');
  const renderResults=()=>{
   result.hidden=!activeTask||activeTask==='random';
   const task=model.tasks.find(x=>x[0]===activeTask);
   const results=(task?.[3]||[]).map(id=>picksById.get(id)).filter(Boolean);
   result.replaceChildren(...results.map(makeCard));
  };
  buttons.replaceChildren(...model.tasks.map(([id,zh,en])=>{
   const button=el('button','aq-popular-chip',t(zh,en));
   button.type='button';
   button.dataset.popularIntent=id;
   button.setAttribute('aria-pressed',String(id===activeTask));
   button.addEventListener('click',()=>{
    activeTask=id;
    for(const node of buttons.children)node.setAttribute('aria-pressed',String(node===button));
    if(id==='random')chooseRandom();
    renderResults();
   });
   return button;
  }));
  renderResults();
 }
 function render(){
  $('popularTitle').textContent=home?t('🔥 最近值得试试','🔥 Popular picks'):t('🔥 大众热门','🔥 Popular');
  $('popularDescription').textContent=t('编辑精选 · 用途与上手体验排序','Editor picks, ordered by usefulness and ease of use');
  $('popularRandom').textContent=t('🎲 随便逛一个','🎲 Pick a site');
  $('popularNetworkNote').textContent=t('检测结果属于第三方信息，不代表绝对安全。','Third-party checks provide information and cannot guarantee safety.');
  if(home)$('popularMore').textContent=t('去目录看完整精选','See all editor picks');
  else $('popularIntentTitle').textContent=t('我现在想……','I want to…');
  renderTopics();
  renderCards();
  renderIntent();
  if(lastRandom)showPreview(lastRandom);
 }
 $('popularRandom').addEventListener('click',chooseRandom);
 $('popularExpand')?.addEventListener('click',()=>{
  expanded=!expanded;
  renderCards();
 });
 window.addEventListener('aq:language-change',render);
 render();
})();
