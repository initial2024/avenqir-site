"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const raw=params.get('url')||'';
  const gate=window.AVENQIR_LINK_GATE;
  const safe=gate?.sanitize(raw),risk=gate?.urlRisk(raw);
  const name=(params.get('name')||'').trim().slice(0,90);
  const go=$('leaveContinue'),remember=$('leaveRemember'),row=$('leaveRememberRow');
  const threat=window.AVENQIR_ATLAS_SAFETY;
  const source=window.AVENQIR_ATLAS_SOURCE_UI;
  if(source)$('leaveSource').append(source.external(raw,false));
  if(!safe||!risk||risk.blocked||threat?.threatStatus(raw)==='listed'){
    $('leaveName').textContent='网址已拒绝';
    $('leaveHost').textContent=threat?.threatStatus(raw)==='listed'?'外部钓鱼警告清单命中':risk?.reason||'仅允许有效的 http/https 网址';
    $('leaveStatus').textContent='此链接已被阻止，不能继续访问。';
    if(row)row.hidden=true;return;
  }
  $('leaveName').textContent=name||safe.hostname;
  $('leaveHost').textContent='目标域名：'+safe.hostname;
  $('leaveFullUrl').textContent=safe.href;
  $('leaveStatus').textContent='必须由你主动确认后才会离开本网站。';
  if(row)row.hidden=!risk.rememberable;
  if(remember){remember.checked=false;remember.disabled=!risk.rememberable;}
  go.disabled=false;
  go.addEventListener('click',()=>{
    const again=gate.urlRisk(safe.href);
    if(again.blocked||threat?.threatStatus(safe.href)==='listed')return;
    if(remember?.checked&&again.rememberable){
      try{gate.remember(safe.href,window.localStorage)}catch{}
    }
    source?.noteVisit(safe.href);
    window.dispatchEvent(new CustomEvent('aq:website-open',{detail:safe.href}));
    location.assign(safe.href);
  });
})();
