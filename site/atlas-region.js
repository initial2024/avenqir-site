"use strict";
/* AVENQIR region suggestions: all inference and ranking happen in-browser. NO IP lookup.
 * Browser time zone is not the same as public network country or real residence. */
(function(root){
 const KEY='avenqir.atlas.region.v1';
 const regions=Object.freeze([
  {code:'JP',label:'日本'}, {code:'CN',label:'中国大陆'}, {code:'SG',label:'新加坡'},
  {code:'US',label:'美国'}, {code:'GB',label:'英国'}, {code:'DE',label:'德国'},
  {code:'FR',label:'法国'}, {code:'KR',label:'韩国'}, {code:'CA',label:'加拿大'},
  {code:'AU',label:'澳大利亚'}, {code:'IN',label:'印度'}, {code:'ES',label:'西班牙'}
 ]);
 const codes=new Set(regions.map(x=>x.code));
 // A deliberately conservative, non-exhaustive *hint*. Time zone ≠ IP geolocation.
 const zones=Object.freeze({
  'Asia/Tokyo':'JP','Asia/Shanghai':'CN','Asia/Chongqing':'CN',
  'Asia/Singapore':'SG','Europe/London':'GB','Europe/Berlin':'DE',
  'Europe/Paris':'FR','Asia/Seoul':'KR','Asia/Kolkata':'IN',
  'Europe/Madrid':'ES','Australia/Sydney':'AU','Australia/Melbourne':'AU',
  'America/Los_Angeles':'US','America/Chicago':'US',
  'America/Toronto':'CA','America/Vancouver':'CA'
 });
 function hint(timeZone){
  return typeof timeZone==='string'&&Object.prototype.hasOwnProperty.call(zones,timeZone)?zones[timeZone]:null;
 }
 function clean(data){
  if(!data||data.v!==1||data.enabled!==true||!['auto','manual'].includes(data.mode))return {v:1,enabled:false,mode:'auto',code:null};
  const code=typeof data.code==='string'&&codes.has(data.code)?data.code:null;
  return {v:1,enabled:true,mode:data.mode,code:data.mode==='manual'?code:null};
 }
 function create(storage,timezone){
  const timeZone=()=>{try{return String(typeof timezone==='function'?timezone():timezone||'');}catch{return '';}};
  function read(){
   if(!storage)return clean(null);
   try{return clean(JSON.parse(storage.getItem(KEY)||'null'));}catch{return clean(null);}
  }
  function write(data){
   if(!storage)return false;
   try{storage.setItem(KEY,JSON.stringify(clean(data)));return true;}catch{return false;}
  }
  function enable(){
   const old=read();return write({v:1,enabled:true,mode:old.mode,code:old.code});
  }
  function disable(){try{storage?.removeItem(KEY);}catch{}return false;}
  function choose(code){
   if(!read().enabled||!codes.has(code))return false;
   return write({v:1,enabled:true,mode:'manual',code});
  }
  function useAutomatic(){
   if(!read().enabled)return false;
   return write({v:1,enabled:true,mode:'auto',code:null});
  }
  function selection(){
   const s=read();
   if(!s.enabled)return {enabled:false,code:null,source:'disabled'};
   if(s.mode==='manual')return {enabled:true,code:s.code,source:s.code?'manual':'unknown'};
   const code=hint(timeZone());return {enabled:true,code,source:code?'timezone':'unknown'};
  }
  function recommend(items,excluded=[],max=6,clock=Date.now){
   const {enabled,code,source}=selection();
   if(!enabled||!code||!Array.isArray(items))return [];
   const exclude=new Set(excluded);
   const day=Math.floor(clock()/86400000);
   function hash(s){let n=2166136261;for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619);}return n>>>0;}
   const seen=new Set(),arr=[];
   for(const item of items){
     if(!item||item.region!==code||typeof item.url!=='string'||exclude.has(item.url)||seen.has(item.url))continue;
     seen.add(item.url);arr.push(item);
   }
   // Editorial grouping only: "everyday" means a common service type, NOT measured popularity.
   // Present an intentional mix of everyday services and public reference sources.
   const limit=Math.min(12,Math.max(1,Number.isInteger(max)?max:8));
   function dailyOrder(a,b){return hash(a.url+'|'+day)-hash(b.url+'|'+day);}
   const daily=arr.filter(x=>x.localUse==='everyday').sort(dailyOrder);
   const publicLinks=arr.filter(x=>x.localUse!=='everyday').sort(dailyOrder);
   const chosen=[],seenUrls=new Set();
   function pick(x){if(chosen.length>=limit||seenUrls.has(x.url))return;chosen.push(x);seenUrls.add(x.url);}
   // Put practical local services first, without burying reference sites.
   for(const item of daily.slice(0,Math.min(4,limit)))pick(item);
   const seenCategories=new Set(chosen.map(x=>x.category));
   for(const item of publicLinks){if(chosen.length>=limit)break;if(!seenCategories.has(item.category)){pick(item);seenCategories.add(item.category);}}
   for(const item of publicLinks){if(chosen.length>=limit)break;pick(item);}
   for(const item of daily){if(chosen.length>=limit)break;pick(item);}
   return chosen.map(item=>({
     item,source,kind:item.localUse==='everyday'?'生活常用':'公共资讯',
     reason:source==='manual'?'按手动选择的地区推荐':'浏览器时区建议（不是 IP 定位）'
   }));
  }
  return Object.freeze({read,enable,disable,choose,useAutomatic,selection,recommend});
 }
 const api=Object.freeze({KEY,regions,hint,clean,create});
 root.AVENQIR_ATLAS_REGION=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
