"use strict";
/* Regional UI: no fetch, no IP geolocation, no location permission, no server sync. */
(function(root){
 const api=root.AVENQIR_ATLAS_REGION;
 function mount({items,favorites,open,reviewed}){
  if(!api||typeof document==='undefined')return null;
  const $=id=>document.getElementById(id);
  const toggle=$('atlasRegionToggle'),body=$('atlasRegionBody'),select=$('atlasRegionSelect'),status=$('atlasRegionStatus'),cards=$('atlasRegionCards'),clear=$('atlasRegionClear');
  if(!toggle||!body||!select||!status||!cards||!clear)return null;
  let storage;try{storage=root.localStorage;}catch{storage=null;}
  const model=api.create(storage,()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch{return '';}});
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  select.replaceChildren();
  const auto=el('option','','根据浏览器时区建议（不读取 IP）');auto.value='auto';select.append(auto);
  for(const r of api.regions){const option=el('option','',r.label);option.value=r.code;select.append(option);}
  function render(){
   const state=model.read(),selected=model.selection();
   toggle.checked=state.enabled;toggle.setAttribute('aria-checked',String(state.enabled));body.hidden=!state.enabled;
   cards.replaceChildren();
   if(!state.enabled){
     status.textContent='默认关闭 · 无请求、无 IP 定位、无地区使用记录';
     return;
   }
   select.value=state.mode==='manual'?state.code||'auto':'auto';
   if(!selected.code){
     status.textContent='当前时区没有可用的地区建议，请手动选择；没有地区就不显示推荐。';
     cards.append(el('p','atlas-local-empty','不进行任何 IP 查询。选择地区后才会出现适合该地区的公开资源。'));
     return;
   }
   const label=api.regions.find(r=>r.code===selected.code)?.label||selected.code;
   status.textContent=selected.source==='timezone'
    ?'地区建议：'+label+' · 依据浏览器时区，非公网 IP 归属地（可手动修改）'
    :'已手动选择：'+label+' · 仅在此浏览器保存地区代码';
   const picks=model.recommend(items(),favorites(),6);
   if(!picks.length){cards.append(el('p','atlas-local-empty','该地区暂无可用的精选资源。可切换其他地区，或浏览完整目录。'));return;}
   for(const {item,reason} of picks){
    const box=el('article','atlas-local-card'),top=el('div','atlas-local-card-head');
    top.append(el('span','atlas-local-category',item.category),el('small','atlas-local-reason',reason));
    const a=el('a','atlas-local-link',item.name+' ↗');
    a.href=reviewed(item.url)?item.url:'leave.html?url='+encodeURIComponent(item.url)+'&name='+encodeURIComponent(item.name);
    a.referrerPolicy='no-referrer';a.rel='noopener noreferrer';
    a.addEventListener('click',e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();open(item.url,item.name);});
    box.append(top,a,el('p','atlas-local-description',item.description),el('small','atlas-local-trust',reviewed(item.url)?'来源已核对（非安全认证）':'第三方网站 · 跳转前确认'));
    cards.append(box);
   }
  }
  toggle.addEventListener('change',()=>{
    if(!toggle.checked){model.disable();render();return;}
    if(!model.enable()){toggle.checked=false;status.textContent='本机存储不可用，保持关闭。';return;}
    render();
  });
  select.addEventListener('change',()=>{
    if(select.value==='auto')model.useAutomatic();
    else model.choose(select.value);
    render();
  });
  clear.addEventListener('click',()=>{
    model.disable();render();status.textContent='地区推荐记录已清除并关闭；原收藏和个性化兴趣记录不变。';
  });
  render();
  return Object.freeze({render});
 }
 const result=Object.freeze({mount});
 root.AVENQIR_ATLAS_REGION_UI=result;
 if(typeof module==='object'&&module.exports)module.exports=result;
})(typeof window!=='undefined'?window:globalThis);
