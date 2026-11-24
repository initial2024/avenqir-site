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
    'https://jupyter.org/try',
    'https://zenodo.org/',
    'https://squoosh.app/',
    'https://lookup.icann.org/',
    'https://www.iana.org/',
    'https://www.rfc-editor.org/',
    'https://www.w3.org/',
    'https://dns.google/',
    'https://obsproject.com/',
    'https://www.libreoffice.org/',
    'https://standardebooks.org/',
    'https://creativecommons.org/',
    'https://docs.github.com/',
    'https://owasp.org/',
    'https://openverse.org/',
    // Source-domain checks on 2026-11-23; this does NOT establish website safety.
    'https://www.who.int/',
    'https://www.cdc.gov/',
    'https://pubchem.ncbi.nlm.nih.gov/',
    'https://www.icann.org/',
    'https://www.ietf.org/standards/',
    'https://www.gov.uk/',
    'https://www.wto.org/',
    // Official-source search results checked 2026-11-24; not malware verdicts.
    'https://developer.android.com/identity/sign-in/credential-manager-faq',
    'https://developer.android.com/identity/sign-in/credential-provider',
    'https://developer.android.com/identity/sign-in/restore-credentials-implementation',
    'https://docs.python.org/3/',
    'https://docs.python.org/3/tutorial/',
    'https://docs.python.org/3/howto/',
    'https://docs.python.org/3/faq/general.html',
    'https://csrc.nist.gov/Publications',
    'https://datatracker.ietf.org/',
    'https://www.ietf.org/process/publication/',
    'https://support.datacite.org/docs/datacite-commons',
    'https://openlearning.mit.edu/courses-programs/mit-opencourseware',
    'https://www.unesco.org/en/scamalert'
  ];
  function sanitize(raw){
    if(typeof raw!=='string'||raw.length>1800||/[\u0000-\u0020\u007f\\]/.test(raw))return null;
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
  // Deterministic URL structure screening; not a malware, reputation or TLS certificate scan.
  const OPAQUE_REDIRECTORS=new Set(['bit.ly','tinyurl.com','t.co','is.gd','cutt.ly','rb.gy','shorturl.at']);
  const BLOCKED_NAME_SUFFIX=['.localhost','.local','.internal','.test','.invalid','.example'];
  function nonPublicIpv4(a){
    return a[0]===0||a[0]===10||a[0]===127||a[0]>=224||
      (a[0]===100&&a[1]>=64&&a[1]<=127)||
      (a[0]===169&&a[1]===254)||
      (a[0]===172&&a[1]>=16&&a[1]<=31)||
      (a[0]===192&&(a[1]===0||a[1]===168||a[1]===88&&a[2]===99))||
      (a[0]===198&&(a[1]===18||a[1]===19||a[1]===51&&a[2]===100))||
      (a[0]===203&&a[1]===0&&a[2]===113);
  }
  function nonPublicIpv6(v){
    const addr=v.toLowerCase();
    const prefix=addr.slice(0,3);
    return addr==='::'||addr==='::1'||addr.startsWith('::ffff:')||
      addr.startsWith('fc')||addr.startsWith('fd')||
      ['fe8','fe9','fea','feb'].includes(prefix)||
      addr.startsWith('ff')||addr.startsWith('2001:db8:')||
      addr==='2001:db8::';
  }
  function urlRisk(raw){
    const u=sanitize(raw);
    if(!u)return {blocked:true,forcePrompt:true,rememberable:false,reason:'危险协议、无效地址、空白反斜杠或网址含账号密码'};
    const host=u.hostname.toLowerCase();
    const naked=host.endsWith('.')?host.slice(0,-1):host;
    if(naked==='localhost'||naked==='localhost.localdomain'||naked==='0.0.0.0'||
       BLOCKED_NAME_SUFFIX.some(x=>naked.endsWith(x))||
       naked==='169.254.169.254'||!naked.includes('.')) {
      // IPv6 literals are treated separately (their bracket form contains colons).
      if(!naked.startsWith('['))return {blocked:true,forcePrompt:true,rememberable:false,reason:'本地、内部或保留的网络主机已拒绝'};
    }
    const ipv4=naked.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if(ipv4){
      const a=ipv4.slice(1).map(Number);
      if(a.some(v=>v>255)||nonPublicIpv4(a))return {blocked:true,forcePrompt:true,rememberable:false,reason:'私有、共享、文档测试或其他非公网 IPv4 地址已拒绝'};
    }
    const ipv6=naked.startsWith('[')&&naked.endsWith(']');
    if(ipv6&&nonPublicIpv6(naked.slice(1,-1)))return {blocked:true,forcePrompt:true,rememberable:false,reason:'本地、映射或非公网 IPv6 地址已拒绝'};
    const redirector=OPAQUE_REDIRECTORS.has(naked);
    const highRisk=u.protocol!=='https:'||naked.includes('xn--')||!!ipv4||ipv6||
      redirector||naked.endsWith('.zip')||naked.endsWith('.mov')||
      (u.port&&u.port!=='443')||!!u.search||!!u.hash||u.href.length>1024;
    return {blocked:false,forcePrompt:highRisk,rememberable:!highRisk,reason:highRisk?
      '需要额外核对：短链接、IP 字面地址、特殊域名、HTTP、端口或参数不支持记住跳转':'来源需另行核对；结构检查不等于安全认证'};
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
    const risk=urlRisk(raw);
    return !risk.blocked&&!risk.forcePrompt&&
      (officialSourceReviewed(raw)||isRemembered(raw,storage));
  }
  const api=Object.freeze({sanitize,officialSourceReviewed,searchEngineDestination,urlRisk,isRemembered,remember,clearRemembered,approvalCount,maySkipConfirmation,APPROVAL_LIFETIME,OFFICIAL_URLS:Object.freeze(OFFICIAL_URLS.slice())});
  root.AVENQIR_LINK_GATE=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
