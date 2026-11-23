"use strict";
/* AVENQIR Atlas safety status: deterministic local screening only.
   No malware scan, Safe Browsing API, third-party call or blanket "certified safe" label. */
(function(root){
 const gate=root.AVENQIR_LINK_GATE||(typeof require==='function'?require('./link-gate.js'):null);
 const TYPES=Object.freeze({blocked:'blocked',caution:'caution',reviewed:'reviewed',pending:'pending'});
 function inspect(raw){
  const risk=gate?.urlRisk(raw);
  if(!risk||risk.blocked)return {type:TYPES.blocked,label:'结构不合规 · 已拦截',reason:risk?.reason||'无效网址'};
  if(risk.forcePrompt)return {type:TYPES.caution,label:'存在风险特征 · 强制确认',reason:risk.reason||'非标准网址结构'};
  if(gate.officialSourceReviewed(raw))return {type:TYPES.reviewed,label:'官方来源地址已核对 · 非安全认证',reason:'仅精确网址来源登记；未进行实时恶意软件或服务安全评估'};
  return {type:TYPES.pending,label:'结构检查通过 · 来源待核对',reason:'HTTPS 与合法网址结构不代表网站安全、可信或持续在线'};
 }
 function summary(items){
  const result={total:0,blocked:0,caution:0,reviewed:0,pending:0};
  if(!Array.isArray(items))return result;
  const seen=new Set();
  for(const item of items){
   const url=typeof item==='string'?item:item?.url;
   if(typeof url!=='string'||seen.has(url))continue;
   seen.add(url);result.total++;
   result[inspect(url).type]++;
  }
  return result;
 }
 // Only a deliberate user click opens this provider URL and discloses the URL.
 // Do not include queries/fragments/tokens in third-party reputation lookups.
 function googleStatusLink(raw){
  const risk=gate?.urlRisk(raw),u=gate?.sanitize(raw);
  if(!risk||risk.blocked||!u||u.protocol!=='https:'||u.search||u.hash)return null;
  return 'https://transparencyreport.google.com/safe-browsing/search?url='+encodeURIComponent(u.href);
 }
 const api=Object.freeze({TYPES,inspect,summary,googleStatusLink});
 root.AVENQIR_ATLAS_SAFETY=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
