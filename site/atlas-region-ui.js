"use strict";
/* Regional UI: no fetch, no IP geolocation, no location permission, no server sync. */
(function(root){
 const api=root.AVENQIR_ATLAS_REGION;
 // The document language is the language actually shown to the visitor. Use it as
 // the authoritative presentation signal when a long-lived PWA has stale modules.
 const locale=()=>{
  const page=String(root.document?.documentElement?.lang||'').trim();
  const setting=String(root.AVENQIR_I18N?.locale||'').trim();
  if(page&&!/^zh(?:-|$)/i.test(page))return page;
  return setting||page||'en';
 };
 const E=()=>!/^zh(?:-|$)/i.test(locale());
 const T=(zh,en)=>E()?en:zh;
 const category=name=>root.AVENQIR_I18N?.category(name)||name;
 const regionName=r=>{if(!E())return r.label;try{return new Intl.DisplayNames([locale()],{type:'region'}).of(r.code)||r.code;}catch{return r.code;}};
 // Explicit English summaries are written against the curated record, not generated
 // by contacting an outside translator. Unknown records use their existing category
 // as a conservative label; source metadata can always be expanded verbatim.
 const EN_DESCRIPTIONS=Object.freeze({
  every011:'Ride-hailing, transportation and delivery services in Singapore',
  every012:'Online grocery and supermarket shopping in Singapore',
  every013:'Singapore rail transport updates and service notices',
  every014:'Singapore postal services and parcel tracking',
  every015:'Municipal feedback and community services in Singapore',
  rg88017:'Singapore government information and public services',
  rg88018:'Official social and economic statistics for Singapore',
  rg88019:'Public open-data portal for Singapore',
  rg88020:'Official Singapore weather forecasts',
  rg88021:'Singapore public transport information',
  rg88022:'Singapore library and digital reading resources',
  rg88023:'Official education information from Singapore’s Ministry of Education',
  rg88024:'Singapore parks and ecological resources'
 });
 function englishDescription(item,regionLabel){
   const original=String(item?.description||'').trim();
   if(original&&!/[\u3400-\u9fff]/.test(original))return original;
   if(Object.hasOwn(EN_DESCRIPTIONS,item?.id))return EN_DESCRIPTIONS[item.id];
   const topic=category(item?.category||'');
   const cleanTopic=String(topic||'').replace(/[\u3400-\u9fff]/g,'').trim();
   const cleanRegion=String(regionLabel||'').replace(/[\u3400-\u9fff]/g,'').trim();
   return (cleanTopic||'Public website')+' resources for '+(cleanRegion||'the selected region')+'.';
 }
 function mount({items,favorites,open,reviewed}){
  if(!api||typeof document==='undefined')return null;
  const $=id=>document.getElementById(id);
  const toggle=$('atlasRegionToggle'),body=$('atlasRegionBody'),select=$('atlasRegionSelect'),status=$('atlasRegionStatus'),cards=$('atlasRegionCards'),clear=$('atlasRegionClear');
  if(!toggle||!body||!select||!status||!cards||!clear)return null;
  let storage;try{storage=root.localStorage;}catch{storage=null;}
  const model=api.create(storage,()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch{return '';}});
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  function buildOptions(){
   const previous=select.value;select.replaceChildren();
   const auto=el('option','',T('根据浏览器时区建议（不读取 IP）','Timezone hint (no IP lookup)'));auto.value='auto';select.append(auto);
   const names={'东亚':'East Asia','东南亚':'Southeast Asia','南亚':'South Asia','中东':'Middle East','欧洲':'Europe','美洲':'Americas','大洋洲':'Oceania','非洲':'Africa'};
   const areaGroups=new Map();
   for(const r of api.regions){
     const label=E()?(names[r.area]||'Other regions'):(r.area||'其他地区');
     let group=areaGroups.get(label);
     if(!group){group=el('optgroup');group.label=label;areaGroups.set(label,group);select.append(group);}
     const option=el('option','',regionName(r));option.value=r.code;group.append(option);
   }
   if(previous)select.value=previous;
  }
  buildOptions();
  function render(){
   buildOptions();
   const state=model.read(),selected=model.selection();
   toggle.checked=state.enabled;toggle.setAttribute('aria-checked',String(state.enabled));body.hidden=!state.enabled;
   cards.replaceChildren();
   if(!state.enabled){
     status.textContent=T('默认关闭 · 无请求、无 IP 定位、无地区使用记录','Disabled · no requests, IP lookup or region activity logging');
     return;
   }
   select.value=state.mode==='manual'?state.code||'auto':'auto';
   if(!selected.code){
     status.textContent=T('当前时区没有可用的地区建议，请手动选择；没有地区就不显示推荐。','No region hint for this timezone. Choose a region manually to see suggestions.');
     cards.append(el('p','atlas-local-empty',T('不进行任何 IP 查询。选择地区后才会出现适合该地区的公开资源。','No IP queries are made. Choose a region to view curated public resources.')));
     return;
   }
   const selectedRegion=api.regions.find(r=>r.code===selected.code);
   const label=selectedRegion?regionName(selectedRegion):selected.code;
   status.textContent=selected.source==='timezone'
    ?T('地区建议：'+label+' · 依据浏览器时区，非公网 IP 归属地（可手动修改）','Suggested region: '+label+' · based on browser timezone, NOT IP location')
    :T('已手动选择：'+label+' · 仅在此浏览器保存地区代码','Selected manually: '+label+' · saved only in this browser');
   const picks=model.recommend(items(),favorites(),8);
   if(!picks.length){cards.append(el('p','atlas-local-empty',T('该地区暂无可用的精选资源。可切换其他地区，或浏览完整目录。','No curated resources are available for this region. Browse the full directory.')));return;}
   for(const {item,reason,kind} of picks){
    const box=el('article','atlas-local-card'),top=el('div','atlas-local-card-head');
    top.append(el('span','atlas-local-category',T(kind,kind==='生活常用'?'Everyday services':'Public information')+' · '+category(item.category)),
      el('small','atlas-local-reason',E()?(selected.source==='manual'?'Your manual region selection':'Timezone hint, not IP geolocation'):reason));
    const a=el('a','atlas-local-link',item.name+' ↗');
    a.href=reviewed(item.url)?item.url:'leave.html?url='+encodeURIComponent(item.url)+'&name='+encodeURIComponent(item.name);
    a.referrerPolicy='no-referrer';a.rel='noopener noreferrer';
    a.addEventListener('click',e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();open(item.url,item.name);});
    const desc=el('p','atlas-local-description',E()?englishDescription(item,label):item.description);
    box.append(top,a,desc);
    if(E()&&/[\u3400-\u9fff]/.test(item.description||'')){
      const original=el('details','atlas-original-desc');
      original.append(el('summary','', 'Original source description (Chinese)'),el('p','atlas-local-description',item.description));
      box.append(original);
    }
    box.append(el('small','atlas-local-trust',reviewed(item.url)?T('来源已核对（非安全认证）','Exact source checked (not a safety certificate)'):T('第三方网站 · 跳转前确认','Third-party website · confirm before leaving')));
    cards.append(box);
   }
  }
  toggle.addEventListener('change',()=>{
    if(!toggle.checked){model.disable();render();return;}
    if(!model.enable()){toggle.checked=false;status.textContent=T('本机存储不可用，保持关闭。','Browser storage is unavailable; regional suggestions remain off.');return;}
    render();
  });
  select.addEventListener('change',()=>{
    if(select.value==='auto')model.useAutomatic();
    else model.choose(select.value);
    render();
  });
  clear.addEventListener('click',()=>{
    model.disable();render();status.textContent=T('地区推荐记录已清除并关闭；原收藏和个性化兴趣记录不变。','Region setting cleared; other bookmarks and interests remain unchanged.');
  });
  root.addEventListener?.('aq:language-change',render);
  render();
  return Object.freeze({render});
 }
 const result=Object.freeze({mount,englishDescription});
 root.AVENQIR_ATLAS_REGION_UI=result;
 if(typeof module==='object'&&module.exports)module.exports=result;
})(typeof window!=='undefined'?window:globalThis);
