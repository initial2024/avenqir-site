"use strict";
(()=>{
  const model=window.AVENQIR_RECOMMENDATIONS;
  const panel=document.querySelector('[data-rec-view]');
  if(!model||!panel)return;

  const full=panel.dataset.recView==='full';
  const LOCAL='avenqir.recommendations.history.v1';
  const SHARE='avenqir.recommendations.share.v1';
  const TOKEN='avenqir.recommendations.token.v1';
  const endpoint='recommendations-api.php';
  const trend=panel.querySelector('[data-rec-trend]');
  const status=panel.querySelector('[data-rec-status]');
  const sort=panel.querySelector('#recSort');
  const windowSelect=panel.querySelector('#recWindow');
  const list=panel.querySelector('#recCards');
  const share=panel.querySelector('#recShare');
  const local=panel.querySelector('#recLocal');
  const revoke=panel.querySelector('#recRevoke');
  let rows=[];
  let indexes=null;
  let stats=null;
  let fetchVersion=0;
  const pending=new Set();
  const t=(zh,en)=>(window.AVENQIR_I18N?.locale||document.documentElement.lang).startsWith('zh')?zh:en;
  const name=item=>t(...item.title);
  const english={
    home:'Start page',directory:'Web directory',theme:'Appearance',page:'Tools and ratings',
    period:'Window',week:'Last 7 days',month:'Last 30 days',allTime:'Last 90 days',
    privacySettings:'Participation settings',local:'Remember activity on this device',
    share:'Participate in public trends and ratings',
    sharingCopy:'When enabled, opening a listed tool or submitting a rating sends its public ID, stars if provided, and a random browser identifier to AVENQIR. The public site displays aggregates. Bookmarks, searches and notes stay on this device.',
    clearLocal:'Clear local activity and ratings',withdraw:'Withdraw public ratings and turn off participation',
    privacy:'Privacy policy',list:'Tools and websites',sort:'Sort',recommended:'Recommendation',
    rating:'Highest rated',popular:'Most opened',name:'Name A–Z',confirm:'Confirm',
    cancel:'Cancel',apply:'Confirm',open:'Tools and ratings',
  };
  const labels=[...document.querySelectorAll('[data-rec-label]')].map(node=>[node,node.textContent]);
  function localize(){for(const [node,original] of labels)node.textContent=t(original,english[node.dataset.recLabel]);}
  const say=message=>{status.textContent=message;};
  function read(key){
    try{return localStorage.getItem(key);}
    catch{return null;}
  }
  function write(key,value){
    try{localStorage.setItem(key,value);return true;}
    catch{say(t('当前浏览器无法保存本地数据。','This browser could not save local data.'));return false;}
  }
  function remove(key){
    try{localStorage.removeItem(key);return true;}
    catch{say(t('当前浏览器无法清除本地数据。','This browser could not clear local data.'));return false;}
  }
  function getLocal(){
    try{
      const raw=read(model.KEY);
      if(!raw)return model.empty();
      const value=model.clean(JSON.parse(raw));
      const normalized=JSON.stringify(value);
      if(normalized!==raw)write(model.KEY,normalized);
      return value;
    }
    catch{return model.empty();}
  }
  function token(){
    const existing=read(TOKEN);
    if(/^[a-f0-9]{64}$/.test(existing||''))return existing;
    const next=[...crypto.getRandomValues(new Uint8Array(32))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
    return write(TOKEN,next)?next:null;
  }
  function element(tag,label){
    const node=document.createElement(tag);
    if(label)node.textContent=label;
    return node;
  }
  function destination(item){
    if(item.kind==='tool')return /^[a-z-]+\.html(?:#[a-zA-Z0-9-]+)?$/.test(item.url)?item.url:null;
    if(item.kind!=='website')return null;
    const gate=window.AVENQIR_LINK_GATE;
    const safety=window.AVENQIR_ATLAS_SAFETY;
    if(!gate||!safety||safety.inspect(item.url).type!=='reviewed'||!gate.officialSourceReviewed(item.url))return null;
    let storage=null;
    try{storage=window.localStorage;}catch{}
    return gate.maySkipConfirmation(item.url,storage)?item.url:
      'leave.html?url='+encodeURIComponent(item.url)+'&name='+encodeURIComponent(name(item));
  }
  function link(item){
    const href=destination(item);
    if(!href)return element('span',name(item));
    const anchor=element('a',name(item));
    anchor.dataset.recOpen=item.id;
    anchor.href=href;
    anchor.rel='noopener noreferrer';
    anchor.referrerPolicy='no-referrer';
    return anchor;
  }
  function loadCatalog(){
    if(!indexes){
      indexes=fetch('recommendations-catalog.json').then(response=>{
        if(!response.ok)throw Error('catalog');
        return response.json();
      }).then(payload=>{
        rows=payload.filter(item=>destination(item));
        return new Map(rows.map(item=>[item.id,item]));
      }).catch(()=>{
        indexes=null;
        return new Map();
      });
    }
    return indexes;
  }
  function post(action,id,stars,voterToken=read(TOKEN)){
    if(!voterToken)return Promise.reject(Error('token'));
    const body={action,voter_token:voterToken};
    if(id)body.tool_id=id;
    if(stars)body.stars=stars;
    return fetch(endpoint,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body),keepalive:action==='click',
      signal:action==='click'?undefined:AbortSignal.timeout?.(8000),
    }).then(async response=>{
      if(response.status===429)throw Error('limit');
      if(!response.ok||!(await response.json()).ok)throw Error('unavailable');
    });
  }
  async function refresh(){
    const revision=++fetchVersion;
    const days=Number(windowSelect?.value||7);
    await loadCatalog();
    if(revision===fetchVersion&&!stats)render();
    let data=null;
    try{
      const response=await fetch(endpoint+'?days='+days,{signal:AbortSignal.timeout?.(7000)});
      if(!response.ok)throw Error('unavailable');
      const {ok,items}=await response.json();
      if(ok&&items&&typeof items==='object')data=items;
    }catch{}
    if(revision!==fetchVersion)return;
    stats=data;
    render();
  }
  function summarize(item,localData){
    const value=stats?.[item.id];
    if(!stats){
      const personal=localData.ratings[item.id]?.stars;
      return personal?t('我的评分 '+personal+'/5','My rating '+personal+'/5'):
        t('暂无我的评分','No personal rating');
    }
    const n=value?.count||0;
    return n>=5?t(value.average+' / 5 · '+n+' 个评分',value.average+' / 5 · '+n+' ratings'):
      n?t('评分较少 · '+n+' 个评分','Small sample · '+n+' ratings'):
        t('暂无公开评分','No public ratings');
  }
  async function rate(id,stars){
    if(pending.has(id))return;
    const data=getLocal();
    const removing=stars===data.ratings[id]?.stars;
    if(removing)delete data.ratings[id];
    else data.ratings[id]={stars,updatedAt:Date.now()};
    if(!write(model.KEY,JSON.stringify(data)))return;
    if(read(SHARE)!=='1'){
      say(removing?t('已清除我的评分。','Personal rating removed.'):t('评分已保存在本机。','Rating saved on this device.'));
      render();
      return;
    }
    pending.add(id);
    render();
    try{
      await post(removing?'remove':'rate',id,removing?null:stars);
      say(removing?t('已撤回公开评分。','Public rating removed.'):t('已参与公开评分。','Public rating submitted.'));
      await refresh();
    }catch(error){
      say(error.message==='limit'?t('公开操作达到频率限制。本机设置已保存。','Public rate limit reached. Your local change was saved.'):
        t('公开服务暂不可用。本机设置已保存。','Public service unavailable. Your local change was saved.'));
    }finally{
      pending.delete(id);
      render();
    }
  }
  function makeCard(item,localView,localData){
    const article=element('article');
    article.dataset.recTool=item.id;
    const title=element('h2');
    title.append(link(item));
    const info=element('p',summarize(item,localData));
    const metric=(stats||localView)[item.id];
    if(metric?.score!==null&&Number.isInteger(metric?.score))info.append(' · '+t('推荐指数 ','Recommendation ')+metric.score);
    const group=element('div');
    group.className='rec-stars';
    group.setAttribute('role','group');
    group.setAttribute('aria-label',t('我的评分：','My rating: ')+name(item));
    const personal=localData.ratings[item.id]?.stars||0;
    for(let stars=1;stars<=5;stars++){
      const button=element('button',stars<=personal?'★':'☆');
      button.type='button';
      button.dataset.recStar=String(stars);
      button.setAttribute('aria-pressed',String(personal===stars));
      button.setAttribute('aria-label',t(stars+' 星',stars+' stars'));
      button.setAttribute('aria-disabled',String(pending.has(item.id)));
      button.addEventListener('click',()=>rate(item.id,stars));
      group.append(button);
    }
    group.addEventListener('keydown',event=>{
      if(!/^[1-5]$/.test(event.key)||event.altKey||event.metaKey||event.ctrlKey)return;
      event.preventDefault();
      rate(item.id,Number(event.key));
    });
    article.append(title,info,element('small',t('我的评分','My rating')),group);
    return article;
  }
  function render(){
    localize();
    const localData=getLocal();
    const days=Number(windowSelect?.value||7);
    const localView=model.score(localData,days);
    panel.querySelector('[data-rec-title]').textContent=stats?t('近期热门','Trending'):t('近期热门 · 本机','Trending · This device');
    panel.querySelector('[data-rec-mode]').textContent=stats?
      t('仅统计自愿参与者打开入口和提交评分的次数。','Counts reflect opted-in opens and ratings.'):
      t('显示当前浏览器的记录。','Showing activity saved in this browser.');
    const values=stats||localView;
    const hottest=[...rows].filter(item=>values[item.id]?.clicks>0)
      .sort((a,b)=>values[b.id].clicks-values[a.id].clicks).slice(0,5);
    trend.replaceChildren(...hottest.map(item=>{
      const entry=element('li');
      entry.append(link(item),element('small',t(values[item.id].clicks+' 次打开',values[item.id].clicks+' opens')));
      return entry;
    }));
    if(!hottest.length)trend.append(element('li',t('暂时没有足够的打开记录。','There is no activity to rank yet.')));
    if(!full)return;
    share.checked=read(SHARE)==='1';
    local.checked=read(LOCAL)==='1';
    revoke.disabled=!read(TOKEN);
    const choice=sort.value;
    const titleCompare=(a,b)=>name(a).localeCompare(name(b));
    const pick=new URLSearchParams(location.search).get('pick');
    const ordered=[...rows].sort((a,b)=>{
      if(choice==='name')return titleCompare(a,b);
      const x=values[a.id],y=values[b.id];
      const byRating=(stats?(y?.average||0)-(x?.average||0):(localData.ratings[b.id]?.stars||0)-(localData.ratings[a.id]?.stars||0));
      const primary=choice==='rating'?byRating:choice==='popular'?(y?.clicks||0)-(x?.clicks||0):(y?.score||0)-(x?.score||0);
      return (b.id===pick)-(a.id===pick)||primary||titleCompare(a,b);
    });
    const active=document.activeElement;
    const lastTool=active?.closest('[data-rec-tool]')?.dataset.recTool;
    const lastStar=active?.dataset.recStar;
    list.replaceChildren(...ordered.map(item=>makeCard(item,localView,localData)));
    if(lastTool&&lastStar)list.querySelector('[data-rec-tool="'+lastTool+'"] [data-rec-star="'+lastStar+'"]')?.focus({preventScroll:true});
  }
  async function record(event){
    if(event.defaultPrevented||!(event.target instanceof Element))return;
    if(event.type==='auxclick'&&event.button!==1)return;
    if(read(LOCAL)!=='1'&&read(SHARE)!=='1')return;
    const anchor=event.target.closest('a[data-rec-open],a.start-card,a.aq-pick-link');
    if(!anchor)return;
    const map=await loadCatalog();
    const id=anchor.dataset.recOpen||anchor.closest('[data-pick-id]')?.dataset.pickId||
      rows.find(item=>item.kind==='tool'&&item.url===anchor.getAttribute('href'))?.id;
    if(!map.has(id))return;
    if(read(LOCAL)==='1'){
      const state=getLocal();
      const next=model.merge(state,{clicks:[{toolId:id,ts:Date.now()}],ratings:{}});
      write(model.KEY,JSON.stringify(next));
    }
    if(read(SHARE)==='1')post('click',id).catch(()=>{});
  }
  document.addEventListener('click',record);
  document.addEventListener('auxclick',record);
  window.addEventListener('aq:language-change',()=>{localize();if(rows.length)render();});
  window.addEventListener('online',()=>{if(full||panel.open)refresh();});
  window.addEventListener('offline',()=>{stats=null;if(rows.length)render();});
  localize();
  if(!full){
    panel.addEventListener('toggle',()=>{if(panel.open)refresh();});
    if(read(SHARE)==='1'||read(LOCAL)==='1')loadCatalog();
    return;
  }
  if(windowSelect)windowSelect.addEventListener('change',refresh);
  if(sort)sort.addEventListener('change',render);
  local.addEventListener('change',()=>{write(LOCAL,local.checked?'1':'0');render();});
  share.addEventListener('change',()=>{
    if(!share.checked)write(SHARE,'0');
    else if(token())write(SHARE,'1');
    render();
  });
  const clearDialog=document.getElementById('recClearDialog');
  const clearChoice=document.getElementById('recClearChoice');
  for(const button of panel.querySelectorAll('[data-rec-clear]'))button.addEventListener('click',()=>{
    clearDialog.returnValue='';
    clearDialog.dataset.kind=button.dataset.recClear;
    clearChoice.textContent=button===revoke?
      t('撤回此浏览器发布的评分并关闭参与。已汇总的打开次数会随统计窗口过期。','Remove ratings submitted by this browser and disable sharing. Aggregate opens expire with the reporting window.'):
      t('清除当前浏览器的点击和评分。','Clear clicks and ratings saved in this browser.');
    clearDialog.showModal();
  });
  clearDialog.addEventListener('close',async()=>{
    if(clearDialog.returnValue!=='clear')return;
    if(clearDialog.dataset.kind==='local'){
      if(remove(model.KEY))say(t('本机记录已清除。','Local records cleared.'));
    }else{
      try{
        await post('clear');
        write(SHARE,'0');
        remove(TOKEN);
        say(t('已撤回公开评分并关闭参与。','Public ratings removed and sharing turned off.'));
        await refresh();
      }catch{say(t('暂时无法撤回，原匿名代号仍保留，可稍后重试。','Could not withdraw ratings. The browser identifier has been kept so you can retry.'));}
    }
    render();
  });
  refresh();
})();
