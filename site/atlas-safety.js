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
 const snap=root.AVENQIR_THREAT_SNAPSHOT;
 const snapValid=!!snap&&snap.schema==='aq-certpl-v1'&&snap.source==='https://hole.cert.pl/domains/v2/domains.txt'&&typeof snap.checkedAt==='string'&&Array.isArray(snap.hosts)&&Array.isArray(snap.listed)&&snap.hosts.length<=10000&&snap.listed.length<=snap.hosts.length;
 const checked=new Set(snapValid?snap.hosts:[]),listed=new Set(snapValid?snap.listed:[]);
 function threatStatus(raw,now=Date.now()){
  const u=gate?.sanitize(raw),ts=snapValid?Date.parse(snap.checkedAt):NaN;
  if(!u||!Number.isFinite(ts)||ts>now+300000)return 'unknown';
  const host=u.hostname.toLowerCase().replace(/\.$/,'');
  // Expired negative results become unknown; known hits stay blocked until refreshed.
  if(listed.has(host))return 'listed';
  if(now-ts>24*3600000||!checked.has(host))return 'unknown';
  return 'not-listed';
 }
 function threatSummary(items,now=Date.now()){
  const out={checked:0,listed:0,unknown:0,checkedAt:snapValid?snap.checkedAt:null,stale:!snapValid||!Number.isFinite(Date.parse(snap.checkedAt))||Date.parse(snap.checkedAt)>now+300000||now-Date.parse(snap.checkedAt)>24*3600000};
  const seen=new Set();
  for(const item of items||[]){if(!item?.url||seen.has(item.url))continue;seen.add(item.url);const v=threatStatus(item.url,now);if(v==='unknown')out.unknown++;else{out.checked++;if(v==='listed')out.listed++}}
  return out;
 }
 const api=Object.freeze({TYPES,inspect,summary,googleStatusLink,threatStatus,threatSummary});
 root.AVENQIR_ATLAS_SAFETY=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
