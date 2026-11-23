"use strict";
/* Curated destination provenance. This is NOT antivirus scanning or safety certification.
   Exact original HTTPS addresses only; a different path/query/domain never inherits trust.
   Never accept security decisions from user-generated labels or admin data fields. */
(function(root){
  const OFFICIAL_URLS = [
    'https://github.com/',
    'https://developer.mozilla.org/zh-CN/',
    'https://caniuse.com/',
    'https://www.gutenberg.org/',
    'https://www.openstreetmap.org/',
    'https://commons.wikimedia.org/',
    'https://www.khanacademy.org/',
    'https://ocw.mit.edu/',
    'https://scholar.google.com/',
    'https://arxiv.org/',
    'https://images.nasa.gov/',
    'https://webbook.nist.gov/chemistry/',
    'https://radar.cloudflare.com/',
    'https://www.geogebra.org/',
    'https://phet.colorado.edu/',
    'https://www.desmos.com/calculator',
    'https://zbib.org/',
    'https://search.crossref.org/',
    'https://ourworldindata.org/',
    'https://science.nasa.gov/eyes/',
    'https://www.nasa.gov/interactives/',
    'https://stellarium-web.org/',
    'https://gchq.github.io/CyberChef/',
    'https://wave.webaim.org/',
    'https://internet.nl/',
    'https://safebrowsing.google.com/',
    'https://pagespeed.web.dev/',
    'https://web.dev/',
    'https://pubmed.ncbi.nlm.nih.gov/',
    'https://www.wikidata.org/',
    'https://fonts.google.com/',
    'https://www.blender.org/',
    'https://www.gimp.org/',
    'https://inkscape.org/',
    'https://openverse.org/'
  ];
  function sanitize(raw){
    if(typeof raw!=='string'||raw.length>1800)return null;
    try{
      const url = new URL(raw);
      if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password)return null;
      return url;
    }catch{return null;}
  }
  const verified = new Set(OFFICIAL_URLS.map(x=>new URL(x).href));
  function officialSourceReviewed(raw){
    const url=sanitize(raw);
    return !!url&&url.protocol==='https:'&&verified.has(url.href);
  }
  function searchEngineDestination(engine,query){
    const value=String(query??'').trim().slice(0,300);
    const bases={
      google:'https://www.google.com/search?q=',
      bing:'https://www.bing.com/search?q=',
      duck:'https://duckduckgo.com/?q='
    };
    if(!Object.prototype.hasOwnProperty.call(bases,engine))return null;
    if(!value){
      return {google:'https://www.google.com/',bing:'https://www.bing.com/',duck:'https://duckduckgo.com/'}[engine];
    }
    return bases[engine]+encodeURIComponent(value);
  }

  // A remembered preference is never a security certificate or a malicious-URL verdict.
  // Scope is the EXACT HTTPS URL without query or fragment, valid for 30 days.
  const APPROVAL_KEY='avenqir-external-approvals-v1';
  const APPROVAL_LIFETIME=30*24*60*60*1000;
  const APPROVAL_LIMIT=100;
  function urlRisk(raw){
    const u=sanitize(raw);
    if(!u)return {blocked:true,forcePrompt:true,rememberable:false,reason:'危险协议、无效地址或网址含账号密码'};
    const host=u.hostname.toLowerCase();
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||
       host.endsWith('.internal')||host.endsWith('.test')||
       host==='0.0.0.0'||host==='127.0.0.1'||host==='[::1]'||
       host==='169.254.169.254')return {blocked:true,forcePrompt:true,rememberable:false,reason:'本地或内部网络地址已拒绝'};
    const ipv4=host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if(ipv4){
      const a=ipv4.slice(1).map(Number);
      if(a.some(x=>x>255)||a[0]===10||a[0]===127||a[0]===0||
         (a[0]===172&&a[1]>=16&&a[1]<=31)||
         (a[0]===192&&a[1]===168)||(a[0]===169&&a[1]===254))return {blocked:true,forcePrompt:true,rememberable:false,reason:'私有或不可路由地址已拒绝'};
    }
    const highRisk=u.protocol!=='https:'||host.includes('xn--')||!!ipv4||
      (u.port&&u.port!=='443')||!!u.search||!!u.hash||u.href.length>1024;
    return {blocked:false,forcePrompt:highRisk,rememberable:!highRisk,reason:highRisk?'此地址不支持记住跳转确认':''};
  }
  function readApprovals(storage){
    try{
      const value=JSON.parse(storage.getItem(APPROVAL_KEY)||'null');
      if(!value||value.version!==1||!Array.isArray(value.items))return [];
      const now=Date.now();
      return value.items.filter(x=>x&&typeof x.url==='string'&&
        Number.isFinite(x.expires)&&x.expires>now&&x.expires<=now+APPROVAL_LIFETIME&&
        urlRisk(x.url).rememberable).slice(-APPROVAL_LIMIT);
    }catch{return [];}
  }
  function isRemembered(raw,storage){
    const u=sanitize(raw),risk=urlRisk(raw);
    if(!u||risk.blocked||risk.forcePrompt||!storage)return false;
    return readApprovals(storage).some(x=>x.url===u.href);
  }
  function remember(raw,storage){
    const u=sanitize(raw),risk=urlRisk(raw);
    if(!u||!risk.rememberable||!storage)return false;
    try{
      const items=readApprovals(storage).filter(x=>x.url!==u.href);
      items.push({url:u.href,expires:Date.now()+APPROVAL_LIFETIME});
      storage.setItem(APPROVAL_KEY,JSON.stringify({version:1,items:items.slice(-APPROVAL_LIMIT)}));
      return true;
    }catch{return false;}
  }
  function clearRemembered(storage){
    try{storage?.removeItem(APPROVAL_KEY);return true;}catch{return false;}
  }
  function approvalCount(storage){return storage?readApprovals(storage).length:0;}
  function maySkipConfirmation(raw,storage){
    return !urlRisk(raw).blocked&&
      (officialSourceReviewed(raw)||isRemembered(raw,storage));
  }
  const api=Object.freeze({sanitize,officialSourceReviewed,searchEngineDestination,urlRisk,isRemembered,remember,clearRemembered,approvalCount,maySkipConfirmation,APPROVAL_LIFETIME,OFFICIAL_URLS:Object.freeze(OFFICIAL_URLS.slice())});
  root.AVENQIR_LINK_GATE=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
