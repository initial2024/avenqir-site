"use strict";
(()=>{
const nav=document.querySelector('.module-picker[data-picker]');if(!nav)return;
const buttons=[...nav.querySelectorAll('button[data-target]')];
const activeKey='avenqir.module.'+nav.dataset.picker;
function select(id,updateHash=false){const found=buttons.some(b=>b.dataset.target===id);if(!found)return;
 buttons.forEach(b=>{const active=b.dataset.target===id;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;const panel=document.getElementById(b.dataset.target);if(panel)panel.hidden=!active});
 try{sessionStorage.setItem(activeKey,id)}catch{}
 if(updateHash){const u=new URL(location.href);u.hash=id;history.replaceState(null,'',u.pathname+u.search+u.hash)}
}
buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(b.dataset.target,true));b.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();select(buttons[next].dataset.target,true)}})});
let start=decodeURIComponent(location.hash.slice(1));if(!buttons.some(b=>b.dataset.target===start)){try{start=sessionStorage.getItem(activeKey)}catch{}}
select(buttons.some(b=>b.dataset.target===start)?start:buttons[0].dataset.target);
window.addEventListener('hashchange',()=>{const h=decodeURIComponent(location.hash.slice(1));if(buttons.some(b=>b.dataset.target===h))select(h)});
// Other pre-existing page scripts may need to open an editor or panel before focusing it.
window.avenqirOpenModule=select;
})();