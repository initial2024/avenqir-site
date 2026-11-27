"use strict";
/* AVENQIR v9.4 offline shell. No private documents, PHP, or API records cached. */
const CACHE = 'avenqir-v146-static-20261127-release';
const ASSETS = [
  './index.html','./appearance.html','./directory.html','./directory.js','./directory-search-actions.js','./atlas-paths.js','./atlas-expansion.js','./atlas-specialist.js','./atlas-depth-a.js','./atlas-depth-b.js','./atlas-depth-c.js','./atlas-depth-d.js','./atlas-ai.js','./atlas-regional.js','./atlas-everyday.js','./atlas-regional-ext.js','./atlas-everyday-ext.js','./atlas-taxonomy.js','./atlas-tags.js','./atlas-region.js','./atlas-region-ui.js','./atlas-popular-links.js','./atlas-popular-picks.js','./atlas-popular.js','./atlas-popular-ui.js','./atlas-popular.css','./atlas-source-ui.js','./atlas-source-ui.css','./atlas-catalog-core.js','./atlas-threat-snapshot.js','./atlas-registry-snapshot.js','./atlas-safety.js','./atlas-guides.js','./atlas-find.js','./atlas-enrich.js','./aq-i18n.js','./aq-copy.js','./orbit-bridge.js','./orbit-bridge.html','./atlas-summary.js','./atlas-personalize.js','./atlas-personalize-ui.js','./directory-search.css','./directory-seed.json','./leave.html','./leave.js',
  './module-switcher.js','./module-picker.css','./quick-search.js','./start-page.js','./start-page.css','./local-organize.js','./recommendations.html','./recommendations.css','./recommendations-catalog.json','./recommendations-model.js','./recommendations.js','./site.js','./traffic.js','./common.css','./theme.js','./theme.css','./link-gate.js',
  './bookmarks.html','./bookmarks.js','./netscape-format.js','./notes.html','./notes.js','./notes-enhance.js',
  './transfer.html','./transfer-schema.js','./device-transfer.js','./feedback-pref.js',
  './fun.html','./fun.js','./daily.html','./daily.js','./check.html','./check.js',
  './tools.html','./tools.js','./tool-addons.js',
  './projects.html','./projects.js','./domains.html','./domains.js','./logs.html','./logs.js',
  './health.html','./health.js','./disclaimer.html','./privacy.html',
  './hero-lake.webp','./icon.svg','./manifest.webmanifest'
];
const allowed=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
const critical=['index.html','directory.html','directory.js','atlas-catalog-core.js','atlas-tags.js','atlas-popular.js','atlas-popular-picks.js','atlas-source-ui.js','recommendations-model.js','recommendations.js','link-gate.js','atlas-safety.js','atlas-threat-snapshot.js','local-organize.js','bookmarks.html','bookmarks.js','common.css','directory-search.css','start-page.js','start-page.css'];
function isChallenge(text) {return text.includes('slowAES.decrypt')&&text.includes('/aes.js');}
function canonical(url){
  const plain=new URL(url);plain.search='';plain.hash='';
  if(plain.href===self.registration.scope)plain.pathname+='index.html';
  return allowed.has(plain.href)?plain.href:null;
}
async function responseValid(path,response){
  if(!response.ok||response.type==='opaque')return false;
  if(/\.(?:html|js|css|json)$/.test(path)){
    const text=await response.clone().text();
    if(isChallenge(text))return false;
    if(/\.(?:js|css|json)$/.test(path)&&/^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(text))return false;
    if(path.endsWith('.json')){try{JSON.parse(text);}catch{return false;}}
  }
  return true;
}
async function safeCache(cache,key,response){
  if(!key||!await responseValid(new URL(key).pathname,response))return false;
  await cache.put(key,response.clone());return true;
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const outcomes=await Promise.all(ASSETS.map(async path=>{
      try{const key=new URL(path,self.registration.scope).href;const response=await fetch(new Request(key,{cache:'reload'}));return await safeCache(cache,key,response);}catch{return false;}
    }));
    // An incomplete upgrade must not discard a working older offline shell.
    if(critical.some(name=>!outcomes[ASSETS.indexOf('./'+name)])){await caches.delete(CACHE);throw Error('Offline core incomplete');}
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
  const req=event.request,u=new URL(req.url);
  if(req.method!=='GET'||u.origin!==self.location.origin||u.searchParams.has('check')||u.pathname.endsWith('.php')||u.pathname.endsWith('/remote-workspace.html')||u.pathname.includes('/_private/')||u.pathname.includes('/_store/')||u.pathname.includes('/admin')||u.pathname.endsWith('/probe.txt'))return;
  const key=canonical(req.url);if(!key)return;
  const html=key.endsWith('.html');
  const cached=async()=>{const cache=await caches.open(CACHE);return await cache.match(key);};
  const unavailable=()=>html?new Response('AVENQIR offline: this page has not been cached. Reconnect and retry.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}):Response.error();
  event.respondWith((async()=>{
    try{
      const response=await fetch(new Request(req,{cache:'no-cache'}));
      if(await responseValid(new URL(key).pathname,response)){
        const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>safeCache(c,key,copy)).catch(()=>{}));return response;
      }
      if(response.ok||response.status>=500){
        const old=await cached();if(old)return old;
        // On a cold HTML navigation let the host present its legitimate challenge.
        return html?response:unavailable();
      }
      return response;
    }catch{return await cached()||unavailable();}
  })());
});
