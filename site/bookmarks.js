"use strict";
(()=>{
const $=id=>document.getElementById(id),KEY='avenqir_v6_bookmarks';
const DEFAULT_LINKS=[{"id":"def-00","name":"GitHub","url":"https://github.com/","category":"开发","note":"代码托管与公开项目","fav":true,"todo":false,"custom":false,"at":1730000000000},{"id":"def-01","name":"GitHub Releases","url":"https://github.com/","category":"开发","note":"进入对应仓库后查看 Releases","fav":false,"todo":false,"custom":false,"at":1730000000001},{"id":"def-02","name":"Cloudflare 控制台","url":"https://dash.cloudflare.com/","category":"项目","note":"DNS、Workers、Pages 管理","fav":true,"todo":false,"custom":false,"at":1730000000002},{"id":"def-03","name":"Cloudflare 文档","url":"https://developers.cloudflare.com/","category":"开发","note":"Workers、DNS、邮件等官方文档","fav":false,"todo":false,"custom":false,"at":1730000000003},{"id":"def-04","name":"Cloudflare Status","url":"https://www.cloudflarestatus.com/","category":"网络","note":"Cloudflare 服务状态","fav":false,"todo":false,"custom":false,"at":1730000000004},{"id":"def-05","name":"Vercel","url":"https://vercel.com/dashboard","category":"项目","note":"网站项目控制台","fav":false,"todo":false,"custom":false,"at":1730000000005},{"id":"def-06","name":"PFS 官网","url":"https://publicfreesuffix.org/","category":"项目","note":"免费域名服务与相关公告","fav":false,"todo":false,"custom":false,"at":1730000000006},{"id":"def-07","name":"PFS 域名申请","url":"https://publicfreesuffix.org/apply/","category":"项目","note":"申请与管理 PFS 域名","fav":false,"todo":false,"custom":false,"at":1730000000007},{"id":"def-08","name":"BrowserLeaks","url":"https://browserleaks.com/","category":"网络","note":"浏览器环境和 WebRTC 检测","fav":true,"todo":false,"custom":false,"at":1730000000008},{"id":"def-09","name":"IP.net.coffee","url":"https://ip.net.coffee/","category":"网络","note":"第三方 IP 信息展示（非本站 API）","fav":false,"todo":false,"custom":false,"at":1730000000009},{"id":"def-10","name":"Cloudflare Radar","url":"https://radar.cloudflare.com/","category":"网络","note":"网络趋势与安全研究","fav":false,"todo":false,"custom":false,"at":1730000000010},{"id":"def-11","name":"Google DNS","url":"https://dns.google/","category":"网络","note":"DNS over HTTPS 查询入口","fav":false,"todo":false,"custom":false,"at":1730000000011},{"id":"def-12","name":"DNSChecker","url":"https://dnschecker.org/","category":"网络","note":"全球 DNS 传播查询","fav":false,"todo":false,"custom":false,"at":1730000000012},{"id":"def-13","name":"SSL Labs","url":"https://www.ssllabs.com/ssltest/","category":"网络","note":"HTTPS 服务配置检测","fav":false,"todo":false,"custom":false,"at":1730000000013},{"id":"def-14","name":"MDN Web Docs","url":"https://developer.mozilla.org/zh-CN/","category":"开发","note":"Web API、JavaScript、CSS","fav":true,"todo":false,"custom":false,"at":1730000000014},{"id":"def-15","name":"Can I use","url":"https://caniuse.com/","category":"开发","note":"浏览器功能兼容性表","fav":false,"todo":false,"custom":false,"at":1730000000015},{"id":"def-16","name":"regex101","url":"https://regex101.com/","category":"开发","note":"正则表达式调试","fav":false,"todo":false,"custom":false,"at":1730000000016},{"id":"def-17","name":"GitHub API Docs","url":"https://docs.github.com/en/rest","category":"开发","note":"官方 REST API 文档","fav":false,"todo":false,"custom":false,"at":1730000000017},{"id":"def-18","name":"中国研究生招生信息网","url":"https://yz.chsi.com.cn/","category":"学习","note":"研招网，招考公告和网报入口","fav":true,"todo":false,"custom":false,"at":1730000000018},{"id":"def-19","name":"东南大学","url":"https://www.seu.edu.cn/","category":"学习","note":"学校官方网站","fav":false,"todo":false,"custom":false,"at":1730000000019},{"id":"def-20","name":"浙江大学","url":"https://www.zju.edu.cn/","category":"学习","note":"学校官方网站","fav":false,"todo":false,"custom":false,"at":1730000000020},{"id":"def-21","name":"苏州大学","url":"https://www.suda.edu.cn/","category":"学习","note":"学校官方网站","fav":false,"todo":false,"custom":false,"at":1730000000021},{"id":"def-22","name":"Cambridge Dictionary","url":"https://dictionary.cambridge.org/","category":"学习","note":"英英词典、例句和发音","fav":false,"todo":false,"custom":false,"at":1730000000022},{"id":"def-23","name":"The Guardian","url":"https://www.theguardian.com/","category":"学习","note":"英文新闻与阅读","fav":false,"todo":false,"custom":false,"at":1730000000023},{"id":"def-24","name":"arXiv","url":"https://arxiv.org/","category":"学习","note":"开放学术预印本","fav":false,"todo":false,"custom":false,"at":1730000000024},{"id":"def-25","name":"Google Scholar","url":"https://scholar.google.com/","category":"学习","note":"学术文献搜索","fav":false,"todo":false,"custom":false,"at":1730000000025},{"id":"def-26","name":"NIST WebBook","url":"https://webbook.nist.gov/chemistry/","category":"学习","note":"化学物性参考数据","fav":false,"todo":false,"custom":false,"at":1730000000026},{"id":"def-27","name":"Wikipedia","url":"https://www.wikipedia.org/","category":"实用工具","note":"通用百科入口","fav":false,"todo":false,"custom":false,"at":1730000000027},{"id":"def-28","name":"Internet Archive","url":"https://archive.org/","category":"实用工具","note":"互联网档案与公开资料","fav":false,"todo":false,"custom":false,"at":1730000000028},{"id":"def-29","name":"itch.io","url":"https://itch.io/games/free","category":"休闲","note":"独立免费游戏目录","fav":false,"todo":false,"custom":false,"at":1730000000029}];
const safeText=(v,n)=>String(v??'').trim().slice(0,n);
const safeUrl=raw=>{try{const u=new URL(String(raw).trim());if(!['https:','http:'].includes(u.protocol)||u.username||u.password||!u.hostname||/\s/.test(u.hostname))return null;return u.href;}catch{return null;}};
const newId=()=>{try{return crypto.randomUUID()}catch{return 'b-'+Date.now()+'-'+Math.random().toString(36).slice(2)}};
function clean(x){if(!x||typeof x!=='object'||Array.isArray(x))return null;const url=safeUrl(x.url);const name=safeText(x.name,80),category=safeText(x.category,32)||'其他';if(!url||!name)return null;return {id:safeText(x.id,80)||newId(),name,url,category,note:safeText(x.note,250),fav:!!x.fav,todo:!!x.todo,custom:!!x.custom,at:Number.isFinite(x.at)&&x.at>0?x.at:Date.now()};}
let links=[];let stored=null;try{stored=JSON.parse(localStorage.getItem(KEY))}catch{}
if(Array.isArray(stored)&&stored.length<=250){links=stored.map(clean).filter(Boolean);if(!links.length)links=DEFAULT_LINKS.map(clean)}else links=DEFAULT_LINKS.map(clean);
const status=s=>{$('bookmarksStatus').textContent=s};
function persist(){try{localStorage.setItem(KEY,JSON.stringify(links));return true}catch{status('无法写入浏览器存储。请检查隐私模式或剩余空间。');return false}}
if(!stored)persist();
const make=(tag,className,text)=>{const x=document.createElement(tag);if(className)x.className=className;if(text!==undefined)x.textContent=text;return x;};
const sortOptions=(a,b)=>a.localeCompare(b,'zh-CN');
function categories(){const cat=$('filterCategory'),selected=cat.value;const keys=[...new Set(links.map(x=>x.category))].sort(sortOptions);cat.replaceChildren(new Option('全部分类',''));keys.forEach(x=>cat.add(new Option(x,x)));cat.value=keys.includes(selected)?selected:'';
const chips=$('catChips');chips.replaceChildren();['全部',...keys].forEach((x,i)=>{const b=make('button','btn ghost mini-btn'+((i===0&&!cat.value)||(cat.value===x)?' selected':''),x);b.type='button';b.addEventListener('click',()=>{cat.value=i===0?'':x;render()});chips.append(b)});
}
function render(){categories();const q=$('filterLinks').value.trim().toLowerCase(),cat=$('filterCategory').value,state=$('filterState').value,sort=$('sortLinks').value;
let found=links.filter(x=>(!cat||x.category===cat)&&(state==='all'||state==='fav'&&x.fav||state==='todo'&&x.todo||state==='custom'&&x.custom)&&(!q||[x.name,x.url,x.category,x.note].some(v=>v.toLowerCase().includes(q))));
found.sort((a,b)=>sort==='name'?sortOptions(a.name,b.name):sort==='recent'?b.at-a.at:((b.fav?1:0)-(a.fav?1:0)||sortOptions(a.name,b.name)));
const root=$('bookmarkGrid');root.replaceChildren();for(const x of found){const card=make('article','link-card');const meta=make('div','link-card-meta');const category=make('span','chip',x.category),flag=make('span','link-host');flag.textContent=(()=>{try{return new URL(x.url).hostname}catch{return ''}})();meta.append(category,flag);card.append(meta);
const head=make('div','flexend');const a=make('a','bookmark-title',x.name+' ↗');a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';head.append(a);card.append(head);
const desc=make('p','link-description',x.note||'打开网址');card.append(desc);
const actions=make('div','link-actions');const buttons=[['★',x.fav?'取消收藏':'收藏',()=>{x.fav=!x.fav;persist();render()}],['📖',x.todo?'标记已读':'待读',()=>{x.todo=!x.todo;persist();render()}],['✎','编辑',()=>edit(x)],['×','删除',()=>{if(confirm('确定删除「'+x.name+'」？')){links=links.filter(item=>item.id!==x.id);persist();render();status('已删除：'+x.name)}}]];
for(const [symbol,title,handler] of buttons){const b=make('button','bookmark-action'+(title==='取消收藏'?' marked':''),symbol+' '+title);b.type='button';b.title=title;b.setAttribute('aria-label',title+x.name);b.addEventListener('click',handler);actions.append(b)}card.append(actions);root.append(card)}
if(!found.length)root.append(make('div','empty-state','没有符合条件的网址。可以修改筛选或添加自己的网址。'));
$('linkCount').textContent=found.length+' / '+links.length+' 条';
}
function edit(x){$('editId').value=x.id;$('linkName').value=x.name;$('linkUrl').value=x.url;$('linkCategory').value=x.category;$('linkNote').value=x.note;$('saveLink').textContent='保存修改';if(window.avenqirOpenModule)window.avenqirOpenModule('editor',true);document.getElementById('editor').scrollIntoView({behavior:'smooth',block:'start'});$('linkName').focus()}
function clearForm(){$('linkForm').reset();$('editId').value='';$('saveLink').textContent='保存网址'}
$('cancelEdit').addEventListener('click',clearForm);
$('linkForm').addEventListener('submit',e=>{e.preventDefault();const url=safeUrl($('linkUrl').value),name=safeText($('linkName').value,80),category=safeText($('linkCategory').value,32),note=safeText($('linkNote').value,250),id=$('editId').value;if(!url||!name||!category){status('名称、分类、网址不能为空；网址必须以 http 或 https 开头。');return}
if(links.some(x=>x.url===url&&x.id!==id)){status('这个网址已经收藏过了。');return}
if(!id&&links.length>=200){status('收藏上限 200 条，请先删除旧网址。');return}
if(id){const x=links.find(x=>x.id===id);if(!x){status('原条目已不存在。');return}Object.assign(x,{name,url,category,note,custom:true,at:Date.now()});status('已更新：'+name)}else{links.unshift({id:newId(),name,url,category,note,custom:true,fav:false,todo:false,at:Date.now()});status('已添加：'+name)}
persist();clearForm();render();});
['filterLinks','filterCategory','filterState','sortLinks'].forEach(id=>$(id).addEventListener(id==='filterLinks'?'input':'change',render));
$('searchForm').addEventListener('submit',e=>{e.preventDefault();const q=$('webQuery').value.trim();if(!q)return;const urls={duck:'https://duckduckgo.com/?q=',google:'https://www.google.com/search?q=',bing:'https://www.bing.com/search?q=',github:'https://github.com/search?q=',mdn:'https://developer.mozilla.org/en-US/search?q=',scholar:'https://scholar.google.com/scholar?q='};const url=urls[$('searchSource').value]+encodeURIComponent(q);const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';document.body.append(a);a.click();a.remove();$('searchHint').textContent='已向所选搜索服务打开查询。如果被拦截，请允许新标签页。';});
function download(v,name){const b=new Blob([v],{type:'application/json;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
$('exportBookmarks').addEventListener('click',()=>{download(JSON.stringify({format:'avenqir-bookmarks-v6',date:new Date().toISOString(),links},null,2),'avenqir-links-'+new Date().toISOString().slice(0,10)+'.json');status('已生成全部网址备份，建议存到手机或个人云盘。')});
$('importBookmarks').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1024*1024)throw Error('文件超过 1MB');const v=JSON.parse(await file.text());if(v?.format!=='avenqir-bookmarks-v6'||!Array.isArray(v.links)||v.links.length>200)throw Error('格式错误或网址数量超出上限');const arr=v.links.map(clean);if(arr.some(x=>!x)||new Set(arr.map(x=>x.id)).size!==arr.length)throw Error('含有无效网址或重复 ID');if(!confirm('导入将覆盖当前所有网址，确定继续？'))return;links=arr;persist();render();status('导入成功，共 '+arr.length+' 条网址。')}catch(ex){status('导入失败：'+String(ex.message).slice(0,120))}finally{e.target.value=''}});
$('resetBookmarks').addEventListener('click',()=>{if(!confirm('将清空自定义网址和修改，恢复全部默认条目。建议先导出，确定继续？'))return;links=DEFAULT_LINKS.map(clean);persist();clearForm();render();status('已恢复默认网址列表。')});

/* Netscape Bookmark HTML transfer. Existing JSON backup remains unchanged. */
const net=window.AVENQIR_NETSCAPE;
let pendingNetscape=null;
function describeNetscape(){
  const preview=$('netscapePreview'),button=$('confirmNetscape');
  if(!pendingNetscape||!net){button.disabled=true;return;}
  const replace=$('netscapeMode').value==='replace';
  const used=new Set(links.map(x=>x.url));
  const additions=pendingNetscape.records.filter(x=>!used.has(x.url));
  const total=replace?pendingNetscape.records.length:links.length+additions.length;
  const over=total>net.LIMIT;
  preview.textContent='文件中 '+pendingNetscape.total+' 条，'+pendingNetscape.records.length+
    ' 条有效不重复，'+pendingNetscape.skipped+' 条无效，'+pendingNetscape.duplicates+
    ' 条文件内重复。'+(replace?
      ' 将替换当前 '+links.length+' 条书签，导入 '+total+' 条。':
      ' 将保留现有 '+links.length+' 条，新增 '+additions.length+' 条；已有相同网址不重复导入。')+
    (over?' 超过 200 条上限，请先整理当前书签，或更换导入方式。':'');
  button.disabled=over||(!replace&&additions.length===0);
}
$('netscapeMode').addEventListener('change',describeNetscape);
$('importNetscape').addEventListener('change',async e=>{
  pendingNetscape=null;$('confirmNetscape').disabled=true;
  const file=e.target.files?.[0];if(!file)return;
  try {
    if(!net)throw Error('书签格式模块未加载');
    if(file.size>net.MAX_BYTES)throw Error('文件超过 1 MB');
    const text=await file.text();
    pendingNetscape=net.parse(text);
    describeNetscape();
  }catch(error){$('netscapePreview').textContent='读取失败：'+String(error.message||error).slice(0,180);}
  finally{e.target.value='';}
});
$('cancelNetscape').addEventListener('click',()=>{
  pendingNetscape=null;$('confirmNetscape').disabled=true;
  $('netscapePreview').textContent='已清除预览，当前书签没有变化。';
});
$('confirmNetscape').addEventListener('click',()=>{
  if(!net||!pendingNetscape)return;
  const mode=$('netscapeMode').value,replace=mode==='replace';
  const used=new Set(links.map(x=>x.url));
  const additions=pendingNetscape.records.filter(x=>!used.has(x.url));
  const selected=replace?pendingNetscape.records:additions;
  const next=replace?selected.map(x=>({...x,id:newId()})):
    links.concat(selected.map(x=>({...x,id:newId()})));
  if(next.length>net.LIMIT||(!replace&&!selected.length)){
    describeNetscape();return;
  }
  const question=replace?
    '确定替换现有全部 '+links.length+' 条书签？原有收藏/待读状态将丢失，建议先导出 JSON。':
    '确定合并新增 '+selected.length+' 条网址？现有书签及收藏标记会保留。';
  if(!confirm(question))return;
  try {
    // Write before swapping in-memory data, so failed quotas never present false success.
    localStorage.setItem(KEY,JSON.stringify(next));
    links=next;
    pendingNetscape=null;
    $('confirmNetscape').disabled=true;
    $('netscapePreview').textContent='导入成功，现有 '+links.length+' 条书签。';
    render();status('Netscape HTML 导入成功。');
  }catch(err){$('netscapePreview').textContent='导入未写入：'+String(err.message||err).slice(0,150);}
});
$('exportNetscape').addEventListener('click',()=>{
  try {
    if(!net)throw Error('书签格式模块未加载');
    const output=net.exportHTML(links);
    const url=URL.createObjectURL(new Blob([output],{type:'text/html;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;
    a.download='avenqir-bookmarks-'+new Date().toISOString().slice(0,10)+'.html';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    $('netscapePreview').textContent='已生成标准 HTML 书签文件。';
  }catch(e){$('netscapePreview').textContent='导出失败：'+String(e.message||e).slice(0,160);}
});
render();
})();