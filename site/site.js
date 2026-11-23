'use strict';
/* Register offline shell after page load. Offline is best-effort only. */
if('serviceWorker' in navigator && location.protocol==='https:') {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=20',{updateViaCache:'none'}).catch(()=>{}));
}

/* v7 responsive navigation, no background network polling. */
(()=>{const b=document.querySelector('.menu-toggle');const nav=document.getElementById('global-nav');if(!b||!nav)return;const close=()=>{nav.classList.remove('is-open');b.setAttribute('aria-expanded','false')};b.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');b.setAttribute('aria-expanded',String(open))});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});document.addEventListener('click',e=>{if(!b.contains(e.target)&&!nav.contains(e.target))close()});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));})();


/* Load the compact, local-only feature finder on all pages using site.js. */
(() => {
  if (document.querySelector('script[data-aq-search]')) return;
  const script=document.createElement('script');
  script.src='./quick-search.js?v=15';
  script.dataset.aqSearch='1';
  document.head.append(script);
})();


