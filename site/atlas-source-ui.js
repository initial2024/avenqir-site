"use strict";
(()=>{
  const gate=window.AVENQIR_LINK_GATE;
  const safety=window.AVENQIR_ATLAS_SAFETY;
  const english=()=>!(window.AVENQIR_I18N?.locale||document.documentElement.lang).startsWith('zh');
  const t=(zh,en)=>english()?en:zh;
  let bundled;
  let added;
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
    }).catch(()=>[]);
  }
  function addedCatalog(){
    return added??=fetch('recommendations-api.php?catalog=added',{signal:AbortSignal.timeout?.(2200)})
      .then(response=>response.ok?response.json():null).then(data=>data?.ok&&Array.isArray(data.items)?data.items:[])
      .catch(()=>[]);
  }
  async function catalog(){
    const [staticRows,addedRows]=await Promise.all([bundledCatalog(),addedCatalog()]);
    return [...staticRows,...addedRows];
  }
  let bundledByURL;
  let addedByURL;
  const byURL=rows=>new Map(rows.filter(item=>item.kind==='website').map(item=>[new URL(item.url).href,item.id]));
  function ratingLink(url){
    if(!gate||!safety||gate.urlRisk(url).blocked||safety.threatStatus(url)==='listed')return null;
    const link=document.createElement('a');
    link.className='aq-source-rate';
    link.textContent=t('评价','Rate');
    link.hidden=true;
    bundledByURL??=bundledCatalog().then(byURL);
    bundledByURL.then(async urls=>{
      const exact=new URL(url).href;
      let id=urls.get(exact);
      if(!id){
        addedByURL??=addedCatalog().then(byURL);
        id=(await addedByURL).get(exact);
      }
      if(!id)return;
      link.href='recommendations.html?pick='+encodeURIComponent(id)+'#recListHeading';
      link.setAttribute('aria-label',t('评价 '+new URL(url).hostname,'Rate '+new URL(url).hostname));
      link.hidden=false;
    });
    return link;
  }
  window.AVENQIR_ATLAS_SOURCE_UI=Object.freeze({badge,external,label,ratingLink,catalog});
  notice();
  window.addEventListener('aq:language-change',notice);
})();
