"use strict";
(()=>{
  const gate=window.AVENQIR_LINK_GATE;
  const safety=window.AVENQIR_ATLAS_SAFETY;
  const english=()=>!(window.AVENQIR_I18N?.locale||document.documentElement.lang).startsWith('zh');
  const t=(zh,en)=>english()?en:zh;
  let bundled;
  let added,addedAt=0;
  function label(type){
    return {
      tool:t('本站工具','AVENQIR tool'),
      reviewed:t('第三方 · 来源已核对','Third party · Source checked'),
      pending:t('第三方 · 来源待核对','Third party · Source pending'),
      blocked:t('已拦截','Blocked'),
      prompt:t('访问前确认','Confirmation required'),
      caution:t('额外风险提示','Extra caution'),
      direct:t('外链 · 非安全认证','External · Not safety-certified'),
      remembered:t('本机已记住访问选择','Access choice saved on this device'),
    }[type];
  }
  function badge(type){
    const node=document.createElement('span');
    node.className='aq-source-badge aq-source-'+type;
    node.textContent=label(type);
    return node;
  }
  function external(url,permitted){
    const node=document.createElement('div');
    node.className='aq-source-badges';
    const reviewed=!!gate?.officialSourceReviewed(url);
    node.append(badge(reviewed?'reviewed':'pending'));
    const risk=gate?.urlRisk(url);
    if(!risk||risk.blocked||safety?.threatStatus(url)==='listed')node.append(badge('blocked'));
    else if(risk.forcePrompt)node.append(badge('caution'));
    else if(!permitted)node.append(badge('prompt'));
    else if(!reviewed)node.append(badge('remembered'));
    else node.append(badge('direct'));
    node.title=t('第三方独立运营；来源核对不是安全认证。请自行核对内容及隐私政策。','Independently operated; a source check is not safety certification. Check content and privacy practices.');
    return node;
  }
  function notice(){
    for(const node of document.querySelectorAll('[data-atlas-source-notice]')){
      node.textContent=t('外链由第三方运营。来源核对针对精确网址，不能保证第三方内容、隐私处理或访问安全。',
        'External links are operated by third parties. Source checks apply to exact URLs and do not guarantee content, privacy practices or safety.');
    }
  }
  function bundledCatalog(){
    return bundled??=fetch('recommendations-catalog.json').then(response=>{
      if(!response.ok)throw Error('catalog');
      return response.json();
    }).then(rows=>{if(!Array.isArray(rows))throw Error('catalog');return rows;}).catch(()=>{bundled=null;return [];});
  }
  function addedCatalog(force=false){
    if(added&&(Date.now()-addedAt<30000||!addedAt))return added;
    addedAt=0;
    return added=fetch('recommendations-api.php?catalog=added',{cache:'no-store',signal:AbortSignal.timeout?.(2200)})
      .then(response=>response.ok?response.json():null).then(data=>data?.ok&&Array.isArray(data.items)?data.items:[])
      .catch(()=>[]).finally(()=>{addedAt=Date.now();});
  }
  async function catalog(){
    const [staticRows,addedRows]=await Promise.all([bundledCatalog(),addedCatalog()]);
    return [...staticRows,...addedRows];
  }
  const byURL=rows=>new Map(rows.filter(item=>item.kind==='website'&&gate?.sanitize(item.url)).map(item=>[new URL(item.url).href,item]));
  let urlIndex=new Map(), metrics=null, statsRequest=null, metricsDays=7, localRatings=null, localMetrics=null;
  // The built-in catalog already exists synchronously on home/directory. Use it for fast click handlers.
  try{for(const x of window.AVENQIR_ATLAS_CATALOG?.catalog()||[]){const u=gate?.sanitize(x.url);if(u&&/^[a-zA-Z0-9-]{1,40}$/.test(x.id))urlIndex.set(u.href,{id:x.id,url:u.href,title:[x.name,x.name],kind:'website',category:x.category});}}catch{}
  function readLocal(){const m=window.AVENQIR_RECOMMENDATIONS;if(!m)return;try{localRatings=m.clean(JSON.parse(localStorage.getItem(m.KEY)));}catch{localRatings=m.empty();}localMetrics=m.score(localRatings,metricsDays);}
  function localMetric(url){if(!localMetrics)readLocal();const item=itemForURL(url);return item?localMetrics?.[item.id]:null;}
  function localStars(url){if(!localRatings)readLocal();const item=itemForURL(url);return item?localRatings?.ratings?.[item.id]?.stars||0:0;}
  window.addEventListener('aq:personal-rating-updated',()=>{readLocal();});
  window.addEventListener('storage',event=>{if(event.key===window.AVENQIR_RECOMMENDATIONS?.KEY){readLocal();updateRatingLinks();}});
  function refreshRatings(force=false,days=metricsDays){
    if(![7,30,90].includes(days))days=7;
    if(statsRequest)return statsRequest.then(()=>!force&&metricsDays===days?metrics:refreshRatings(force,days));
    if(metrics!==null&&!force&&metricsDays===days)return Promise.resolve(metrics);
    metricsDays=days;readLocal();
    statsRequest=Promise.all([bundledCatalog(),addedCatalog(force),fetch('recommendations-api.php?days='+days,{cache:'no-store',signal:AbortSignal.timeout?.(7000)}).then(r=>r.ok?r.json():null).catch(()=>null)]).then(([base,remote,data])=>{
      for(const [url,item] of byURL([...remote,...base]))urlIndex.set(url,item);
      metrics=data?.ok&&data.items&&typeof data.items==='object'?data.items:null;
      window.dispatchEvent(new CustomEvent('aq:ratings-updated'));
      return metrics;
    }).finally(()=>{statsRequest=null;});
    return statsRequest;
  }
  function itemForURL(url){return urlIndex.get(gate?.sanitize(url)?.href)||null;}
  function noteVisit(url){const item=itemForURL(url);if(item&&!gate.urlRisk(url).blocked&&safety?.threatStatus(url)!=='listed')window.dispatchEvent(new CustomEvent('aq:rating-visit',{detail:item.id}));}
  function metric(url){const item=urlIndex.get(gate?.sanitize(url)?.href);return item&&metrics&&Object.hasOwn(metrics,item.id)?metrics[item.id]:null;}
  function average(url){return metrics===null?localStars(url):window.AVENQIR_RECOMMENDATIONS?.publicAverage(metric(url))||0;}
  function recommendation(url){return window.AVENQIR_RECOMMENDATIONS?.displayScore(metrics===null?localMetric(url):metric(url),metrics===null)??-1;}
  function popularity(url){return (metrics===null?localMetric(url):metric(url))?.clicks||0;}
  function updateRatingLink(link,item){
    const m=metric(item.url),avg=window.AVENQIR_RECOMMENDATIONS?.publicAverage(m)||0,mine=localStars(item.url);
    link.textContent=avg?t('评价 · '+avg.toFixed(1)+'★ ('+m.count+')','Rate · '+avg.toFixed(1)+'★ ('+m.count+')'):mine?t('本机已评 '+mine+'★','Device rating '+mine+'★'):m?.count?t('评价 · 样本较少 ('+m.count+')','Rate · Small sample ('+m.count+')'):t('评价 ☆','Rate ☆');
  }
  function connectRating(link,item){if(!item)return;link.href='recommendations.html?pick='+encodeURIComponent(item.id)+'#recListHeading';updateRatingLink(link,item);link.hidden=false;}
  function updateRatingLinks(){for(const link of document.querySelectorAll('a.aq-source-rate[data-rating-url]')){const item=urlIndex.get(link.dataset.ratingUrl);if(item)connectRating(link,item);}}
  window.addEventListener('aq:ratings-updated',updateRatingLinks);
  window.addEventListener('aq:personal-rating-updated',updateRatingLinks);
  function ratingLink(url){
    if(!gate||!safety||gate.urlRisk(url).blocked||safety.threatStatus(url)==='listed')return null;
    const link=document.createElement('a');
    link.className='aq-source-rate';
    link.textContent=t('评价','Rate');
    link.hidden=true;
    const exact=new URL(url).href;
    link.dataset.ratingUrl=exact;
    link.setAttribute('aria-label',t('评价 '+new URL(url).hostname,'Rate '+new URL(url).hostname));
    link.addEventListener('click',event=>{
      if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const item=urlIndex.get(exact);
      if(!item||gate.urlRisk(url).blocked||safety.threatStatus(url)==='listed'){event.preventDefault();return;}
      if(!window.dispatchEvent(new CustomEvent('aq:quick-rating',{cancelable:true,detail:{item,trigger:link}})))event.preventDefault();
    });
    const item=urlIndex.get(exact);
    if(item)connectRating(link,item);
    else catalog().then(rows=>{for(const [u,row] of byURL(rows))urlIndex.set(u,row);connectRating(link,urlIndex.get(exact));}).catch(()=>{});
    return link;
  }
  window.AVENQIR_ATLAS_SOURCE_UI=Object.freeze({badge,external,label,ratingLink,catalog,refreshRatings,itemForURL,noteVisit,metric,average,recommendation,popularity,ratingsAvailable:()=>metrics!==null});
  notice();
  window.addEventListener('aq:language-change',()=>{notice();updateRatingLinks();});
  window.addEventListener('online',()=>{if(document.querySelector('[data-rec-view],#atlasResults,[data-popular-view]')){addedAt=1;refreshRatings(true).catch(()=>{});}});
  window.addEventListener('offline',()=>{metrics=null;readLocal();window.dispatchEvent(new CustomEvent('aq:ratings-updated'));});
})();
