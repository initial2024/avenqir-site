'use strict';
/* Register offline shell after page load. Offline is best-effort only. */
if('serviceWorker' in navigator && location.protocol==='https:') {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

/* v7 responsive navigation, no background network polling. */
(()=>{const b=document.querySelector('.menu-toggle');const nav=document.getElementById('global-nav');if(!b||!nav)return;const close=()=>{nav.classList.remove('is-open');b.setAttribute('aria-expanded','false')};b.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');b.setAttribute('aria-expanded',String(open))});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});document.addEventListener('click',e=>{if(!b.contains(e.target)&&!nav.contains(e.target))close()});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));})();
