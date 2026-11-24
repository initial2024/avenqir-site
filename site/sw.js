"use strict";
/* AVENQIR v9.4 offline shell. No private documents, PHP, or API records cached. */
const CACHE = 'avenqir-v117-static-20261124-institutional-source-review';
const ASSETS = [
  './index.html','./appearance.html','./directory.html','./directory.js','./directory-search-actions.js','./atlas-paths.js','./atlas-expansion.js','./atlas-specialist.js','./atlas-depth-a.js','./atlas-depth-b.js','./atlas-depth-c.js','./atlas-depth-d.js','./atlas-ai.js','./atlas-regional.js','./atlas-everyday.js','./atlas-regional-ext.js','./atlas-everyday-ext.js','./atlas-taxonomy.js','./atlas-region.js','./atlas-region-ui.js','./atlas-catalog-core.js','./atlas-threat-snapshot.js','./atlas-registry-snapshot.js','./atlas-safety.js','./atlas-guides.js','./atlas-find.js','./atlas-enrich.js','./aq-i18n.js','./aq-copy.js','./orbit-bridge.js','./orbit-bridge.html','./atlas-summary.js','./atlas-personalize.js','./atlas-personalize-ui.js','./directory-search.css','./directory-seed.json','./leave.html','./leave.js',
  './module-switcher.js','./quick-search.js','./site.js','./common.css','./theme.js','./theme.css','./link-gate.js',
  './bookmarks.html','./bookmarks.js','./netscape-format.js','./notes.html','./notes.js','./notes-enhance.js',
  './transfer.html','./transfer-schema.js','./device-transfer.js','./feedback-pref.js',
  './fun.html','./fun.js','./daily.html','./daily.js','./check.html','./check.js',
  './tools.html','./tools.js','./tool-addons.js',
  './projects.html','./projects.js','./domains.html','./domains.js','./logs.html','./logs.js',
  './health.html','./health.js','./disclaimer.html','./privacy.html',
  './hero-lake.webp','./icon.svg','./manifest.webmanifest'
];
function isChallenge(text) {
  return text.includes('slowAES.decrypt') && text.includes('/aes.js');
}
async function safeCache(cache, request, response) {
  if(!response.ok || response.type === 'opaque')return;
  const path=new URL(request.url).pathname;
  const isHTML=path.endsWith('.html')||path.endsWith('/');
  const isScriptOrStyle=/\.(?:js|css)$/.test(path);
  if(isHTML||isScriptOrStyle){
    const text=await response.clone().text();
    if(isChallenge(text))return;
    if(isScriptOrStyle&&/^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(text))return;
  }
  await cache.put(request,response.clone());
}
self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // One failed resource should not erase all other cached tools.
    await Promise.allSettled(ASSETS.map(async path=>{
      try{
        const request=new Request(new URL(path,self.registration.scope),{cache:'reload'});
        const response=await fetch(request);
        await safeCache(cache,request,response);
      }catch{}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('avenqir-v')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request, u=new URL(req.url);
  if(req.method!=='GET' || u.origin!==self.location.origin ||
     u.pathname.endsWith('.php') || u.pathname.endsWith('/remote-workspace.html') || u.pathname.includes('/_private/') ||
     u.pathname.includes('/_store/') || u.pathname.includes('/admin') ||
     u.pathname.endsWith('/probe.txt') || u.searchParams.has('check'))return;
  const html=req.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/');
  const asset=/\.(?:js|css|svg|webp|webmanifest|json)$/.test(u.pathname);
  if(!html&&!asset)return;
  const offline=async()=>{
    const cache=await caches.open(CACHE);
    const plain=new URL(req.url);plain.search='';
    return (await cache.match(req))||(await cache.match(plain.href))||Response.error();
  };
  event.respondWith((async()=>{
    try {
      const response=await fetch(new Request(req,{cache:'no-cache'}));
      const scriptOrStyle=/\.(?:js|css)$/.test(u.pathname);
      if(response.ok&&(html||scriptOrStyle)){
        const text=await response.clone().text();
        const challenge=isChallenge(text)||(scriptOrStyle&&/^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(text));
        if(challenge)return offline();
      }
      if(response.ok){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(c=>safeCache(c,req,copy)).catch(()=>{}));
      }
      return response;
    }catch{return offline();}
  })());
});
