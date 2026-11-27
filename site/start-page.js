"use strict";
(()=>{
  const byId=id=>document.getElementById(id);
  const query=byId('startQuery');
  const categoryBar=byId('startCategories');
  const clear=byId('startClear');
  const count=byId('startCount');
  const more=byId('startMore');
  const settings=byId('startSettings');
  const settingsToggle=byId('startSettingsToggle');
  const empty=byId('startEmpty');
  const anchors=byId('startAnchors');
  const language=byId('startLanguage');
  const summary=byId('startSnapshotLine');
  const grid=byId('startCards');
  const remember=byId('startRemember');
  const clearRecent=byId('startClearRecent');
  const emptyClear=byId('startEmptyClear');
  const pageSize=8;
  const densityKey='avenqir.start.density';
  const favoritesKey='avenqir.start.favorites.v1';
  const recentKey='avenqir.start.recent.v1';
  const rememberKey='avenqir.start.remember.v1';
  const recentLimit=5;
  const cards=Array.from(document.querySelectorAll('.start-card'),element=>({
    element,
    path:element.getAttribute('href'),
    category:element.dataset.startCategory,
    keywords:element.dataset.keywords,
    fields:Array.from(element.querySelectorAll('[data-start-en]'),field=>({
      element:field,zh:field.textContent,en:field.dataset.startEn,
    })),
  }));
  const cardsByPath=new Map(cards.map(card=>[card.path,card]));
  const categoryNames={
    all:['全部','All'],favorites:['收藏','Favorites'],recent:['最近','Recent'],
    discover:['发现','Discover'],local:['本地数据','Local data'],
    tools:['实用工具','Tools'],daily:['日常与休闲','Daily & play'],
    network:['网络自查','Network'],dev:['开发者','Developer'],contact:['留言','Feedback'],
  };
  const labels={
    tagline:['本地优先的工具起始页','A local-first start page'],
    searchLabel:['搜索工具或分类','Find tools or categories'],directory:['搜公开网址','Find sites'],
    placeholder:['搜索工具或分类','Search tools or categories'],
    clear:['清空搜索','Clear search'],tools:['工具入口','Tools'],
    empty:['没有匹配的工具。试试简称或分类名。','No matching tools. Try a shorter name or a category.'],
    noFavorites:['还没有收藏。点工具卡片旁的星标即可收藏。','No favorites yet. Select the star on a tool to save it.'],
    noRecent:['还没有使用记录。打开过的首页工具会显示在这里。','No recent tools yet. The tools you open from this page will appear here.'],
    recentDisabled:['最近使用未启用，可以在设置中打开。','Recent tools are turned off. You can enable them in Settings.'],
    local:['本地存储 · 不同步 · 可导出','Stored locally · No sync · Export available'],
    settings:['设置','Settings'],close:['关闭','Close'],appearance:['外观','Appearance'],
    comfortable:['舒适','Comfortable'],compact:['紧凑','Compact'],
    theme:['更多主题设置','More appearance settings'],
    system:['系统','System'],light:['浅色','Light'],dark:['深色','Dark'],eye:['护眼','Reading'],
    searchSettings:['搜索与最近使用','Search and recently used'],
    commandSearch:['快捷搜索工具和书签','Quick tool and bookmark search'],
    keys:['/ 聚焦搜索 · Ctrl 或 ⌘ + K 快捷搜索 · ↑↓ 移动 · Esc 清空或关闭',
      '/ Focus search · Ctrl or ⌘ + K Open quick search · ↑↓ Move · Esc Clear or close'],
    remember:['在此浏览器记录最近使用的 5 个首页工具','Remember the last five start-page tools in this browser'],
    clearRecent:['清除最近使用','Clear recent tools'],
    data:['数据','Data'],about:['关于','About'],version:['部署版本','Deployment version'],
    addBookmarks:['添加自定义网址','Add a custom bookmark'],
    backup:['导入与导出','Import and export'],manage:['管理本地书签数据','Manage local bookmarks'],
    policy:['隐私说明','Privacy policy'],
    localHelp:['书签、笔记和游戏存档保存在当前浏览器。换设备时可以导出备份。','Bookmarks, notes and game saves stay in this browser. Export a backup to move them to another device.'],
    snapshot:['本地快照','Browser snapshot'],timeZone:['时区','Time zone'],
    browserLanguage:['浏览器语言','Browser language'],viewport:['可视区域','Viewport'],browser:['浏览器','Browser'],
    snapshotPrivacy:['这些信息由当前浏览器在本地读取，无需查询公网 IP。','These details are read locally in this browser. No public IP lookup is needed.'],
    offline:['当前离线。已缓存的本地工具仍可使用。','You’re offline. Previously cached local tools are still available.'],
    noStorage:['当前浏览器无法保存更改。','This browser could not save your changes.'],
  };
  const chinese=()=>String(window.AVENQIR_I18N?.locale||document.documentElement.lang).startsWith('zh');
  const t=(zh,en)=>chinese()?zh:en;
  const translated=pair=>t(...pair);
  const categories=new Map(Object.keys(categoryNames).map(key=>{
    const link=document.createElement('a');
    const anchor=document.createElement('span');
    const label=document.createElement('span');
    const total=document.createElement('span');
    link.href='#'+key;
    link.className='start-control start-category';
    link.dataset.category=key;
    anchor.id=key;
    total.className='start-category-count';
    link.append(label,total);
    categoryBar.append(link);
    anchors.append(anchor);
    return [key,{link,anchor,label,total}];
  }));
  let category='all';
  let expanded=false;
  let favorites=[];
  let recent=[];

  function loadPaths(key){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(value)?[...new Set(value.filter(path=>cardsByPath.has(path)))]:[];
    }catch{return [];}
  }

  function save(key,value){
    try{localStorage.setItem(key,value);return true;}
    catch{byId('startStorage').hidden=false;return false;}
  }

  function loadCollections(){
    favorites=loadPaths(favoritesKey);
    try{remember.checked=localStorage.getItem(rememberKey)==='1';}
    catch{byId('startStorage').hidden=false;}
    recent=remember.checked?loadPaths(recentKey).slice(0,recentLimit):[];
  }

  loadCollections();
  for(const card of cards){
    const tile=document.createElement('div');
    tile.className='start-tile';
    const star=document.createElement('button');
    star.type='button';
    star.className='start-star';
    card.element.before(tile);
    tile.append(card.element,star);
    card.tile=tile;
    card.star=star;
    star.addEventListener('click',()=>{
      const current=loadPaths(favoritesKey);
      const next=current.includes(card.path)?current.filter(path=>path!==card.path):[...current,card.path];
      if(!save(favoritesKey,JSON.stringify(next)))return;
      favorites=next;
      render();
      if(tile.hidden)categories.get('favorites').link.focus();
    });
    function record(){
      try{if(localStorage.getItem(rememberKey)!=='1')return;}
      catch{return;}
      const paths=loadPaths(recentKey);
      const next=[card.path,...paths.filter(path=>path!==card.path)].slice(0,recentLimit);
      if(save(recentKey,JSON.stringify(next)))recent=next;
    }
    card.element.addEventListener('click',record);
    card.element.addEventListener('auxclick',event=>{if(event.button===1)record();});
  }

  function highlight(element,text,pattern){
    element.textContent='';
    if(!pattern){element.textContent=text;return;}
    let cursor=0;
    for(const match of text.matchAll(pattern)){
      const mark=document.createElement('mark');
      mark.textContent=match[0];
      element.append(text.slice(cursor,match.index),mark);
      cursor=match.index+match[0].length;
    }
    element.append(text.slice(cursor));
  }

  function render(){
    const terms=Array.from(new Set(query.value.toLowerCase().trim().split(/\s+/).filter(Boolean)));
    const escaped=terms.sort((a,b)=>b.length-a.length).map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    const pattern=escaped.length?new RegExp(escaped.join('|'),'giu'):null;
    const totals=new Map(),search=window.AVENQIR_ATLAS_SEARCH,prepared=search?.prepare(query.value);
    const matched=cards.filter(card=>{
      const fields=[card.fields[0]?.zh,card.path,categoryNames[card.category].join(' '),[card.keywords,...card.fields.flatMap(field=>[field.zh,field.en])].join(' ')];
      const index=fields.join(' ').toLowerCase();
      if(prepared?search.rank(prepared,fields)<0:!terms.every(term=>index.includes(term)))return false;
      totals.set(card.category,(totals.get(card.category)||0)+1);
      return true;
    });
    totals.set('favorites',matched.filter(card=>favorites.includes(card.path)).length);
    totals.set('recent',matched.filter(card=>recent.includes(card.path)).length);
    const selected=totals.get(category)>0||(!terms.length&&['favorites','recent'].includes(category))?category:'all';
    for(const [key,entry] of categories){
      const total=key==='all'?matched.length:(totals.get(key)||0);
      const localCollection=['favorites','recent'].includes(key);
      entry.link.hidden=key!=='all'&&total===0&&(!localCollection||terms.length>0);
      if(selected===key)entry.link.setAttribute('aria-current','location');
      else entry.link.removeAttribute('aria-current');
      entry.label.textContent=translated(categoryNames[key]);
      entry.total.textContent=String(total);
    }
    const visible=matched.filter(card=>{
      if(selected==='favorites')return favorites.includes(card.path);
      if(selected==='recent')return recent.includes(card.path);
      return selected==='all'||card.category===selected;
    });
    const ordered=selected==='recent'?[...recent.map(path=>cardsByPath.get(path)),...cards.filter(card=>!recent.includes(card.path))]:cards;
    if(ordered.some((card,index)=>grid.children[index]!==card.tile))for(const card of ordered)grid.append(card.tile);
    const page=new Set(expanded?visible:ordered.filter(card=>visible.includes(card)).slice(0,pageSize));
    for(const card of cards){
      card.tile.hidden=card.element.hidden=!page.has(card);
      for(const field of card.fields)highlight(field.element,t(field.zh,field.en),pattern);
      card.fields[0].element.title=card.fields[0].element.textContent;
      const favorite=favorites.includes(card.path);
      card.star.textContent=favorite?'★':'☆';
      card.star.setAttribute('aria-pressed',String(favorite));
      card.star.setAttribute('aria-label',t('收藏工具','Favorite tool')+' · '+card.fields[0].element.textContent);
    }
    count.textContent=t(`匹配 ${visible.length} 个工具`,`${visible.length} matching tools`);
    empty.hidden=visible.length!==0;
    byId('startEmptyMessage').textContent=translated(selected==='favorites'?'noFavorites':selected==='recent'?(remember.checked?'noRecent':'recentDisabled'):'empty');
    emptyClear.hidden=!query.value;
    clearRecent.disabled=!recent.length;
    clear.hidden=query.value==='';
    more.hidden=visible.length<=pageSize;
    more.textContent=expanded?t('收起','Show fewer'):t(`查看全部 ${visible.length} 项`,`Show all ${visible.length} tools`);
    more.setAttribute('aria-expanded',String(expanded));
    updateScrollHint();
  }

  function updateScrollHint(){
    const rail=categoryBar.parentElement;
    const scrolled=Math.abs(categoryBar.scrollLeft);
    rail.classList.toggle('has-before',scrolled>2);
    rail.classList.toggle('has-after',scrolled+categoryBar.clientWidth<categoryBar.scrollWidth-2);
  }

  function resetSearch(){
    query.value='';
    expanded=false;
    render();
    query.focus();
  }
  function readCategory(){
    const key=location.hash.slice(1);
    const entry=categories.get(key);
    if(!entry&&category==='all')return;
    category=entry?key:'all';
    expanded=false;
    render();
    if(entry)requestAnimationFrame(()=>{
      if(location.hash!=='#'+key)return;
      if(!entry.link.hidden){
        const railRect=categoryBar.getBoundingClientRect();
        const linkRect=entry.link.getBoundingClientRect();
        categoryBar.scrollLeft+=linkRect.left+linkRect.width/2-railRect.left-railRect.width/2;
      }
      entry.anchor.scrollIntoView({block:'start'});
    });
  }
  window.addEventListener('hashchange',readCategory);
  window.addEventListener('pageshow',()=>{
    loadCollections();
    render();
  });
  window.addEventListener('storage',event=>{
    if(event.key!==null&&![favoritesKey,recentKey,rememberKey].includes(event.key))return;
    loadCollections();
    render();
  });
  remember.addEventListener('change',()=>{
    if(!save(rememberKey,remember.checked?'1':'0'))remember.checked=!remember.checked;
    else if(!remember.checked)save(recentKey,'[]');
    loadCollections();
    render();
  });
  clearRecent.addEventListener('click',()=>{
    if(!save(recentKey,'[]'))return;
    recent=[];
    render();
    remember.focus();
  });
  more.addEventListener('click',()=>{
    expanded=!expanded;
    render();
  });
  query.addEventListener('input',()=>{expanded=false;render();});
  clear.addEventListener('click',resetSearch);
  emptyClear.addEventListener('click',resetSearch);
  categoryBar.addEventListener('scroll',updateScrollHint,{passive:true});
  window.addEventListener('resize',updateScrollHint,{passive:true});
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing||document.querySelector('dialog[open]'))return;
    const typing=event.target instanceof Element&&event.target.closest('input, textarea, select, [contenteditable="true"]');
    const slash=event.key==='/'&&!typing&&!event.altKey&&!event.ctrlKey&&!event.metaKey;
    const command=(event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='k';
    if(slash){event.preventDefault();query.focus();}
    if(command){
      event.preventDefault();
      const shortcut=byId('aqQuickSearch');
      if(shortcut)shortcut.click();else query.focus();
    }
    if(event.key==='?'&&!typing&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      event.preventDefault();
      settings.showModal();
      byId('startKeyHelp').focus();
    }
    if(event.key==='Escape'&&event.target===query&&query.value){event.preventDefault();resetSearch();}
  });
  query.addEventListener('keydown',event=>{
    if(event.key!=='ArrowDown'||event.isComposing)return;
    const first=grid.querySelector('.start-card:not([hidden])');
    if(first){event.preventDefault();first.focus();}
  });
  grid.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp'].includes(event.key)||!event.target.matches('.start-card'))return;
    const visible=[...grid.querySelectorAll('.start-card:not([hidden])')];
    const direction=event.key==='ArrowDown'?1:-1;
    const next=visible[visible.indexOf(event.target)+direction];
    event.preventDefault();
    if(next)next.focus();else if(direction<0)query.focus();
  });

  const densityOptions=document.querySelectorAll('input[name="startDensity"]');
  function setDensity(value){
    const density=value==='compact'?'compact':'comfortable';
    document.body.dataset.startDensity=density;
    for(const input of densityOptions)input.checked=input.value===density;
  }
  try{setDensity(localStorage.getItem(densityKey)||(window.matchMedia('(max-width:600px)').matches?'compact':'comfortable'));}catch{setDensity(window.matchMedia('(max-width:600px)').matches?'compact':'comfortable');}
  for(const input of densityOptions){
    input.addEventListener('change',()=>{
      setDensity(input.value);
      save(densityKey,input.value);
    });
  }
  function showStorageUsage(){let usage=null;try{usage=window.AVENQIR_LOCAL_ORGANIZE?.usage(localStorage);}catch{}const out=byId('startStorageUsage');if(out)out.textContent=usage?t('本站本地数据估算：'+(usage.bytes/1024).toFixed(1)+' KiB（'+usage.keys+' 项，不含缓存）','Estimated site local storage: '+(usage.bytes/1024).toFixed(1)+' KiB ('+usage.keys+' entries, excluding cache)'):t('本地存储暂不可读','Local storage unavailable');}
  settingsToggle.addEventListener('click',()=>{showStorageUsage();settings.showModal();});
  settings.addEventListener('close',()=>settingsToggle.focus());
  byId('startCommandSearch').addEventListener('click',()=>{
    const shortcut=byId('aqQuickSearch');
    if(!shortcut)return;
    settings.addEventListener('close',()=>shortcut.click(),{once:true});
    settings.close();
  });
  settingsToggle.hidden=false;
  categoryBar.hidden=false;

  function showConnection(){
    byId('startOffline').hidden=navigator.onLine;
  }
  window.addEventListener('online',showConnection);
  window.addEventListener('offline',showConnection);
  showConnection();

  function localize(){
    const control=byId('aqLocaleSelect')?.closest('.aq-lang-control');
    if(control&&control.parentElement!==language)language.append(control);
    for(const element of document.querySelectorAll('[data-start-label]')){
      element.textContent=translated(labels[element.dataset.startLabel]);
    }
    byId('startLocal').title=translated(labels.localHelp);
    query.placeholder=translated(labels.placeholder);
    showStorageUsage();render();
  }
  window.addEventListener('aq:language-change',localize);
  localize();
  readCategory();

  let zone;
  try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone;}catch{}
  const minutes=-new Date().getTimezoneOffset();
  const pad=n=>String(n).padStart(2,'0');
  const browserLabel={
    Edg:'Edge',EdgA:'Edge',EdgiOS:'Edge',OPR:'Opera',
    Firefox:'Firefox',FxiOS:'Firefox',CriOS:'Chrome',Chrome:'Chromium',Safari:'Safari',
  };
  const agent=navigator.userAgent.match(/\b(?:Edg|EdgA|EdgiOS|OPR|Firefox|FxiOS|CriOS)\//)
    ||navigator.userAgent.match(/\b(?:Chrome|Safari)\//);
  const browser=browserLabel[agent?.[0].slice(0,-1)];
  byId('homeTZ').textContent=zone||'—';
  byId('homeOffset').textContent=(minutes<0?'-':'+')+pad(Math.floor(Math.abs(minutes)/60))+':'+pad(Math.abs(minutes)%60);
  byId('homeLang').textContent=navigator.language||'—';
  byId('homeBrowser').textContent=browser||'—';
  function updateViewport(){
    const dimensions=window.innerWidth+'×'+window.innerHeight;
    byId('homeView').textContent=dimensions+' CSS px';
    summary.textContent=[zone,navigator.language,dimensions,browser].filter(Boolean).join(' · ');
    summary.title=summary.textContent;
  }
  window.addEventListener('resize',updateViewport,{passive:true});
  updateViewport();
})();
