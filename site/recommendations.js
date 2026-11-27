"use strict";
(()=>{
  const model=window.AVENQIR_RECOMMENDATIONS;
  const sourceUI=window.AVENQIR_ATLAS_SOURCE_UI;
  const panel=document.querySelector('[data-rec-view]');
  if(!model||!sourceUI)return;

  const full=panel?.dataset.recView==='full';
  const LOCAL='avenqir.recommendations.history.v1';
  const SHARE='avenqir.recommendations.share.v1';
  const TOKEN='avenqir.recommendations.token.v1';
  const endpoint='recommendations-api.php';
  const trend=panel?.querySelector('[data-rec-trend]');
  const status=panel?.querySelector('[data-rec-status]');
  const sort=panel?.querySelector('#recSort');
  const windowSelect=panel?.querySelector('#recWindow');
  const list=panel?.querySelector('#recCards');
  const share=panel?.querySelector('#recShare');
  const local=panel?.querySelector('#recLocal');
  const revoke=panel?.querySelector('#recRevoke');
  const query=panel?.querySelector('#recQuery');
  const type=panel?.querySelector('#recType');
  const count=panel?.querySelector('#recCount');
  const clearFilter=panel?.querySelector('#recClearFilter');
  const prev=panel?.querySelector('#recPrevious');
  const next=panel?.querySelector('#recNext');
  const scope=panel?.querySelector('#recScope');
  const sourceFilter=panel?.querySelector('#recSource');
  const basis=panel?.querySelector('#recBasis');
  const editorOrder=new Map((window.AVENQIR_ATLAS_POPULAR_PICKS||[]).map((item,i)=>[item.id,i]));
  const editorRank=id=>editorOrder.get(id)??Number.MAX_SAFE_INTEGER;
  const pageSize=4;
  let page=0;
  let pick=new URLSearchParams(location.search).get('pick');
  let positioned=false;
  if(full&&pick)panel.classList.add('rec-focused');
  let rows=[];
  let indexes=null;
  let resolvedItems=new Map();
  const sessionClicks=new Map();
  let stats=null;
  let fetchVersion=0;
  const pending=new Set();
  const messages=new Map();
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
    find:'Search by name, domain or category',type:'Type',all:'All types',
    tool:'AVENQIR tools',website:'Third-party sites',clearFilter:'Browse all',
    previous:'Previous page',next:'Next page',
    manageSharing:'Participation settings',scope:'Data scope',publicScope:'Public totals',localScope:'This device',source:'Source',allSources:'All sources',reviewed:'Source checked',pending:'Source pending',editor:'Editor picks',mine:'Rated by me',
  };
  const labels=[...document.querySelectorAll('[data-rec-label]')].map(node=>[node,node.textContent]);
  function localize(){for(const [node,original] of labels)node.textContent=t(original,english[node.dataset.recLabel]);}
  const say=message=>{if(status)status.textContent=message;};
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
    try{const next=[...crypto.getRandomValues(new Uint8Array(32))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
      return write(TOKEN,next)?next:null;}catch{return null;}
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
    if(!gate||!safety||gate.urlRisk(item.url).blocked||safety.threatStatus(item.url)==='listed')return null;
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
    if(item.kind==='website'&&!href.startsWith('leave.html'))anchor.addEventListener('click',event=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&destination(item))sourceUI.noteVisit(item.url);});
    return anchor;
  }
  function loadCatalog(){
    if(!indexes){
      indexes=sourceUI.catalog().then(payload=>{
        const seen=new Set();
        rows=payload.filter(item=>{
          if(!destination(item)||seen.has(item.url))return false;
          seen.add(item.url);
          return true;
        });
        resolvedItems=new Map(rows.map(item=>[item.id,item]));
        return resolvedItems;
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
      const response=await fetch(endpoint+'?days='+days,{cache:'no-store',signal:AbortSignal.timeout?.(7000)});
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
    if(scope?.value==='local'||!stats){
      const personal=localData.ratings[item.id]?.stars;
      return personal?t('本机评分 '+personal+'/5','Device rating '+personal+'/5'):
        t('暂无本机评分','No device rating');
    }
    const n=value?.count||0;
    return n>=5?t(value.average+' / 5 · '+n+' 个评分',value.average+' / 5 · '+n+' ratings'):
      n?t('评分较少 · '+n+' 个评分','Small sample · '+n+' ratings'):
        t('暂无公开评分','No public ratings');
  }
  async function rate(id,stars){
    if(pending.has(id))return;
    const data=getLocal();
    const removing=stars===null;
    if(removing)delete data.ratings[id];
    else data.ratings[id]={stars,updatedAt:Date.now()};
    if(!write(model.KEY,JSON.stringify(data)))return;
    window.dispatchEvent(new CustomEvent('aq:personal-rating-updated'));
    if(read(SHARE)!=='1'){
      messages.set(id,removing?t('已清除我的评分。','Personal rating removed.'):t('评分已保存在本机。','Rating saved on this device.'));
      render();
      return;
    }
    pending.add(id);
    messages.set(id,t('正在更新公开评分…','Updating public rating…'));
    render();
    try{
      await post(removing?'remove':'rate',id,removing?null:stars);
      messages.set(id,removing?t('已撤回公开评分。','Public rating removed.'):t('已参与公开评分。','Public rating submitted.'));
      await refresh();
      sourceUI.refreshRatings(true);
    }catch(error){
      messages.set(id,error.message==='limit'?t('公开操作达到频率限制。本机设置已保存。','Public rate limit reached. Your local change was saved.'):
        t('公开服务暂不可用。本机设置已保存。','Public service unavailable. Your local change was saved.'));
    }finally{
      pending.delete(id);
      render();
    }
  }
  // One compact dialog shared by directory, home picks and the standalone rating center.
  let quickBusy=false;
  function openQuickRating(item,trigger){
    if(quickBusy||!item||!destination(item))return false;
    if(typeof HTMLDialogElement==='undefined'||!HTMLDialogElement.prototype.showModal)return false;
    if(document.querySelector('dialog[open]'))return false;
    const dialog=element('dialog');
    dialog.className='aq-quick-rating';
    const heading=element('h2',name(item));
    heading.id='aqQuickRatingTitle';
    dialog.setAttribute('aria-labelledby',heading.id);
    const aggregate=element('p');
    aggregate.className='aq-quick-rating-meta';
    const updateAggregate=()=>{
      const value=sourceUI.metric(item.url),average=model.publicAverage(value);
      aggregate.textContent=average?t('公开评分 '+average.toFixed(1)+'/5 · '+value.count+' 份','Public rating '+average.toFixed(1)+'/5 · '+value.count+' ratings'):sourceUI.ratingsAvailable()?t(value?.count?'公开评分样本不足5份':'暂无公开评分',value?.count?'Fewer than 5 public ratings':'No public ratings'):t('公开评分暂不可用','Public ratings unavailable');
    };
    updateAggregate();
    const meta=element('p',t('评价使用体验，不代表安全认证。','Rate usability, not safety.'));
    const group=element('div');group.className='aq-quick-stars';group.setAttribute('role','group');group.setAttribute('aria-label',t('选择星级','Choose stars'));
    let selected=getLocal().ratings[item.id]?.stars||0;
    const description=element('p');description.className='aq-quick-choice';description.setAttribute('aria-live','polite');
    const submit=element('button',t('保存评价','Save rating'));submit.type='button';submit.className='aq-quick-primary';
    const clear=element('button',t('清除评分','Clear rating'));clear.type='button';
    const cancel=element('button',t('关闭','Close'));cancel.type='button';
    const shareLabel=element('label');shareLabel.className='aq-quick-share';
    const publicVote=element('input');publicVote.type='checkbox';publicVote.checked=read(SHARE)==='1';
    shareLabel.append(publicVote,element('span',t('同时提交匿名公开评分（可选）','Also submit an anonymous public rating (optional)')));
    const privacy=element('small',t('仅发送公开条目 ID、星级和浏览器随机代号。不启用额外点击追踪。','Sends only public entry ID, stars and random browser identifier. Does not enable extra click tracking.'));
    const feedback=element('p');feedback.className='aq-quick-feedback';feedback.setAttribute('role','status');
    const sync=()=>{
      [...group.children].forEach((b,i)=>{b.textContent=i<selected?'★':'☆';b.setAttribute('aria-pressed',String(selected===i+1));});
      description.textContent=selected?t(['','很差','不太好用','一般','好用','非常推荐'][selected],['','Poor','Not useful','Average','Useful','Highly recommended'][selected]):t('请选择1–5星','Choose 1–5 stars');
      submit.disabled=!selected||quickBusy;
      clear.disabled=quickBusy||!getLocal().ratings[item.id]&&!read(TOKEN);
    };
    for(let i=1;i<=5;i++){
      const b=element('button');b.type='button';b.setAttribute('aria-label',t(i+' 星',i+' stars'));b.addEventListener('click',()=>{selected=i;sync();});group.append(b);
    }
    const actions=element('div');actions.className='aq-quick-actions';actions.append(cancel,clear,submit);
    dialog.append(heading,aggregate,meta,group,description,shareLabel,privacy,feedback,actions);
    const more=element('a',t('文字反馈 / 报告问题','Written feedback / Report a problem'));
    more.href='feedback.php?type=feedback&url='+encodeURIComponent(item.url)+'#write';
    dialog.append(more);
    function disable(busy){quickBusy=busy;for(const button of group.children)button.disabled=busy;publicVote.disabled=busy;cancel.disabled=busy;sync();}
    async function save(removing){
      if(quickBusy||(!removing&&!selected)||!destination(item))return;
      const data=getLocal();
      if(removing)delete data.ratings[item.id];else data.ratings[item.id]={stars:selected,updatedAt:Date.now()};
      if(!model.valid(data)||!write(model.KEY,JSON.stringify(data))){feedback.textContent=t('无法保存本机评分。','Could not save on this device.');return;}
      if(removing)selected=0;
      window.dispatchEvent(new CustomEvent('aq:personal-rating-updated'));
      if(!publicVote.checked){feedback.textContent=t(removing?'已清除本机评分；此前公开评分未撤回。':'已保存本机评分；未提交公开榜单。',removing?'Local rating cleared; previous public rating unchanged.':'Saved locally; not submitted publicly.');sync();return;}
      disable(true);
      feedback.textContent=t('正在提交公开评分…','Submitting public rating…');
      try{
        const voter=removing?read(TOKEN):token();
        if(!voter)throw Error('token');
        await post(removing?'remove':'rate',item.id,removing?null:selected,voter);
        feedback.textContent=t(removing?'已撤回公开评分。':'已提交公开评分。',removing?'Public rating withdrawn.':'Public rating submitted.');
        await sourceUI.refreshRatings(true);
        if(full)await refresh();
      }catch(error){feedback.textContent=t('公开提交失败，本机评分已保存；可重试。','Public submission failed; local rating saved. Try again.');}
      finally{disable(false);}
    }
    submit.addEventListener('click',()=>save(false));
    clear.addEventListener('click',()=>save(true));
    cancel.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('cancel',event=>{if(quickBusy)event.preventDefault();});
    dialog.addEventListener('close',()=>{window.removeEventListener('aq:ratings-updated',updateAggregate);dialog.remove();trigger?.focus({preventScroll:true});});
    document.body.append(dialog);
    window.addEventListener('aq:ratings-updated',updateAggregate);
    sync();dialog.showModal();group.firstElementChild?.focus({preventScroll:true});
    sourceUI.refreshRatings().then(updateAggregate);
    return true;
  }
  window.addEventListener('aq:quick-rating',event=>{
    if(openQuickRating(event.detail?.item,event.detail?.trigger))event.preventDefault();
  });
  // One pending public catalog ID in this tab only, never sent to a server.
  const RETURN_KEY='avenqir.rating.return.v1', RETURN_OFF='avenqir.rating.return.disabled.v1';
  let reminder=null,returnCheckRunning=false;
  function getReturn(){try{return JSON.parse(sessionStorage.getItem(RETURN_KEY)||'null');}catch{return null;}}
  function setReturn(value){try{if(value)sessionStorage.setItem(RETURN_KEY,JSON.stringify(value));else sessionStorage.removeItem(RETURN_KEY);}catch{}}
  function dismissReturn(){setReturn(null);reminder?.remove();reminder=null;}
  window.addEventListener('aq:rating-visit',event=>{
    const id=event.detail;
    if(read(RETURN_OFF)==='1'||!/^[a-zA-Z0-9-]{1,40}$/.test(id)||getLocal().ratings[id])return;
    dismissReturn();
    setReturn({id,at:Date.now(),departed:false});
  });
  function markDeparture(){const record=getReturn();if(record&&!record.departed)setReturn({...record,departed:true});}
  async function checkReturn(){
    if(returnCheckRunning||document.visibilityState!=='visible'||reminder||read(RETURN_OFF)==='1')return;
    const record=getReturn();
    if(!record)return;
    if(Date.now()-record.at>1800000||getLocal().ratings[record.id]){dismissReturn();return;}
    if(!model.returnPrompt(record)||document.querySelector('dialog[open]'))return;
    returnCheckRunning=true;
    try{
      const item=(await loadCatalog()).get(record.id);
      if(!item||item.kind!=='website'||!destination(item)){dismissReturn();return;}
      if(document.visibilityState!=='visible'||document.querySelector('dialog[open]')||getReturn()?.id!==record.id)return;
      // Consume before presenting; dismissal or navigating away never repeats it.
      setReturn(null);
      const box=element('aside');box.className='aq-return-rating';box.setAttribute('aria-label',t('访问后评价','Rate after opening'));
      box.append(element('strong',t('刚才打开了 '+name(item)+'，好用吗？','How was '+name(item)+'?')));
      const controls=element('div');controls.className='aq-return-actions';
      const rateButton=element('button',t('快速评价','Quick rating'));rateButton.type='button';
      const later=element('button',t('暂不','Not now'));later.type='button';
      const off=element('button',t('不再提醒','Don’t remind me'));off.type='button';
      rateButton.addEventListener('click',()=>{if(openQuickRating(item,rateButton)){box.remove();reminder=null;}});
      later.addEventListener('click',dismissReturn);
      off.addEventListener('click',()=>{write(RETURN_OFF,'1');dismissReturn();});
      controls.append(rateButton,later,off);box.append(controls);document.body.append(box);reminder=box;
    }finally{returnCheckRunning=false;}
  }
  window.addEventListener('pagehide',markDeparture);
  window.addEventListener('pageshow',checkReturn);
  window.addEventListener('focus',checkReturn);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')markDeparture();else checkReturn();});
  document.getElementById('aqRatingReminder')?.addEventListener('change',event=>{
    if(event.target.checked)remove(RETURN_OFF);else{write(RETURN_OFF,'1');dismissReturn();}
  });
  const reminderSetting=document.getElementById('aqRatingReminder');
  if(reminderSetting)reminderSetting.checked=read(RETURN_OFF)!=='1';
  checkReturn();
  // Anonymous read-only aggregates; no visitor token, search or history included.
  if(!full&&!document.getElementById('aqRatingReminder'))sourceUI.refreshRatings();
  if(read(SHARE)==='1'||read(LOCAL)==='1')loadCatalog();
  function makeCard(item,localView,localData){
    const article=element('article');
    article.dataset.recTool=item.id;
    const title=element('h2');
    title.append(link(item));
    const info=element('p',summarize(item,localData));
    const isLocal=scope?.value==='local'||!stats;
    const metric=(isLocal?localView:stats)?.[item.id];
    const score=model.displayScore(metric,isLocal);
    if(score!==null)info.append(' · '+t(isLocal?'本机指数 ':'公开推荐指数 ',isLocal?'Device index ':'Public recommendation ')+score);
    if(metric?.clicks>0)info.append(' · '+t(metric.clicks+' 次入口点击',metric.clicks+' entry opens'));
    if(editorOrder.has(item.id))info.append(' · '+t('编辑精选','Editor pick'));
    const group=element('div');
    group.className='rec-stars';
    group.setAttribute('role','group');
    group.setAttribute('aria-label',t('我的评分：','My rating: ')+name(item));
    const personal=localData.ratings[item.id]?.stars||0;
    const source=item.kind==='tool'?sourceUI.badge('tool'):sourceUI.external(item.url,!destination(item).startsWith('leave.html'));
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
    const myRating=element('p',personal?t('我的评分 '+personal+'/5','My rating '+personal+'/5'):t('我的评分','My rating'));
    myRating.className='rec-my-rating';
    const clear=element('button',t('清除我的评分','Clear my rating'));
    clear.className='rec-clear-rating';
    clear.type='button';
    clear.hidden=!personal;
    clear.disabled=pending.has(item.id);
    clear.addEventListener('click',()=>rate(item.id,null));
    const detail=element('small',messages.get(item.id));
    detail.className='rec-rating-feedback';
    detail.setAttribute('role','status');
    const controls=element('details');
    controls.className='rec-rate-details';
    controls.open=!!pick||pending.has(item.id)||messages.has(item.id);
    const summary=element('summary',personal?t('我的评分：'+personal+'/5 · 修改','My rating: '+personal+'/5 · Edit'):t('评价这个'+(item.kind==='tool'?'工具':'网址'),'Rate this '+(item.kind==='tool'?'tool':'site')));
    controls.append(summary,myRating,group,clear,detail);
    if(item.kind==='website'){
      const feedback=element('a',t('文字反馈 / 报告失效','Feedback / Report a broken link'));
      feedback.href='feedback.php?type=feedback&url='+encodeURIComponent(item.url)+'#write';
      feedback.className='rec-feedback-link';
      controls.append(feedback);
    }
    article.append(title,source,info,controls);
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
    const isLocal=!stats||(full&&scope.value==='local');
    const values=isLocal?localView:(stats||{});
    panel.querySelector('[data-rec-title]').textContent=isLocal?t('近期热门 · 本机','Trending · This device'):t('近期热门 · 公开','Trending · Public');
    panel.querySelector('[data-rec-mode]').textContent=isLocal?t(!stats?'公开数据暂不可用 · 仅显示本机记录。':'仅本机入口点击记录。',!stats?'Public data unavailable · device records only.':'Device entry opens only.'):t('仅统计自愿参与者的入口点击；不是全网热度。','Opted-in entry opens only, not web-wide popularity.');
    const hottest=[...rows].filter(item=>values[item.id]?.clicks>0)
      .sort((a,b)=>values[b.id].clicks-values[a.id].clicks).slice(0,5);
    trend.replaceChildren(...hottest.map(item=>{
      const entry=element('li');
      entry.append(link(item),element('small',t(values[item.id].clicks+' 次打开',values[item.id].clicks+' opens')));
      return entry;
    }));
    if(!hottest.length){panel.querySelector('[data-rec-title]').textContent=t('近期热门 · 暂无数据','Trending · No data yet');trend.append(element('li',t('暂无有效打开记录。可先浏览编辑精选。','No eligible opens yet. Browse editor picks instead.')));}
    if(!full)return;
    share.checked=read(SHARE)==='1';
    panel.querySelector('#recSharingMode').textContent=share.checked?
      t('当前评分会同时参与公开汇总。','New ratings also contribute to the public totals.'):
      t('评分默认保存在本机；弹窗可单独选择公开提交。','Ratings are saved on this device; the dialog offers optional public submission.');
    local.checked=read(LOCAL)==='1';
    revoke.disabled=!read(TOKEN);
    const choice=sort.value;
    basis.textContent=isLocal?t('本机指数依据你的评分和近期入口点击；不代表其他用户。','Device index uses your ratings and recent entry opens, not other users.'):t('公开星级为累计评分，至少5份才显示均值和推荐指数；热度按选定时段。暂无数据时仅列编辑精选，不虚构分数。','Public ratings are cumulative; at least five are needed for averages and recommendation scores. Opens use the selected period. Unrated editor picks have no invented scores.');
    const titleCompare=(a,b)=>name(a).localeCompare(name(b));
    const terms=query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const ordered=rows.filter(item=>{
      if(pick&&item.id!==pick)return false;
      if(type.value!=='all'&&item.kind!==type.value)return false;
      if(sourceFilter.value!=='all'&&(item.kind!=='website'||Boolean(window.AVENQIR_LINK_GATE?.officialSourceReviewed(item.url))!==(sourceFilter.value==='reviewed')))return false;
      if(choice==='editor'&&!editorOrder.has(item.id))return false;
      if(choice==='mine'&&!localData.ratings[item.id])return false;
      const text=[...item.title,item.category||'',item.url].join(' ').toLocaleLowerCase();
      return terms.every(term=>text.includes(term));
    }).sort((a,b)=>{
      if(choice==='name')return titleCompare(a,b);
      if(choice==='editor')return editorRank(a.id)-editorRank(b.id)||titleCompare(a,b);
      const x=values[a.id],y=values[b.id];
      const byRating=isLocal?(localData.ratings[b.id]?.stars||0)-(localData.ratings[a.id]?.stars||0):model.publicAverage(y)-model.publicAverage(x);
      const primary=choice==='mine'?(localData.ratings[b.id]?.updatedAt||0)-(localData.ratings[a.id]?.updatedAt||0):choice==='rating'?byRating:choice==='popular'?(y?.clicks||0)-(x?.clicks||0):(model.displayScore(y,isLocal)??-1)-(model.displayScore(x,isLocal)??-1);
      return primary||editorRank(a.id)-editorRank(b.id)||titleCompare(a,b);
    });
    const active=document.activeElement;
    const lastTool=active?.closest('[data-rec-tool]')?.dataset.recTool;
    const lastStar=active?.dataset.recStar;
    const clearing=active?.classList.contains('rec-clear-rating');
    const lastPage=Math.max(0,Math.ceil(ordered.length/pageSize)-1);
    page=Math.min(page,lastPage);
    const openIds=new Set([...list.querySelectorAll('article:has(.rec-rate-details[open])')].map(card=>card.dataset.recTool));
    list.replaceChildren(...ordered.slice(page*pageSize,(page+1)*pageSize).map(item=>{
      const card=makeCard(item,localView,localData);
      if(openIds.has(item.id))card.querySelector('details').open=true;
      return card;
    }));
    if(!ordered.length)list.append(element('p',pick?t('该网址暂不可评价，可能已下架、被拦截或目录尚未同步。可返回全部列表。','This entry cannot be rated right now. It may be removed, blocked or not yet synchronized. Browse all entries.'):t('没有匹配的条目。试试名称或域名。','No matches. Try a name or a domain.')));
    count.textContent=t(`${ordered.length} 个条目 · 第 ${page+1} / ${lastPage+1} 页`,`${ordered.length} entries · Page ${page+1} of ${lastPage+1}`);
    clearFilter.hidden=!pick&&!query.value&&type.value==='all'&&sourceFilter.value==='all'&&!['editor','mine'].includes(choice);
    prev.disabled=page===0;
    next.disabled=page===lastPage;
    panel.querySelector('.rec-pagination').hidden=lastPage===0;
    if(lastTool&&(lastStar||clearing)){
      const tile=list.querySelector('[data-rec-tool="'+lastTool+'"]');
      const control=tile?.querySelector(lastStar?'[data-rec-star="'+lastStar+'"]':'.rec-clear-rating:not([hidden])');
      (control||tile?.querySelector('.rec-stars button'))?.focus({preventScroll:true});
    }
    if(pick&&!positioned&&ordered.length){
      positioned=true;
      const first=list.querySelector('.rec-stars button');
      first?.focus({preventScroll:true});
      list.scrollIntoView({block:'nearest'});
    }
  }
  function recordKnown(item){
    if((read(LOCAL)!=='1'&&read(SHARE)!=='1')||!item||!destination(item))return;
    const id=item.id,now=Date.now();
    if(now-(sessionClicks.get(id)??-Infinity)<model.PAUSE)return;
    sessionClicks.set(id,now);
    if(sessionClicks.size>2000)sessionClicks.delete(sessionClicks.keys().next().value);
    if(read(LOCAL)==='1'){
      const state=getLocal();
      const next=model.merge(state,{clicks:[{toolId:id,ts:now}],ratings:{}});
      write(model.KEY,JSON.stringify(next));
    }
    if(read(LOCAL)==='1')window.dispatchEvent(new CustomEvent('aq:personal-rating-updated'));
    if(read(SHARE)==='1')post('click',id).catch(()=>{});
  }
  function recordOpen(id,url){
    if(read(LOCAL)!=='1'&&read(SHARE)!=='1')return;
    const item=(id&&resolvedItems.get(id))||sourceUI.itemForURL(url);
    if(item){recordKnown(item);return;}
    loadCatalog().then(map=>recordKnown(id?map.get(id):sourceUI.itemForURL(url)||rows.find(item=>item.url===url))).catch(()=>{});
  }
  function record(event){
    if(event.defaultPrevented||!(event.target instanceof Element))return;
    if(event.type==='auxclick'&&event.button!==1)return;
    const anchor=event.target.closest('a[data-rec-open],a.start-card,a.aq-pick-link');
    if(!anchor)return;
    const pick=anchor.closest('[data-pick-id]');
    const href=anchor.getAttribute('href');
    if(!href||href.startsWith('leave.html'))return; // Count only after the existing external gate is confirmed.
    recordOpen(anchor.dataset.recOpen||pick?.dataset.pickId,href);
  }
  document.addEventListener('click',record);
  document.addEventListener('auxclick',record);
  window.addEventListener('aq:website-open',event=>recordOpen(null,event.detail));
  const inlineShare=[...document.querySelectorAll('[data-rec-inline-share]')];
  const inlineLocal=[...document.querySelectorAll('[data-rec-inline-local]')];
  function syncInline(){for(const node of inlineShare)node.checked=read(SHARE)==='1';for(const node of inlineLocal)node.checked=read(LOCAL)==='1';}
  for(const node of inlineShare)node.addEventListener('change',()=>{
    if(!node.checked)write(SHARE,'0');else if(token())write(SHARE,'1');
    syncInline();if(node.checked)loadCatalog();
  });
  for(const node of inlineLocal)node.addEventListener('change',()=>{write(LOCAL,node.checked?'1':'0');syncInline();if(node.checked)loadCatalog();});
  window.addEventListener('storage',syncInline);syncInline();
  if(!panel){
    if(read(SHARE)==='1'||read(LOCAL)==='1')loadCatalog();
    return;
  }
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
  function clearPick(){
    if(!pick)return;
    pick=null;
    panel.classList.remove('rec-focused');
    const url=new URL(location.href);
    url.searchParams.delete('pick');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  for(const control of [query,type,sourceFilter]){
    control.addEventListener(control===query?'input':'change',()=>{
      clearPick();
      page=0;
      render();
    });
  }
  sort.addEventListener('change',()=>{clearPick();page=0;render();});
  scope.addEventListener('change',()=>{page=0;render();});
  clearFilter.addEventListener('click',()=>{
    clearPick();
    query.value='';
    type.value='all';
    sourceFilter.value='all';
    sort.value='recommended';
    page=0;
    render();
    query.focus();
  });
  for(const [button,offset] of [[prev,-1],[next,1]])button.addEventListener('click',()=>{
    page+=offset;
    render();
    list.querySelector('article h2 a')?.focus();
  });
  panel.querySelector('#recManageSharing').addEventListener('click',()=>{
    const settings=panel.querySelector('.rec-preferences');
    settings.open=true;
    share.focus();
  });
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
