"use strict";
(()=>{
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const raw=params.get('url')||'';
  const safe=window.AVENQIR_LINK_GATE?.sanitize(raw);
  const name=(params.get('name')||'').trim().slice(0,90);
  const go=$('leaveContinue');
  if(!safe){
    $('leaveName').textContent='链接无效或格式不受支持';
    $('leaveHost').textContent='仅允许 http 或 https 链接，且不能在网址中包含用户名或密码。';
    $('leaveStatus').textContent='此链接已被拒绝，不能继续访问。';
    return;
  }
  $('leaveName').textContent=name||safe.hostname;
  $('leaveHost').textContent='目标域名：'+safe.hostname;
  $('leaveFullUrl').textContent=safe.href;
  $('leaveStatus').textContent='仅允许手动确认后离站；本站不保证外部服务的安全性。';
  go.disabled=false;
  go.addEventListener('click',()=>{
    const vetted=window.AVENQIR_LINK_GATE?.sanitize(safe.href);
    if(vetted&&vetted.href===safe.href)location.assign(vetted.href);
  });
})();