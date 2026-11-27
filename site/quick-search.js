"use strict";
/* AVENQIR compact command palette; only built-in public feature names are indexed. */
(() => {
  const entries = [
    ['公开网址搜索','目录 搜索 分类 推荐 网站','directory.html'],
    ['Orbit Hub 邮箱协作','temporary email verification otp orbit hub 临时邮箱 本机提取验证码','orbit-bridge.html'],
    ['任务路径探索','按任务找网址 研究 材料 网站排错 隐私 图片 本地AI','directory.html#atlasFlowsTitle'],
    ['我的私人书签','收藏 网址 标签 待读 search bookmarks','bookmarks.html#library'],
    ['浏览器书签 HTML 互通','netscape chrome firefox 导入 导出 html 书签 迁移','bookmarks.html#transfer'],
    ['主题显示设置','护眼 浅色 暗色 跟随系统 外观 颜色','appearance.html'],
    ['添加书签','收藏 编辑 增加 网址','bookmarks.html#editor'],
    ['书签备份','书签 导出 导入 备份','bookmarks.html#transfer'],
    ['本地笔记','笔记 备忘录 文字 note','notes.html#pad'],
    ['文本差异比较','diff 对比 比较 修改 内容','notes.html#textCompare'],
    ['时间戳转换','unix 毫秒 秒 时间 日期 相对时间 timestamp','notes.html#timestamp'],
    ['笔记单独备份','笔记 json 备份','notes.html#notesBackup'],
    ['统一数据迁移','换手机 备份 恢复 导出 导入 书签 笔记 游戏','transfer.html'],
    ['专注计时器','番茄钟 倒计时 focus timer','daily.html#focus'],
    ['今天的三件小事','任务 清单 待办','daily.html#tasks'],
    ['随机决定','选择 抽签 随机','daily.html#decide'],
    ['小游戏存档备份','备份 游戏 存档 导出','daily.html#localBackup'],
    ['2048 游戏','游戏 合并 数字','fun.html#game2048'],
    ['记忆翻牌','游戏 卡片 配对','fun.html#memory'],
    ['泡泡解压','pop it 游戏','fun.html#pop'],
    ['舒缓呼吸','呼吸 减压 放松','fun.html#breathe'],
    ['涂鸦画板','画图 png 手绘','fun.html#sketch'],
    ['DNS 查询','dns 域名 解析 a aaaa mx txt','tools.html#dns'],
    ['文件 SHA-256','apk zip 文件 哈希 校验','tools.html#hash'],
    ['图片压缩','图片 png jpeg webp 尺寸','tools.html#image'],
    ['JSON 格式化','json 格式 校验 压缩','tools.html#json'],
    ['网址解析','url 结构 参数','tools.html#url'],
    ['编码解码','base64 utf8 url encode decode','tools.html#codec'],
    ['颜色换算','颜色 hex rgb hsl color','tools.html#color'],
    ['网站流量估算','容量 带宽 月流量','tools.html#traffic'],
    ['IP / 浏览器检查','ip ipv4 ipv6 时区 ua 指纹','check.html#network'],
    ['浏览器兼容测试','上传 下载 输入框 复制','check.html#tests'],
    ['DNS 快照对比','域名 dns 记录 变化','domains.html'],
    ['GitHub Releases','github apk zip 下载 直链','projects.html'],
    ['Android 日志分析','logcat anr crash 崩溃','logs.html'],
    ['网站健康检查','php api 状态 检测','health.html'],
    ['网站部署版本','部署 actions 更新 版本','deploy-status.html'],
    ['反馈和推荐网址','留言 联系 建议 推荐','feedback.php']
  ];
  const normalize = s => String(s).toLocaleLowerCase('zh-CN').normalize('NFKC').trim();
  const searchable = entries.map(([title,keywords,url]) => ({title,keywords,url,
    text:normalize(title+' '+keywords+' '+url)}));
  function find(query) {
    const terms=normalize(query).split(/\s+/).filter(Boolean).slice(0,7);
    const items=searchable.filter(x=>terms.every(term=>x.text.includes(term)));
    return items.sort((a,b)=>{
      const score=x=>terms.reduce((n,t)=>n+(normalize(x.title).includes(t)?5:1),0);
      return score(b)-score(a);
    }).slice(0,12);
  }
  const STORE='avenqir.quick-search.recent.v90';
  const SECRET_QUERY='avenqir.bookmarks.quick-query.v90';
  const PUBLIC_QUERY='avenqir.atlas.quick-query.v90';
  function readSession(key){try{return sessionStorage.getItem(key)}catch{return null}}
  function rememberAction(url){
    try{
      const arr=JSON.parse(sessionStorage.getItem(STORE)||'[]');
      const recent=Array.isArray(arr)?arr.filter(x=>typeof x==='string').slice(0,15):[];
      sessionStorage.setItem(STORE,JSON.stringify([url,...recent.filter(x=>x!==url)].slice(0,15)));
    }catch{}
  }
  function bookmarksFor(query){
    if(!query)return [];
    let items=[];
    try{const raw=JSON.parse(localStorage.getItem('avenqir_v6_bookmarks')||'[]');if(Array.isArray(raw))items=raw.slice(0,200);}catch{}
    const terms=normalize(query).split(/\s+/).filter(Boolean);
    return items.filter(x=>x&&typeof x.name==='string'&&typeof x.url==='string'&&terms.every(term=>
      normalize([x.name,x.category||'',x.note||'',x.url].join(' ')).includes(term)||
      (window.AVENQIR_ATLAS_FIND?.matches(term,[x.name,x.category||''])||false)
    )).slice(0,4).map(x=>({title:x.name,keywords:'私人书签 · 仅本机检索',url:'bookmarks.html#library',kind:'private',query:x.name}));
  }
  const L=(cn,en)=>rootLocale()?.startsWith('zh-')?cn:en;
 const rootLocale=()=>window.AVENQIR_I18N?.locale||'en';
 const EN_NAMES={"directory.html":"Public website search","directory.html#atlasFlowsTitle":"Guided tasks","bookmarks.html#library":"Private bookmarks","bookmarks.html#transfer":"Bookmark HTML backup","appearance.html":"Appearance settings","bookmarks.html#editor":"Add bookmarks","notes.html#pad":"Local notes","notes.html#textCompare":"Text comparison","notes.html#timestamp":"Unix time converter","notes.html#notesBackup":"Notes backup","transfer.html":"Data transfer","daily.html#focus":"Focus timer","daily.html#tasks":"Daily tasks","daily.html#decide":"Random choice","daily.html#localBackup":"Game backups","fun.html#game2048":"2048 game","fun.html#memory":"Memory game","fun.html#pop":"Pop bubble game","fun.html#breathe":"Breathing exercise","fun.html#sketch":"Drawing pad","tools.html#dns":"DNS lookup","tools.html#hash":"SHA-256 file check","tools.html#image":"Image compression","tools.html#json":"JSON formatter","tools.html#url":"URL parser","tools.html#codec":"Base64 and URL codecs","tools.html#color":"Color conversion","tools.html#traffic":"Traffic estimate","check.html#network":"IP and browser diagnostics","check.html#tests":"Compatibility tests","domains.html":"DNS changes","projects.html":"GitHub Releases","logs.html":"Android logs","health.html":"Website health","deploy-status.html":"Deployment status","feedback.php":"Feedback","orbit-bridge.html":"Orbit Hub × local helper"};
 const localizedTitle=item=>item.kind?item.title:(rootLocale().startsWith('zh-')?item.title:EN_NAMES[item.url]||item.title);
 const attach=()=>{
    const bar=document.querySelector('.head-inner');
    if(!bar || document.getElementById('aqQuickSearch'))return;
    const button=document.createElement('button');
    button.type='button';button.id='aqQuickSearch';button.className='aq-quick-search';
    button.setAttribute('aria-haspopup','dialog');
    button.setAttribute('aria-controls','aqCommandPalette');
    button.setAttribute('aria-label',L('打开本站功能搜索','Open feature search'));
    const icon=document.createElement('span');icon.className='aq-quick-search-icon';icon.setAttribute('aria-hidden','true');icon.textContent='⌕';
    const label=document.createElement('span');label.className='aq-quick-search-label';label.textContent=L('功能搜索','Search tools');
    const kbd=document.createElement('kbd');kbd.textContent='Ctrl K';
    button.append(icon,label,kbd);
    const nav=bar.querySelector('.menu-toggle');
    if(nav)bar.insertBefore(button,nav);else bar.append(button);
    const dialog=document.createElement('dialog');dialog.id='aqCommandPalette';dialog.className='aq-search-dialog';
    dialog.setAttribute('aria-labelledby','aqSearchTitle');
    const shell=document.createElement('div');shell.className='aq-cmd-shell';
    const heading=document.createElement('div');heading.className='aq-cmd-heading';
    const title=document.createElement('strong');title.id='aqSearchTitle';title.textContent=L('快速打开功能','Find tools and bookmarks');
    const close=document.createElement('button');close.type='button';close.className='aq-search-close';
    close.textContent=L('关闭','Close');close.setAttribute('aria-label',L('关闭功能搜索','Close feature search'));
    heading.append(title,close);
    const row=document.createElement('div');row.className='aq-cmd-input-row';
    const searchIcon=document.createElement('span');searchIcon.textContent='⌕';searchIcon.setAttribute('aria-hidden','true');
    const input=document.createElement('input');input.type='search';input.maxLength=80;
    input.autocomplete='off';input.placeholder=L('搜索功能名称，例如 DNS、笔记、书签','Search DNS, notes, bookmarks and tools');
    input.setAttribute('aria-label',L('输入要查找的功能','Search features'));input.id='aqSearchQuery';
    row.append(searchIcon,input);
    const results=document.createElement('div');results.className='aq-search-results';results.id='aqSearchResults';
    results.setAttribute('role','list');
    const hint=document.createElement('div');hint.className='aq-search-hint';
    const hintText=document.createElement('span');hintText.textContent=L('支持本机私人书签和公开网址目录搜索；不读取笔记、不上传私人书签。','Find local bookmarks and public sites. Private data is not uploaded.');
    const explore=document.createElement('a');explore.href='directory.html';explore.textContent=L('探索公开网址 ↗','Explore public sites ↗');
    hint.append(hintText,explore);
    shell.append(heading,row,results,hint);dialog.append(shell);document.body.append(dialog);
    window.addEventListener('aq:language-change',()=>{
      button.setAttribute('aria-label',L('打开本站功能搜索','Open feature search'));
      label.textContent=L('功能搜索','Search tools');
      title.textContent=L('快速打开功能','Find tools and bookmarks');
      close.textContent=L('关闭','Close');
      input.placeholder=L('搜索功能名称，例如 DNS、笔记、书签','Search DNS, notes, bookmarks and tools');
      hintText.textContent=L('支持本机私人书签和公开网址目录搜索；不读取笔记、不上传私人书签。','Find local bookmarks and public sites. Private data is not uploaded.');
      explore.textContent=L('探索公开网址 ↗','Explore public sites ↗');
      if(dialog.open)update();
    });
    const update=()=>{
      const query=input.value.trim();
      let found=find(input.value),recents=[];
      try{const parsed=JSON.parse(readSession(STORE)||'[]');if(Array.isArray(parsed))recents=parsed;}catch{}
      found.sort((a,b)=>{
        const ai=recents.indexOf(a.url),bi=recents.indexOf(b.url);
        return (ai<0?10000:ai)-(bi<0?10000:bi);
      });
      const local=bookmarksFor(query);
      const shortcuts=query?[{title:L('在公开网址目录搜索：','Search public directory: ')+query.slice(0,50),keywords:'local directory search',url:'directory.html#atlasResults',kind:'public',query}]:[];
      found=[...shortcuts,...local,...found.slice(0,Math.max(0,11-local.length))].slice(0,12);
      results.replaceChildren();
      for(const item of found){
        const a=document.createElement('a');a.className='aq-search-result';
        a.href=item.url;a.setAttribute('role','listitem');
        const title=document.createElement('strong');title.textContent=localizedTitle(item);
        const url=document.createElement('small');url.textContent=item.kind==='private'?L('私人书签 · 当前浏览器','Private bookmark · on this device'):item.kind==='public'?L('公开目录 · 本地搜索','Public directory · local search'):item.url;
        const arrow=document.createElement('span');arrow.className='aq-result-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
        const body=document.createElement('span');body.className='aq-result-body';body.append(title,url);
        a.append(body,arrow);
        a.addEventListener('click',()=>{
          try{
            if(item.kind==='private')sessionStorage.setItem(SECRET_QUERY,item.query);
            else if(item.kind==='public')sessionStorage.setItem(PUBLIC_QUERY,item.query);
            else rememberAction(item.url);
          }catch{}
        });
        results.append(a);
      }
      if(!found.length){
        const p=document.createElement('p');p.className='aq-cmd-empty';p.textContent=L('没有对应的本站功能。可以试试公开网址搜索。','No matching feature. Try the website directory.');results.append(p);
      }
    };
    function hide(){if(dialog.open&&typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');button.setAttribute('aria-expanded','false');}
    function open(){
      if(dialog.open){input.focus();return;}
      input.value='';update();
      if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
      button.setAttribute('aria-expanded','true');input.focus();
    }
    button.addEventListener('click',open);close.addEventListener('click',hide);
    input.addEventListener('input',update);
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){const first=results.querySelector('a');if(first){e.preventDefault();first.click();}}
    });
    dialog.addEventListener('click',e=>{if(e.target===dialog)hide();});
    dialog.addEventListener('close',()=>{
      button.setAttribute('aria-expanded','false');
      if(document.body.dataset.startDensity)document.getElementById('startSettingsToggle')?.focus();
    });
    document.addEventListener('keydown',e=>{
      if(e.defaultPrevented||(document.body.dataset.startDensity&&!dialog.open))return;
      const focused=document.activeElement?.tagName||'';
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}
      else if(e.key==='/'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(focused)&&!document.activeElement?.isContentEditable&&!document.body.classList.contains('search-body')){
        e.preventDefault();open();
      }
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
  if(typeof module==='object'&&module.exports)module.exports={find};
})();
