'use strict';
/* Retired feature: clear only the obsolete remote-browser address, never other local settings. */
try { localStorage.removeItem('avenqir.remote-access-url.v1'); } catch (_) {}
/* Register offline shell after page load. Offline is best-effort only. */
if('serviceWorker' in navigator && location.protocol==='https:') {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=25',{updateViaCache:'none'}).catch(()=>{}));
}

/* v7 responsive navigation, no background network polling. */
(()=>{const b=document.querySelector('.menu-toggle');const nav=document.getElementById('global-nav');if(!b||!nav)return;const close=()=>{nav.classList.remove('is-open');b.setAttribute('aria-expanded','false')};b.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');b.setAttribute('aria-expanded',String(open))});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});document.addEventListener('click',e=>{if(!b.contains(e.target)&&!nav.contains(e.target))close()});if(!nav.querySelector('a[href="orbit-bridge.html"]')){
 const a=document.createElement('a');a.href='orbit-bridge.html';a.textContent='Orbit Hub';a.className=location.pathname.endsWith('orbit-bridge.html')?'active':'';
 a.addEventListener('click',close);nav.append(a);
 }nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));})();


/* Load the 40-locale browser-only UI on every page; no remote translation endpoint. */
(()=>{
 if(document.querySelector('script[data-aq-i18n]'))return;
 const script=document.createElement('script');script.src='./aq-i18n.js?v=25';
 script.dataset.aqI18n='1';
 script.addEventListener('load',()=>{
   if(document.querySelector('script[data-aq-copy]'))return;
   const copy=document.createElement('script');copy.src='./aq-copy.js?v=130';
   copy.dataset.aqCopy='1';document.head.append(copy);
 });
 document.head.append(script);
})();

/* Load the compact, local-only feature finder on all pages using site.js. */
(() => {
  if (document.querySelector('script[data-aq-search]')) return;
  const script=document.createElement('script');
  script.src='./quick-search.js?v=131';
  script.dataset.aqSearch='1';
  document.head.append(script);
})();


