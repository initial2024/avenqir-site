"use strict";
/* AVENQIR v8.3.1: explicit HTML theme entry + local-only accessible selector. */
(function(root){
  const KEY='avenqir_ui_theme_v1';
  const choices=['system','dark','light','eye'];
  const labels={system:'跟随系统',dark:'暗色',light:'浅色',eye:'护眼'};
  const valid=x=>choices.includes(x)?x:'system';
  const resolve=(choice,systemLight)=>choice==='system'?(systemLight?'light':'dark'):valid(choice);
  const API=Object.freeze({valid,resolve,KEY});
  if(typeof module==='object'&&module.exports)module.exports=API;
  if(typeof document==='undefined')return;
  if(!document.querySelector('link[data-aq-theme-css],link[href*="theme.css"]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='theme.css?v=15';
    css.dataset.aqThemeCss='1';document.head.append(css);
  }
  let preference='system';
  try{preference=valid(localStorage.getItem(KEY));}catch{}
  const media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: light)'):null;
  function apply(){
    const effective=resolve(preference,!!media?.matches);
    document.documentElement.dataset.aqTheme=effective;
    document.documentElement.style.colorScheme=effective==='dark'?'dark':'light';
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=effective==='dark'?'#070c16':effective==='eye'?'#ede4cf':'#f1f6fb';
    document.querySelectorAll('[data-aq-theme-option]').forEach(el=>{
      const active=el.dataset.aqThemeOption===preference;
      el.setAttribute('aria-pressed',String(active));
      el.classList.toggle('active',active);
    });
    document.querySelectorAll('[data-aq-theme-link]').forEach(el=>{el.title='显示模式：'+labels[preference];});
    const status=document.getElementById('aqThemeStatus');
    if(status)status.textContent='当前选择：'+labels[preference]+'（实际显示：'+labels[effective]+'）';
  }
  function choose(value){
    preference=valid(value);
    try{localStorage.setItem(KEY,preference);}catch{}
    apply();
  }
  apply();
  if(media){
    if(typeof media.addEventListener==='function')media.addEventListener('change',apply);
    else if(typeof media.addListener==='function')media.addListener(apply);
  }
  function setup(){
    // Static anchor: if scripts are blocked, clicking still opens appearance.html.
    const anchor=document.querySelector('[data-aq-theme-link]')||(()=>{
      const bar=document.querySelector('.head-inner,.top-inner');
      if(!bar)return null;
      const a=document.createElement('a');a.href='appearance.html';a.className='aq-theme-link';
      a.dataset.aqThemeLink='1';a.textContent='◐ 模式';
      const nav=bar.querySelector('.menu-toggle');
      if(nav)bar.insertBefore(a,nav);else bar.append(a);
      return a;
    })();
    document.querySelectorAll('[data-aq-theme-option]').forEach(b=>{
      b.addEventListener('click',()=>{
        choose(b.dataset.aqThemeOption);
        const menu=document.getElementById('aqThemeMenu');
        if(menu){menu.hidden=true;anchor?.setAttribute('aria-expanded','false');}
      });
    });
    if(!anchor)return;
    if(document.getElementById('aqThemeMenu'))return;
    const menu=document.createElement('div');
    menu.id='aqThemeMenu';menu.className='aq-theme-menu';menu.hidden=true;
    menu.setAttribute('role','group');menu.setAttribute('aria-label','显示模式');
    const title=document.createElement('strong');title.textContent='显示模式';menu.append(title);
    for(const item of choices){
      const button=document.createElement('button');button.type='button';
      button.className='aq-theme-option';button.dataset.aqThemeOption=item;
      button.textContent=labels[item];
      button.addEventListener('click',()=>{
        choose(item);menu.hidden=true;anchor.setAttribute('aria-expanded','false');anchor.focus();
      });
      menu.append(button);
    }
    const detail=document.createElement('a');detail.href='appearance.html';
    detail.className='aq-theme-detail';detail.textContent='打开完整外观设置';
    menu.append(detail);document.body.append(menu);
    const close=()=>{menu.hidden=true;anchor.setAttribute('aria-expanded','false');};
    anchor.addEventListener('click',event=>{
      if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();menu.hidden=!menu.hidden;
      anchor.setAttribute('aria-expanded',String(!menu.hidden));
      if(!menu.hidden)menu.querySelector('[aria-pressed="true"]')?.focus();
    });
    document.addEventListener('click',e=>{
      if(!menu.hidden&&!menu.contains(e.target)&&!anchor.contains(e.target))close();
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!menu.hidden){close();anchor.focus();}
    });
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})(typeof window!=='undefined'?window:globalThis);
