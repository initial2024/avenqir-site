"use strict";
/* UI only; recommender has no fetch, beacon, third-party scripts or backend endpoint. */
(function(root){
 const engine=root.AVENQIR_LOCAL_RECOMMEND;
 const E=()=>{
  const page=String(root.document?.documentElement?.lang||'').trim();
  const setting=String(root.AVENQIR_I18N?.locale||'').trim();
  // Distinguish Simplified and Traditional Chinese. Where no Traditional
  // translation exists, show English fallback instead of Simplified UI.
  return !/^zh(?:-Hans|-CN|$)/i.test(page||setting||'en');
 };
 const T=(zh,en)=>E()?en:zh;
 const category=name=>root.AVENQIR_I18N?.category(name)||name;
 function mount({items,favorites,open,reviewed,allowed=()=>false,priority=()=>0,recent=()=>[]}){
  if(!engine||typeof document==='undefined')return null;
  const $=id=>document.getElementById(id);
  const toggle=$('atlasLocalToggle'),body=$('atlasLocalBody'),categories=$('atlasLocalCategories'),cards=$('atlasLocalCards'),status=$('atlasLocalStatus'),clear=$('atlasLocalClear');
  if(!toggle||!body||!categories||!cards||!status||!clear)return null;
  let storage=null;try{storage=root.localStorage;}catch{}
  const model=engine.create(storage);
  const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
  function render(){
   const state=model.read();toggle.checked=state.enabled;body.hidden=!state.enabled;
   toggle.setAttribute('aria-checked',String(state.enabled));
   if(!state.enabled){
     categories.replaceChildren();cards.replaceChildren();
     status.textContent=T('目前关闭。只有你主动开启后才记录站内目录的分类操作。','Disabled. No category activity is recorded unless you opt in.');
     return;
   }
   status.textContent=T('仅本机 · 使用记录按分类汇总，60 天自动过期 · 关闭即清除','On device only · category counts expire after 60 days · disabling erases them');
   const available=Array.from(new Set(items().map(x=>x.category))).filter(engine.category).sort((a,b)=>a.localeCompare(b,'zh-CN'));
   categories.replaceChildren();
   for(const c of available){
     const selected=state.interests.includes(c);
     const b=el('button','atlas-local-interest'+(selected?' selected':''),(selected?'✓ ':'＋ ')+category(c));
     b.type='button';b.setAttribute('aria-pressed',String(selected));b.title=selected?T('取消这个兴趣','Remove this interest'):T('将此分类加入兴趣','Add this interest');
     b.addEventListener('click',()=>{
       if(!selected&&state.interests.length>=12){status.textContent=T('最多选择 12 个兴趣分类。','You can choose up to 12 interests.');return;}
       if(model.setInterest(c,!selected))render();
       else status.textContent=T('本机存储不可用；无法保存偏好。','Browser storage unavailable; preference not saved.');
     });
     categories.append(b);
   }
   cards.replaceChildren();
   const excluded=[...favorites(),...recent().slice(0,20)];
   const picks=model.recommend(items(),excluded,6,{allowed,priority});
   if(!picks.length){
     const box=el('p','atlas-local-empty',T('还没有足够的本地偏好。请选择感兴趣的分类，或在开启后访问、收藏公开网址。','Not enough local preferences yet. Choose interests or open/save public websites after enabling this feature.'));
     cards.append(box);return;
   }
   for(const {item,reason} of picks){
     const box=el('article','atlas-local-card');
     const top=el('div','atlas-local-card-head');
     const cat=el('span','atlas-local-category',category(item.category));
     const reasonEl=el('small','atlas-local-reason',E()?'Recommended from your chosen or recent categories':reason);
     top.append(cat,reasonEl);
     const a=el('a','atlas-local-link',item.name+' ↗');
     a.href=reviewed(item.url)?item.url:'leave.html?url='+encodeURIComponent(item.url)+'&name='+encodeURIComponent(item.name);
     a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';
     a.addEventListener('click',e=>{
       if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
       e.preventDefault();if(allowed(item))open(item.url,item.name);else render();
     });
     const desc=el('p','atlas-local-description',E()&&/[\u3400-\u9fff]/.test(item.description||'')?'Source description is available in Chinese. Open the site for original details.':item.description);
     const trust=el('small','atlas-local-trust',reviewed(item.url)?T('来源已核对（非安全认证）','Exact source checked (not a security certificate)'):T('第三方来源未核对 · 跳转前确认','Unverified external source · confirm before leaving'));
     box.append(top,a,desc,trust);cards.append(box);
   }
  }
  toggle.addEventListener('change',()=>{
    if(toggle.checked){
      if(!model.setEnabled(true)){
        toggle.checked=false;status.textContent=T('本机存储不可用，已保持关闭，不会记录。','Browser storage unavailable. Recommendations remain disabled.');
      }else render();
    }else{
      // Turning off is a privacy action; erase the model automatically.
      model.setEnabled(false);render();
    }
  });
  clear.addEventListener('click',()=>{
    model.setEnabled(false);render();
    status.textContent=T('已清除本机推荐分类记录并关闭；其他收藏和私人数据不变。','Recommendation history erased and disabled; private bookmarks remain unchanged.');
  });
  root.addEventListener?.('aq:language-change',render);
  render();
  return Object.freeze({render,recordOpen:(c)=>{if(model.record(c,'open'))render();},recordSave:(c)=>{if(model.record(c,'save'))render();}});
 }
 const api=Object.freeze({mount});
 root.AVENQIR_LOCAL_RECOMMEND_UI=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
