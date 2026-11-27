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
  const pageSize=8;
  const densityKey='avenqir.start.density';
  const cards=Array.from(document.querySelectorAll('.start-card'),element=>({
    element,
    category:element.dataset.startCategory,
    keywords:element.dataset.keywords,
    fields:Array.from(element.querySelectorAll('[data-start-en]'),field=>({
      element:field,zh:field.textContent,en:field.dataset.startEn,
    })),
  }));
  const categoryNames={
    all:['全部','All'],discover:['发现','Discover'],local:['本地数据','Local data'],
    tools:['实用工具','Tools'],daily:['日常与休闲','Daily & play'],
    network:['网络自查','Network'],dev:['开发者','Developer'],contact:['留言','Feedback'],
  };
  const labels={
    tagline:['本地优先的工具起始页','A local-first start page'],
    searchLabel:['搜索工具','Find a tool'],directory:['搜公开网址','Search websites'],
    placeholder:['搜工具，或去目录查网址','Find a tool, or search the website directory'],
    clear:['清空搜索','Clear search'],tools:['工具入口','Tools'],
    empty:['没有匹配的工具入口。','No matching tools.'],
    local:['本地存储 · 不同步 · 可导出','Stored locally · No sync · Export available'],
    settings:['设置','Settings'],close:['关闭','Close'],density:['显示密度','Display density'],
    comfortable:['舒适','Comfortable'],compact:['紧凑','Compact'],
    theme:['主题与护眼模式','Theme and reading mode'],
    commandSearch:['站内快捷搜索','Quick tool and bookmark search'],
    backup:['导入与导出','Import and export'],manage:['管理本地书签数据','Manage local bookmarks'],
    privacy:['隐私和本地备份','Privacy and local backups'],policy:['隐私说明','Privacy policy'],
    privacyText:['书签、笔记和游戏存档保存在当前浏览器。查询公网 IP 会使用外部服务，请在网络检测页按需操作。','Bookmarks, notes and game saves stay in this browser. Public IP lookups use an external service when requested from the network page.'],
  };
  const chinese=()=>String(window.AVENQIR_I18N?.locale||document.documentElement.lang).startsWith('zh');
  const t=(zh,en)=>chinese()?zh:en;
  const translated=pair=>t(...pair);
  const categories=new Map(Object.keys(categoryNames).map(key=>{
    const button=document.createElement('button');
    const label=document.createElement('span');
    const total=document.createElement('span');
    button.type='button';
    button.className='start-control start-category';
    button.dataset.category=key;
    total.className='start-category-count';
    button.append(label,total);
    categoryBar.append(button);
    return [key,{button,label,total}];
  }));
  let selected='all';
  let expanded=false;

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
    const totals=new Map();
    const matched=cards.filter(card=>{
      const index=[card.keywords,...card.fields.flatMap(field=>[field.zh,field.en])].join(' ').toLowerCase();
      if(!terms.every(term=>index.includes(term)))return false;
      totals.set(card.category,(totals.get(card.category)||0)+1);
      return true;
    });
    if(selected!=='all'&&!totals.has(selected))selected='all';
    for(const [key,entry] of categories){
      const total=key==='all'?matched.length:(totals.get(key)||0);
      entry.button.hidden=key!=='all'&&total===0;
      entry.button.setAttribute('aria-pressed',String(selected===key));
      entry.label.textContent=translated(categoryNames[key]);
      entry.total.textContent=String(total);
    }
    const visible=matched.filter(card=>selected==='all'||card.category===selected);
    const page=new Set(expanded?visible:visible.slice(0,pageSize));
    for(const card of cards){
      card.element.hidden=!page.has(card);
      for(const field of card.fields)highlight(field.element,t(field.zh,field.en),pattern);
    }
    count.textContent=t(`匹配 ${visible.length} 个工具`,`${visible.length} matching tools`);
    empty.hidden=visible.length!==0;
    clear.hidden=query.value==='';
    more.hidden=visible.length<=pageSize;
    more.textContent=expanded?t('收起','Show fewer'):t(`查看全部 ${visible.length} 项`,`Show all ${visible.length} tools`);
    more.setAttribute('aria-expanded',String(expanded));
    updateScrollHint();
  }

  function updateScrollHint(){
    categoryBar.classList.toggle('has-more',categoryBar.scrollLeft+categoryBar.clientWidth<categoryBar.scrollWidth-2);
  }

  function resetSearch(){
    query.value='';
    expanded=false;
    render();
    query.focus();
  }
  for(const [key,entry] of categories){
    entry.button.addEventListener('click',()=>{
      selected=key;
      expanded=false;
      render();
    });
  }
  more.addEventListener('click',()=>{
    expanded=!expanded;
    render();
  });
  query.addEventListener('input',()=>{expanded=false;render();});
  clear.addEventListener('click',resetSearch);
  byId('startEmptyClear').addEventListener('click',resetSearch);
  categoryBar.addEventListener('scroll',updateScrollHint,{passive:true});
  window.addEventListener('resize',updateScrollHint,{passive:true});
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing||document.querySelector('dialog[open]'))return;
    const typing=event.target instanceof Element&&event.target.closest('input, textarea, select, [contenteditable="true"]');
    const slash=event.key==='/'&&!typing&&!event.altKey&&!event.ctrlKey&&!event.metaKey;
    const command=(event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='k';
    if(slash||command){event.preventDefault();query.focus();}
  });

  const densityOptions=document.querySelectorAll('input[name="startDensity"]');
  function setDensity(value){
    const density=value==='compact'?'compact':'comfortable';
    document.body.dataset.startDensity=density;
    for(const input of densityOptions)input.checked=input.value===density;
  }
  try{setDensity(localStorage.getItem(densityKey));}catch{setDensity('comfortable');}
  for(const input of densityOptions){
    input.addEventListener('change',()=>{
      setDensity(input.value);
      try{localStorage.setItem(densityKey,input.value);}catch{}
    });
  }
  settingsToggle.addEventListener('click',()=>settings.showModal());
  settings.addEventListener('close',()=>settingsToggle.focus());
  byId('startCommandSearch').addEventListener('click',()=>{
    const shortcut=byId('aqQuickSearch');
    if(!shortcut)return;
    settings.addEventListener('close',()=>shortcut.click(),{once:true});
    settings.close();
  });
  settingsToggle.hidden=false;
  categoryBar.hidden=false;

  function localize(){
    for(const element of document.querySelectorAll('[data-start-label]')){
      element.textContent=translated(labels[element.dataset.startLabel]);
    }
    query.placeholder=translated(labels.placeholder);
    render();
  }
  window.addEventListener('aq:language-change',localize);
  localize();

  try{
    const minutes=-new Date().getTimezoneOffset();
    const pad=n=>String(n).padStart(2,'0');
    byId('homeTZ').textContent=Intl.DateTimeFormat().resolvedOptions().timeZone||'—';
    byId('homeOffset').textContent='UTC'+(minutes<0?'-':'+')+pad(Math.floor(Math.abs(minutes)/60))+':'+pad(Math.abs(minutes)%60);
    byId('homeLang').textContent=navigator.language||'—';
    const updateViewport=()=>{byId('homeView').textContent=document.documentElement.clientWidth+' × '+window.innerHeight+' CSS px';};
    window.addEventListener('resize',updateViewport,{passive:true});
    updateViewport();
  }catch{byId('quickStatus').textContent=t('部分字段不可用','Some fields unavailable');}
})();
