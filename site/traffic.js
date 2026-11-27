"use strict";
(()=>{
  const key='avenqir.traffic.consent.v1';
  const pages={'':'home','index.html':'home','directory.html':'directory','recommendations.html':'recommendations','bookmarks.html':'bookmarks','notes.html':'notes','fun.html':'fun','daily.html':'daily','tools.html':'tools','check.html':'check','transfer.html':'transfer','appearance.html':'appearance','privacy.html':'privacy','health.html':'other','projects.html':'other','domains.html':'other','logs.html':'other','orbit-bridge.html':'other','disclaimer.html':'other'};
  const leaf=location.pathname.split('/').pop();
  if(!Object.hasOwn(pages,leaf)||location.origin!=='https://avenqir.bg5.net')return;
  const read=()=>{try{return localStorage.getItem(key)==='1';}catch{return false;}};
  const privacySignal=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
  const source=()=>{
    if(!document.referrer)return 'direct';
    try{
      const u=new URL(document.referrer),h=u.hostname.toLowerCase();
      if(u.origin===location.origin)return 'internal';
      const match=base=>h===base||h.endsWith('.'+base);
      if(match('xiaohongshu.com')||match('xhslink.com'))return 'xiaohongshu';
      if(['google.com','google.co.jp','bing.com','baidu.com','duckduckgo.com','yahoo.com'].some(match))return 'search';
      if(['weibo.com','reddit.com','facebook.com','instagram.com','x.com','twitter.com','tiktok.com','zhihu.com'].some(match))return 'social';
      return 'other';
    }catch{return 'direct';}
  };
  let sent=false;
  function record(){
    if(sent||!read()||privacySignal()||document.visibilityState!=='visible')return;
    sent=true;
    fetch('traffic-api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page:pages[leaf],source:source()}),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true}).catch(()=>{});
  }
  const control=document.getElementById('aqTrafficConsent');
  const status=document.getElementById('aqTrafficConsentStatus');
  if(control){
    control.checked=read()&&!privacySignal();
    control.disabled=privacySignal();
    if(privacySignal()&&status)status.textContent='浏览器隐私信号已启用，不参与访问统计。';
    control.addEventListener('change',()=>{
      try{if(control.checked)localStorage.setItem(key,'1');else localStorage.removeItem(key);}
      catch{control.checked=false;if(status)status.textContent='无法保存本机设置。';return;}
      if(status)status.textContent=control.checked?'已选择参与匿名汇总。':'已关闭访问统计参与。';
      record();
    });
  }
  document.addEventListener('visibilitychange',record);
  record();
})();
