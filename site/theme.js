"use strict";
/* Local-first appearance settings; no analytics, no network requests. */
(() => {
  const KEY='avenqir_ui_theme_v1';
  const choices=['system','dark','light','eye'];
  const labels={system:'跟随系统',dark:'暗色',light:'浅色',eye:'护眼'};
  const valid=x=>choices.includes(x)?x:'system';
  const resolve=(choice,systemLight)=>choice==='system'?(systemLight?'light':'dark'):valid(choice);
  if(typeof module==='object'&&module.exports) module.exports={valid,resolve};
  if(typeof document==='undefined')return;
  let preference='system';
  try{preference=valid(localStorage.getItem(KEY));}catch{}
  const media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: light)'):null;
  const apply=()=>{
    const effective=resolve(preference,!!media?.matches);
    document.documentElement.dataset.aqTheme=effective;
    document.documentElement.style.colorScheme=effective==='dark'?'dark':'light';
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=effective==='dark'?'#070c16':effective==='eye'?'#ede4cf':'#f1f6fb';
    document.querySelectorAll('[data-aq-theme-option]').forEach(b=>{
      const active=b.dataset.aqThemeOption===preference;
      b.setAttribute('aria-pressed',String(active));
      b.classList.toggle('active',active);
    });
    const open=document.getElementById('aqThemeToggle');
    if(open)open.title='外观：'+labels[preference];
  };
  apply();
  if(media){
    if(typeof media.addEventListener==='function')media.addEventListener('change',apply);
    else if(typeof media.addListener==='function')media.addListener(apply);
  }
  function setup(){
    const bar=document.querySelector('.head-inner');
    if(!bar||document.getElementById('aqThemeToggle'))return;
    const toggle=document.createElement('button');
    toggle.id='aqThemeToggle';toggle.type='button';toggle.textContent='◐';
    toggle.className='aq-theme-toggle';toggle.setAttribute('aria-label','切换显示主题');
    toggle.setAttribute('aria-haspopup','true');toggle.setAttribute('aria-expanded','false');
    const list=document.createElement('div');list.id='aqThemeMenu';list.className='aq-theme-menu';list.hidden=true;
    list.setAttribute('role','group');list.setAttribute('aria-label','显示模式');
    const heading=document.createElement('strong');heading.textContent='显示主题';list.append(heading);
    for(const item of choices){
      const button=document.createElement('button');button.type='button';
      button.dataset.aqThemeOption=item;button.textContent=labels[item];
      button.className='aq-theme-option';button.addEventListener('click',()=>{
        preference=item;
        try{localStorage.setItem(KEY,preference);}catch{}
        apply();close();toggle.focus();
      });list.append(button);
    }
    const close=()=>{list.hidden=true;toggle.setAttribute('aria-expanded','false');};
    toggle.addEventListener('click',()=>{
      list.hidden=!list.hidden;toggle.setAttribute('aria-expanded',String(!list.hidden));
      if(!list.hidden)list.querySelector('button[aria-pressed="true"]')?.focus();
    });
    document.addEventListener('click',e=>{
      if(!list.hidden&&!list.contains(e.target)&&e.target!==toggle)close();
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!list.hidden){close();toggle.focus();}});
    const nav=bar.querySelector('.menu-toggle');
    if(nav)bar.insertBefore(toggle,nav);else bar.append(toggle);
    document.body.append(list);
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
