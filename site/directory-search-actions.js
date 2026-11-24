"use strict";
(function(root){
 const KEY='avenqir.feedback.query.once.v1';
 function engineURL(engine,query,gate){
   if(!['google','bing','duck'].includes(engine))return null;
   return gate?.searchEngineDestination(engine,String(query||'').trim().slice(0,140))||null;
 }
 function recommendationURL(query,win){
   const q=String(query||'').trim().slice(0,80);
   if(!q)return 'feedback.php?type=link';
   // Prefer ephemeral session storage. Explicit fallback is needed when storage is blocked.
   try{win.sessionStorage.setItem(KEY,q);if(win.sessionStorage.getItem(KEY)===q)return 'feedback.php?type=link';}catch{}
   return 'feedback.php?type=link&q='+encodeURIComponent(q);
 }
 const api=Object.freeze({engineURL,recommendationURL});
 root.AVENQIR_SEARCH_ACTIONS=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
