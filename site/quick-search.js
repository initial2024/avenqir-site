"use strict";
/* AVENQIR compact command palette; only built-in public feature names are indexed. */
(() => {
  const entries = [
    ['公开网址搜索','目录 搜索 分类 推荐 网站','directory.html'],
    ['我的私人书签','收藏 网址 标签 待读 search bookmarks','bookmarks.html#library'],
    ['添加书签','收藏 编辑 增加 网址','bookmarks.html#editor'],
    ['书签备份','书签 导出 导入 备份','bookmarks.html#transfer'],
    ['本地笔记','笔记 备忘录 文字 note','notes.html#pad'],
    ['文本差异比较','diff 对比 比较 修改 内容','notes.html#textCompare'],
    ['时间戳转换','unix 毫秒 秒 时间 日期 相对时间 timestamp','notes.html#timestamp'],
    ['笔记单独备份','笔记 json 备份','notes.html#notesBackup'],
    ['统一数据迁移','换手机 备份 恢复 导出 导入 书签 笔记 游戏','backup.html'],
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
  const attach=()=>{
    const bar=document.querySelector('.head-inner');
    if(!bar || document.getElementById('aqQuickSearch'))return;
    const button=document.createElement('button');
    button.type='button';button.id='aqQuickSearch';button.className='aq-quick-search';
    button.setAttribute('aria-haspopup','dialog');
    button.setAttribute('aria-label','快速搜索 AVENQIR 网站功能');
    button.textContent='⌕ 搜索功能';
    const small=document.createElement('kbd');small.textContent='Ctrl K';button.append(small);
    const nav=bar.querySelector('.menu-toggle');
    if(nav)bar.insertBefore(button,nav);else bar.append(button);
    const dialog=document.createElement('dialog');dialog.className='aq-search-dialog';
    dialog.setAttribute('aria-label','快速搜索网站功能');
    const form=document.createElement('form');form.method='dialog';form.className='aq-search-top';
    const input=document.createElement('input');input.type='search';input.maxLength=80;
    input.autocomplete='off';input.placeholder='搜索 DNS、APK、笔记、2048…';
    input.setAttribute('aria-label','输入要查找的功能');input.id='aqSearchQuery';
    const close=document.createElement('button');close.className='aq-search-close';
    close.textContent='关闭';close.type='submit';form.append(input,close);
    const results=document.createElement('div');results.className='aq-search-results';results.id='aqSearchResults';
    const hint=document.createElement('p');hint.className='aq-search-hint';
    hint.textContent='只搜索本站功能，不读取你的笔记、书签或私人数据。';
    dialog.append(form,results,hint);document.body.append(dialog);
    const update=()=>{
      const found=find(input.value);results.replaceChildren();
      for(const item of found){
        const a=document.createElement('a');a.className='aq-search-result';
        a.href=item.url;const title=document.createElement('strong');title.textContent=item.title;
        const url=document.createElement('small');url.textContent=item.url;a.append(title,url);
        results.append(a);
      }
      if(!found.length){const p=document.createElement('p');p.className='hint';
        p.textContent='没有找到相应功能。可尝试较短关键词。';results.append(p);}
    };
    const open=()=>{
      if(dialog.open){input.focus();return;}
      input.value='';update();
      if(typeof dialog.showModal==='function')dialog.showModal();
      else dialog.setAttribute('open','');
      input.focus();
    };
    button.addEventListener('click',open);
    input.addEventListener('input',update);
    dialog.addEventListener('click',e=>{
      if(e.target===dialog){dialog.close?.();if(!dialog.close)dialog.removeAttribute('open');}
    });
    document.addEventListener('keydown',e=>{
      const focused=document.activeElement?.tagName||'';
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        e.preventDefault();open();
      }else if(e.key==='/'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(focused)&&!document.activeElement?.isContentEditable){
        e.preventDefault();open();
      }
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
  if(typeof module==='object'&&module.exports)module.exports={find};
})();
