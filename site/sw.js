/* AVENQIR v7: best effort offline, do not cache admin, API, config or data. */
const CACHE='avenqir-v81-static-20261123';
const ASSETS=['./','./index.html','./directory.html','./directory.js','./directory-search.css','./module-switcher.js','./bookmarks.html','./bookmarks.js','./notes.html','./notes.js','./fun.html','./fun.js','./daily.html','./daily.js','./check.html','./check.js','./tools.html','./tools.js','./projects.html','./projects.js','./domains.html','./domains.js','./logs.html','./logs.js','./health.html','./health.js','./disclaimer.html','./privacy.html','./common.css','./site.js','./hero-lake.webp','./icon.svg','./manifest.webmanifest','./feedback.css','./feedback-admin.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('avenqir-v')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request, u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==self.location.origin||u.pathname.endsWith('.php')||u.pathname.includes('/_store/')||u.pathname.includes('/admin')||u.pathname.endsWith('/probe.txt')||u.searchParams.has('check'))return;
 const html=r.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/');
 const asset=/\.(?:js|css|svg|webp|webmanifest)$/.test(u.pathname);
 if(!html&&!asset)return;
 e.respondWith(fetch(r).then(resp=>{if(resp.ok){const copy=resp.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});}return resp;}).catch(()=>caches.match(r).then(x=>x||Response.error())));
});
